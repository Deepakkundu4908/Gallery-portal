const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const multer = require('multer');

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

router.get('/dashboard', adminController.getDashboard);
router.get('/upload', adminController.getUpload);
router.post('/upload', upload.single('file'), adminController.postUpload);
router.get('/edit/:id', adminController.getEdit);
router.post('/edit/:id', adminController.postEdit);
router.get('/delete/:id', adminController.postDelete);
router.post('/delete/:id', adminController.postDelete);

module.exports = router;
