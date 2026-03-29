const fs = require('fs');
const path = require('path');
const { MEDICAL_CATEGORIES, normalizeCategory } = require('../config/medicalCategories');

const dataPath = path.join(__dirname, '..', 'data', 'files.json');
const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']);

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

const decorateFile = (file) => {
  const parsedDate = file.uploadDate ? new Date(file.uploadDate) : null;
  const hasValidDate = parsedDate && !Number.isNaN(parsedDate.getTime());
  const extension = path.extname(file.name || '').replace('.', '').toLowerCase();
  const isImage = imageExtensions.has(extension);

  return {
    ...file,
    category: normalizeCategory(file.category),
    extension: extension || 'file',
    isImage,
    uploadedDateLabel: hasValidDate ? parsedDate.toDateString() : 'Unknown date',
    publicUrl: `/uploads/${encodeURIComponent(file.name || '')}`
  };
};

exports.getIndex = (req, res) => {
  readFilesData((err, files) => {
    const rawSearch = String(req.query.q || '').trim();
    const searchQuery = rawSearch.slice(0, 80);
    const normalizedSearch = searchQuery.toLowerCase();

    if (err) {
      console.log(err);
      res.render('gallery/index', {
        files: [],
        categories: ['All', ...MEDICAL_CATEGORIES],
        selectedCategory: 'All',
        currentSearch: searchQuery
      });
    } else {
      const selectedCategory = req.query.category && MEDICAL_CATEGORIES.includes(req.query.category)
        ? req.query.category
        : 'All';

      const decorated = files.map(decorateFile).sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
      const categoryFiltered = selectedCategory === 'All'
        ? decorated
        : decorated.filter((file) => file.category === selectedCategory);
      const filteredFiles = normalizedSearch
        ? categoryFiltered.filter((file) => {
            const fileName = String(file.name || '').toLowerCase();
            const fileCategory = String(file.category || '').toLowerCase();
            return fileName.includes(normalizedSearch) || fileCategory.includes(normalizedSearch);
          })
        : categoryFiltered;

      res.render('gallery/index', {
        files: filteredFiles,
        categories: ['All', ...MEDICAL_CATEGORIES],
        selectedCategory,
        currentSearch: searchQuery
      });
    }
  });
};

exports.getFileDetails = (req, res) => {
  readFilesData((err, files) => {
    if (err) {
      console.log(err);
      return res.redirect('/');
    }
    const file = files.find((f) => f._id === req.params.id);
    if (file) {
      res.render('gallery/fileDetails', { file: decorateFile(file) });
    } else {
      res.redirect('/');
    }
  });
};
