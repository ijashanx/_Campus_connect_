const express = require('express');
const router = express.Router();
const lostFoundController = require('../controllers/lostFoundController');
const { isAuthenticated } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', isAuthenticated, lostFoundController.getIndex);
router.get('/new', isAuthenticated, lostFoundController.getNew);
router.post('/check-duplicate-match', isAuthenticated, lostFoundController.checkDuplicateMatch);
router.post('/', isAuthenticated, upload.single('image'), lostFoundController.postNew);
router.get('/:id', isAuthenticated, lostFoundController.getShow);
router.get('/:id/messages', isAuthenticated, lostFoundController.getMessages);
router.post('/:id/resolve', isAuthenticated, lostFoundController.resolveItem);
router.post('/:id/claim', isAuthenticated, lostFoundController.claimItem);
router.post('/:id/return', isAuthenticated, lostFoundController.returnLostItem);
router.post('/:id/status', isAuthenticated, lostFoundController.updateStatus);
router.post('/:id/claim-proof', isAuthenticated, upload.single('proof_image'), lostFoundController.postSubmitClaim);
router.post('/:id/claims/:claimId/action', isAuthenticated, lostFoundController.postActionClaim);
router.post('/:id/verify-otp', isAuthenticated, lostFoundController.postVerifyOtp);

module.exports = router;
