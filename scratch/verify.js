try {
    console.log("Checking database model imports...");
    const LostFound = require('../models/LostFound');
    const LostFoundClaim = require('../models/LostFoundClaim');
    const Donation = require('../models/Donation');
    const Note = require('../models/Note');
    const Complaint = require('../models/Complaint');
    const Bookmark = require('../models/Bookmark');
    const UserActivity = require('../models/UserActivity');
    
    console.log("Checking controllers...");
    const adminController = require('../controllers/adminController');
    const lostFoundController = require('../controllers/lostFoundController');
    const authController = require('../controllers/authController');
    const donationController = require('../controllers/donationController');
    const notesController = require('../controllers/notesController');
    const complaintController = require('../controllers/complaintController');
    const bookmarkController = require('../controllers/bookmarkController');
    
    console.log("Checking routes...");
    const adminRoutes = require('../routes/adminRoutes');
    const lostFoundRoutes = require('../routes/lostFoundRoutes');
    const authRoutes = require('../routes/authRoutes');
    const donationRoutes = require('../routes/donationRoutes');
    const notesRoutes = require('../routes/notesRoutes');
    const complaintRoutes = require('../routes/complaintRoutes');
    
    console.log("✅ All files loaded successfully without syntax/import errors!");
    process.exit(0);
} catch (err) {
    console.error("❌ Verification failed with error:");
    console.error(err);
    process.exit(1);
}
