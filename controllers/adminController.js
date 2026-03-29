const fs = require('fs');
const path = require('path');
const { MEDICAL_CATEGORIES, normalizeCategory } = require('../config/medicalCategories');

const dataPath = path.join(__dirname, '..', 'data', 'files.json');
const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

const sanitizeBaseName = (value) => {
  return String(value || '')
    .trim()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
};

const readFilesData = (callback) => {
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) {
      return callback(err);
    }

    try {
      const files = JSON.parse(data);
      callback(null, Array.isArray(files) ? files : []);
    } catch (parseErr) {
      callback(parseErr);
    }
  });
};

const writeFilesData = (files, callback) => {
  fs.writeFile(dataPath, JSON.stringify(files, null, 2), callback);
};

const buildUniqueFileName = (uploadDir, baseName, ext, currentName = null) => {
  const safeBase = sanitizeBaseName(baseName) || 'image';
  const normalizedExt = (ext || '.jpg').toLowerCase();
  let candidate = `${safeBase}${normalizedExt}`;

  if (candidate === currentName) {
    return candidate;
  }

  if (fs.existsSync(path.join(uploadDir, candidate))) {
    candidate = `${safeBase}-${Date.now()}${normalizedExt}`;
  }

  return candidate;
};

const resolveStoredFilePath = (fileRecord) => {
  const candidates = [];

  if (fileRecord && fileRecord.path) {
    candidates.push(path.join(__dirname, '..', fileRecord.path));
  }

  if (fileRecord && fileRecord.name) {
    candidates.push(path.join(uploadsDir, fileRecord.name));
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0] || path.join(uploadsDir, 'missing-file');
};

exports.getDashboard = (req, res) => {
  readFilesData((err, files) => {
    if (err) {
      console.log(err);
      res.render('admin/dashboard', { files: [] });
    } else {
      const normalizedFiles = files.map((file) => ({
        ...file,
        category: normalizeCategory(file.category)
      }));
      res.render('admin/dashboard', { files: normalizedFiles });
    }
  });
};

exports.getUpload = (req, res) => {
  res.render('admin/upload', { categories: MEDICAL_CATEGORIES });
};

exports.postUpload = (req, res) => {
  if (!req.file) {
    return res.redirect('/admin/upload');
  }

  const uploadDir = path.dirname(req.file.path);
  const ext = path.extname(req.file.originalname || req.file.filename) || '.jpg';
  const customBaseName = sanitizeBaseName(req.body.imageName);
  const originalBaseName = sanitizeBaseName(path.parse(req.file.originalname || 'image').name);
  const baseName = customBaseName || originalBaseName || 'image';
  const finalFileName = buildUniqueFileName(uploadDir, baseName, ext);

  const finalFilePath = path.join(uploadDir, finalFileName);

  fs.rename(req.file.path, finalFilePath, (renameErr) => {
    if (renameErr) {
      console.log(renameErr);
      return res.redirect('/admin/dashboard');
    }

    const newFile = {
      _id: Date.now().toString(),
      name: finalFileName,
      path: path.join('public', 'uploads', finalFileName),
      category: normalizeCategory(req.body.category),
      uploadDate: new Date()
    };

    readFilesData((err, files) => {
      if (err) {
        console.log(err);
        return res.redirect('/admin/dashboard');
      }

      files.push(newFile);
      writeFilesData(files, (err) => {
        if (err) {
          console.log(err);
        }
        res.redirect('/admin/dashboard');
      });
    });
  });
};

exports.getEdit = (req, res) => {
  readFilesData((err, files) => {
    if (err) {
      console.log(err);
      return res.redirect('/admin/dashboard');
    }

    const file = files.find((f) => f._id === req.params.id);
    if (!file) {
      return res.redirect('/admin/dashboard');
    }

    const initialName = path.parse(file.name).name;
    const selectedCategory = normalizeCategory(file.category);
    return res.render('admin/edit', { file, initialName, categories: MEDICAL_CATEGORIES, selectedCategory });
  });
};

exports.postEdit = (req, res) => {
  const fileId = req.params.id;
  const requestedName = sanitizeBaseName(req.body.imageName);
  const requestedCategory = normalizeCategory(req.body.category);

  readFilesData((err, files) => {
    if (err) {
      console.log(err);
      return res.redirect('/admin/dashboard');
    }

    const fileIndex = files.findIndex((f) => f._id === fileId);
    if (fileIndex === -1) {
      return res.redirect('/admin/dashboard');
    }

    const existing = files[fileIndex];
    const oldPath = resolveStoredFilePath(existing);
    const uploadDir = path.dirname(oldPath);
    const ext = path.extname(existing.name || '.jpg') || '.jpg';
    const fallbackName = sanitizeBaseName(path.parse(existing.name || 'record').name) || 'record';
    const nextBaseName = requestedName || fallbackName;
    const nextName = buildUniqueFileName(uploadDir, nextBaseName, ext, existing.name);
    const categoryChanged = normalizeCategory(existing.category) !== requestedCategory;

    if (nextName === existing.name) {
      if (categoryChanged) {
        files[fileIndex].category = requestedCategory;
        return writeFilesData(files, (writeErr) => {
          if (writeErr) {
            console.log(writeErr);
          }
          return res.redirect('/admin/dashboard');
        });
      }
      return res.redirect('/admin/dashboard');
    }

    const newPath = path.join(uploadDir, nextName);

    fs.rename(oldPath, newPath, (renameErr) => {
      if (renameErr) {
        console.log(renameErr);
        return res.redirect('/admin/dashboard');
      }

      files[fileIndex].name = nextName;
      files[fileIndex].path = path.join('public', 'uploads', nextName);
      files[fileIndex].category = requestedCategory;

      return writeFilesData(files, (writeErr) => {
        if (writeErr) {
          console.log(writeErr);
        }
        return res.redirect('/admin/dashboard');
      });
    });
  });
};

exports.postDelete = (req, res) => {
  const fileId = req.params.id;

  readFilesData((err, files) => {
    if (err) {
      console.log(err);
      return res.redirect('/admin/dashboard');
    }

    const fileIndex = files.findIndex((f) => f._id === fileId);
    if (fileIndex === -1) {
      return res.redirect('/admin/dashboard');
    }

    const target = files[fileIndex];
    const filePath = resolveStoredFilePath(target);
    const updatedFiles = files.filter((f) => f._id !== fileId);

    const persistDataAndRedirect = () => {
      writeFilesData(updatedFiles, (writeErr) => {
        if (writeErr) {
          console.log(writeErr);
        }
        return res.redirect('/admin/dashboard');
      });
    };

    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr && unlinkErr.code !== 'ENOENT') {
        console.log(unlinkErr);
      }
      persistDataAndRedirect();
    });
  });
};
