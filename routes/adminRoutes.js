const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const complaintController = require('../controllers/complaintController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.use(isAuthenticated, isAdmin);

router.get('/dashboard', adminController.getDashboard);

// User Management
router.get('/users', adminController.getUsers);
router.post('/users/:id/status', adminController.postUpdateUserStatus);

// Reports Management
router.get('/reports', adminController.getReports);
router.post('/reports/:id/status', adminController.postUpdateReportStatus);

// Activity Logs
router.get('/logs', adminController.getLogs);

// Existing Modules
router.get('/notes', adminController.getNotes);
router.post('/notes/:id/approve', adminController.approveNote);
router.post('/notes/:id/delete', adminController.deleteNote);

router.get('/donations', adminController.getDonations);
router.post('/donations/:id/delete', adminController.deleteDonation);

router.get('/lost-found/claims', adminController.getLostFoundClaims);
router.post('/lost-found/claims/:claimId/approve', adminController.approveLostFoundClaim);
router.post('/lost-found/claims/:claimId/reject', adminController.rejectLostFoundClaim);
router.post('/lost-found/claims/:claimId/verify-otp', adminController.verifyLostFoundClaimOtp);

router.get('/lost-found', adminController.getLostFound);
router.post('/lost-found/:id/approve', adminController.approveLostFoundItem);
router.post('/lost-found/:id/delete', adminController.deleteLostFoundItem);

router.get('/complaints', complaintController.getAdminComplaints);
router.post('/complaints/status', complaintController.postUpdateStatus);

router.post('/departments', adminController.postAddDepartment);
router.post('/departments/:id/delete', adminController.postDeleteDepartment);

router.post('/subjects', adminController.postAddSubject);
router.post('/subjects/:id/delete', adminController.postDeleteSubject);

module.exports = router;
