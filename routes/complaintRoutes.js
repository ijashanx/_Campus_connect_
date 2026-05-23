const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { isAuthenticated } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads/'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'));
    }
});
const upload = multer({ storage });

router.get('/', isAuthenticated, complaintController.getUserComplaints);
router.get('/new', isAuthenticated, complaintController.getCreateComplaint);
router.post('/new', isAuthenticated, upload.single('image'), complaintController.postCreateComplaint);

module.exports = router;
