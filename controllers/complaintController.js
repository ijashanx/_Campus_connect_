const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');

exports.getUserComplaints = async (req, res) => {
    try {
        const filters = {
            keyword: req.query.keyword,
            category: req.query.category,
            priority: req.query.priority,
            status: req.query.status,
            sort: req.query.sort
        };
        const complaints = await Complaint.findByUser(req.user.id, filters);
        
        let savedComplaintIds = [];
        if (req.user) {
            const Bookmark = require('../models/Bookmark');
            const bookmarks = await Bookmark.findByUser(req.user.id, 'Complaint');
            savedComplaintIds = bookmarks.map(b => b.item_id);
        }
        
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.render('partials/_complaintGrid', { complaints, isAdmin: false, savedComplaintIds });
        }
        res.render('complaints/index', { complaints, filters, savedComplaintIds });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.getCreateComplaint = (req, res) => {
    if (req.user && req.user.role === 'admin') {
        return res.status(403).send('Admins cannot file complaints.');
    }
    res.render('complaints/create', { error: null });
};

exports.postCreateComplaint = async (req, res) => {
    try {
        if (req.user && req.user.role === 'admin') {
            return res.status(403).send('Admins cannot file complaints.');
        }

        const { title, description, category, priority, location } = req.body;
        if (!title || title.trim() === '' ||
            !description || description.trim() === '' ||
            !category || category.trim() === '' ||
            !priority || priority.trim() === '' ||
            !location || location.trim() === '') {
            return res.render('complaints/create', { error: 'All fields are required except photo.' });
        }

        let image_url = null;
        if (req.file) {
            image_url = '/uploads/' + req.file.filename;
        }

        await Complaint.create(req.user.id, title, description, category, priority, location, image_url);

        // Log activity
        const UserActivity = require('../models/UserActivity');
        await UserActivity.create(req.user.id, 'SUBMIT_COMPLAINT', `Submitted complaint: "${title}"`);

        // Send email
        const User = require('../models/User');
        const dbUser = await User.findById(req.user.id);
        const userEmail = dbUser ? dbUser.email : req.user.email;

        if (userEmail) {
            const { sendEmail } = require('../config/mailer');
            sendEmail({
                to: userEmail,
                subject: `[CampusConnect] Complaint Submitted: "${title}"`,
                text: `Hello ${req.user.full_name || req.user.username},\n\nYour complaint "${title}" has been submitted successfully.\n\nPriority: ${priority}\nCategory: ${category}\n\nOur administration team will review it shortly.\n\nBest regards,\nCampusConnect Team`,
                html: `<h3>Hello ${req.user.full_name || req.user.username},</h3>
                       <p>Your complaint <strong>"${title}"</strong> has been submitted successfully.</p>
                       <p><strong>Priority:</strong> ${priority}<br><strong>Category:</strong> ${category}</p>
                       <p>Our administration team will review it shortly.</p>
                       <p>Best regards,<br>CampusConnect Team</p>`
            });
        }

        res.redirect('/complaints');
    } catch (error) {
        console.error(error);
        res.render('complaints/create', { error: 'An error occurred while submitting the complaint.' });
    }
};

exports.getAdminComplaints = async (req, res) => {
    try {
        const filters = {
            keyword: req.query.keyword,
            category: req.query.category,
            priority: req.query.priority,
            status: req.query.status,
            sort: req.query.sort
        };
        const complaints = await Complaint.findAll(filters);
        const stats = await Complaint.getStats();

        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.render('partials/_complaintGrid', { complaints, isAdmin: true });
        }
        res.render('admin/complaints', { complaints, stats, filters });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.postUpdateStatus = async (req, res) => {
    try {
        const { id, status, admin_remarks } = req.body;
        await Complaint.updateStatus(id, status, admin_remarks);

        const complaint = await Complaint.findById(id);
        if (complaint) {
            await Notification.create(complaint.user_id, `Your complaint "${complaint.title}" is now ${status}.`, `/complaints`);
            const io = req.app.get('socketio');
            io.to(`user-${complaint.user_id}`).emit('notification', { message: `Your complaint "${complaint.title}" is now ${status}.` });

            // Log activity for the creator
            const UserActivity = require('../models/UserActivity');
            await UserActivity.create(complaint.user_id, 'RESOLVE_COMPLAINT', `Your complaint "${complaint.title}" was updated to status: "${status}"`);

            // Send email to creator
            const User = require('../models/User');
            const creator = await User.findById(complaint.user_id);
            if (creator) {
                const { sendEmail } = require('../config/mailer');
                sendEmail({
                    to: creator.email,
                    subject: `[CampusConnect] Complaint Status Updated: "${complaint.title}"`,
                    text: `Hello ${creator.full_name || creator.username},\n\nThe status of your complaint "${complaint.title}" has been updated to "${status}".\n\nAdmin Remarks: ${admin_remarks || 'None'}\n\nBest regards,\nCampusConnect Team`,
                    html: `<h3>Hello ${creator.full_name || creator.username},</h3>
                           <p>The status of your complaint <strong>"${complaint.title}"</strong> has been updated to <strong>"${status}"</strong>.</p>
                           <p><strong>Admin Remarks:</strong> ${admin_remarks || 'None'}</p>
                           <p>Best regards,<br>CampusConnect Team</p>`
                });
            }
        }

        res.redirect('/admin/complaints');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};
