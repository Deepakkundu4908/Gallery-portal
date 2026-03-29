const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');

router.get('/', galleryController.getIndex);
router.get('/file/:id', galleryController.getFileDetails);

module.exports = router;
