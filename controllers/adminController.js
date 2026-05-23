const LostFound = require('../models/LostFound');
const Donation = require('../models/Donation');
const Complaint = require('../models/Complaint');

const User = require('../models/User');
const Note = require('../models/Note');
const Report = require('../models/Report');
const LostFoundClaim = require('../models/LostFoundClaim');
const { sendEmail } = require('../config/mailer');
const Notification = require('../models/Notification');


exports.getDashboard = async (req, res) => {
    try {
        const items = await LostFound.findAll({}); 
        const donations = await Donation.findAll({});
        const complaints = await Complaint.findAll();
        const users = await User.findAll({});
        const notes = await Note.findAll({});
        const reports = await Report.findAll({ status: 'Pending' });
        
        const stats = {
            totalUsers: users.length,
            totalNotes: notes.length,
            totalOpenItems: items.filter(i => i.status === 'Open').length,
            totalOpenLostItems: items.filter(i => i.status === 'Open' && i.type === 'lost').length,
            totalOpenFoundItems: items.filter(i => i.status === 'Open' && i.type === 'found').length,
            claimedItems: items.filter(i => i.status === 'Claimed').length,
            activeDonations: donations.filter(d => d.status === 'Available').length,
            pendingRequests: donations.filter(d => d.status === 'Requested').length,
            pendingComplaints: complaints.filter(c => c.status === 'Pending').length,
            resolvedComplaints: complaints.filter(c => c.status === 'Resolved').length,
            pendingReports: reports.length
        };
        
        res.render('admin/dashboard', { items: items.slice(0, 10), stats, activeMenu: 'dashboard' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.deleteLostFoundItem = async (req, res) => {
    try {
        await LostFound.deleteById(req.params.id);
        const ActivityLog = require('../models/ActivityLog');
        await ActivityLog.create(req.user.id, 'DELETE_ITEM', `Deleted Lost & Found Item #${req.params.id}`);
        res.redirect('/admin/lost-found');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.getUsers = async (req, res) => {
    try {
        const filters = {
            keyword: req.query.keyword,
            role: req.query.role,
            status: req.query.status
        };
        const users = await User.findAll(filters);
        res.render('admin/users', { users, filters, activeMenu: 'users' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.postUpdateUserStatus = async (req, res) => {
    try {
        await User.updateStatus(req.params.id, req.body.status);
        const ActivityLog = require('../models/ActivityLog');
        await ActivityLog.create(req.user.id, 'UPDATE_USER_STATUS', `Updated user #${req.params.id} status to ${req.body.status}`);
        res.redirect('/admin/users');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.getReports = async (req, res) => {
    try {
        const filters = { status: req.query.status || 'Pending' };
        const reports = await Report.findAll(filters);
        
        for (let r of reports) {
            r.item_details = null;
            try {
                if (r.item_type === 'LostFound') {
                    const item = await LostFound.findById(r.item_id);
                    if (item) {
                        r.item_details = { title: item.title, url: `/lost-found/${item.id}` };
                    }
                } else if (r.item_type === 'Donation') {
                    const item = await Donation.findById(r.item_id);
                    if (item) {
                        r.item_details = { title: item.title, url: `/admin/donations?keyword=${encodeURIComponent(item.title)}` };
                    }
                } else if (r.item_type === 'Note') {
                    const item = await Note.findById(r.item_id);
                    if (item) {
                        r.item_details = { title: item.title, url: `/admin/notes?keyword=${encodeURIComponent(item.title)}`, file_url: item.file_url };
                    }
                } else if (r.item_type === 'User') {
                    const item = await User.findById(r.item_id);
                    if (item) {
                        r.item_details = { title: item.username, url: `/admin/users?keyword=${encodeURIComponent(item.username)}` };
                    }
                }
            } catch (err) {
                console.error(`Error loading details for report ID ${r.id}:`, err);
            }
        }
        res.render('admin/reports', { reports, filters, activeMenu: 'reports' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.postUpdateReportStatus = async (req, res) => {
    try {
        await Report.updateStatus(req.params.id, req.body.status, req.body.admin_remarks);
        const ActivityLog = require('../models/ActivityLog');
        await ActivityLog.create(req.user.id, 'RESOLVE_REPORT', `Marked report #${req.params.id} as ${req.body.status}`);
        res.redirect('/admin/reports');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.getLogs = async (req, res) => {
    try {
        const ActivityLog = require('../models/ActivityLog');
        const logs = await ActivityLog.getRecent(100);
        res.render('admin/logs', { logs, activeMenu: 'logs' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.getNotes = async (req, res) => {
    try {
        const filters = { keyword: req.query.keyword, sort: req.query.sort, is_approved: 'all' };
        const notes = await Note.findAll(filters);
        
        const Department = require('../models/Department');
        const departments = await Department.findAll();
        
        const Subject = require('../models/Subject');
        const subjects = await Subject.findAllWithDept();

        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.render('partials/_noteGrid', { notes, isAdmin: true });
        }
        res.render('admin/notes', { notes, departments, subjects, filters, activeMenu: 'notes' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.deleteNote = async (req, res) => {
    try {
        const db = require('../config/database');
        await db.execute('DELETE FROM notes WHERE id = ?', [req.params.id]);
        const ActivityLog = require('../models/ActivityLog');
        await ActivityLog.create(req.user.id, 'DELETE_NOTE', `Deleted Note #${req.params.id}`);
        res.redirect('/admin/notes');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.approveNote = async (req, res) => {
    try {
        const Note = require('../models/Note');
        await Note.approve(req.params.id);

        // Log admin activity
        const ActivityLog = require('../models/ActivityLog');
        await ActivityLog.create(req.user.id, 'APPROVE_NOTE', `Approved Study Note #${req.params.id}`);

        // Notify uploader
        const note = await Note.findById(req.params.id);
        if (note) {
            const Notification = require('../models/Notification');
            const notifyMsg = `Your uploaded study notes "${note.title}" have been approved by the admin and are now live.`;
            await Notification.create(note.user_id, notifyMsg, `/notes`);

            const io = req.app.get('socketio');
            io.to(`user-${note.user_id}`).emit('notification', { message: notifyMsg });

            // Log activity for the uploader
            const UserActivity = require('../models/UserActivity');
            await UserActivity.create(note.user_id, 'NOTE_APPROVED', `Your uploaded study notes "${note.title}" were approved by Admin.`);

            // Email to uploader
            const { sendEmail } = require('../config/mailer');
            const User = require('../models/User');
            const uploaderUser = await User.findById(note.user_id);
            if (uploaderUser) {
                sendEmail({
                    to: uploaderUser.email,
                    subject: `[CampusConnect] Study Notes Approved: "${note.title}"`,
                    text: `Hello ${uploaderUser.full_name || uploaderUser.username},\n\nYour uploaded study notes "${note.title}" have been approved by the admin and are now live on the platform!\n\nBest regards,\nCampusConnect Team`,
                    html: `<h3>Hello ${uploaderUser.full_name || uploaderUser.username},</h3>
                           <p>Your uploaded study notes <strong>"${note.title}"</strong> have been approved by the admin and are now live on the platform!</p>
                           <p>Best regards,<br>CampusConnect Team</p>`
                }).catch(err => console.error("Error sending admin note approval email:", err));
            }
        }

        res.redirect('/admin/notes');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.getDonations = async (req, res) => {
    try {
        const filters = { keyword: req.query.keyword, sort: req.query.sort, status: req.query.status };
        const donations = await Donation.findAll(filters);
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.render('partials/_donationGrid', { donations, isAdmin: true });
        }
        res.render('admin/donations', { donations, filters, activeMenu: 'donations' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.deleteDonation = async (req, res) => {
    try {
        const db = require('../config/database');
        await db.execute('DELETE FROM donations WHERE id = ?', [req.params.id]);
        const ActivityLog = require('../models/ActivityLog');
        await ActivityLog.create(req.user.id, 'DELETE_DONATION', `Deleted Donation #${req.params.id}`);
        res.redirect('/admin/donations');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.getLostFound = async (req, res) => {
    try {
        const filters = { 
            keyword: req.query.keyword, 
            sort: req.query.sort, 
            status: req.query.status,
            is_approved: 'all'
        };
        const items = await LostFound.findAll(filters);
        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.render('partials/_lostFoundGrid', { items, isAdmin: true });
        }
        res.render('admin/lost-found', { items, filters, activeMenu: 'lost-found' });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.approveLostFoundItem = async (req, res) => {
    try {
        await LostFound.approve(req.params.id);
        
        // Notify the creator of approval
        const item = await LostFound.findById(req.params.id);
        if (item) {
            const Notification = require('../models/Notification');
            const notifyMsg = `Your Lost & Found item "${item.title}" has been approved by the admin and is now live.`;
            await Notification.create(item.user_id, notifyMsg, `/lost-found/${item.id}`);
            const io = req.app.get('socketio');
            io.to(`user-${item.user_id}`).emit('notification', { message: notifyMsg });

            // Log activity for the owner
            const UserActivity = require('../models/UserActivity');
            await UserActivity.create(item.user_id, 'ITEM_APPROVED', `Your reported ${item.type} item "${item.title}" was approved by Admin.`);

            // Send email to owner
            const { sendEmail } = require('../config/mailer');
            const User = require('../models/User');
            const ownerUser = await User.findById(item.user_id);
            if (ownerUser) {
                sendEmail({
                    to: ownerUser.email,
                    subject: `[CampusConnect] Lost & Found Item Approved: "${item.title}"`,
                    text: `Hello ${ownerUser.full_name || ownerUser.username},\n\nYour reported item "${item.title}" has been approved by the admin and is now live on the public feed!\n\nBest regards,\nCampusConnect Team`,
                    html: `<h3>Hello ${ownerUser.full_name || ownerUser.username},</h3>
                           <p>Your reported item <strong>"${item.title}"</strong> has been approved by the admin and is now live on the public feed!</p>
                           <p>Best regards,<br>CampusConnect Team</p>`
                }).catch(err => console.error("Error sending admin item approval email:", err));
            }
        }

        const ActivityLog = require('../models/ActivityLog');
        await ActivityLog.create(req.user.id, 'APPROVE_ITEM', `Approved Lost & Found Item #${req.params.id}`);
        res.redirect('/admin/lost-found');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.getLostFoundClaims = async (req, res) => {
    try {
        const claims = await LostFoundClaim.findAllClaimsForAdmin();
        res.render('admin/lost-found-claims', { claims, activeMenu: 'lost-found-claims', error: null, success: null });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.approveLostFoundClaim = async (req, res) => {
    try {
        const claim = await LostFoundClaim.findById(req.params.claimId);
        if (!claim) return res.status(404).send('Claim Not Found');

        const item = await LostFound.findById(claim.item_id);
        if (!item) return res.status(404).send('Item Not Found');

        // Approve this claim
        await LostFoundClaim.updateStatus(claim.id, 'Approved');
        // Reject all other pending claims for this item
        await LostFoundClaim.rejectOtherClaims(item.id, claim.id);
        // Update item status to 'Claimed' (waiting for OTP verification / physical handover)
        await LostFound.updateStatus(item.id, 'Claimed');

        // Fetch user profiles for email delivery
        const claimerUser = await User.findById(claim.claimer_id);
        const posterUser = await User.findById(item.user_id);

        // Send OTP (item's verification_pin) to Claimant's Email
        sendEmail({
            to: claimerUser.email,
            subject: `[CampusConnect] Claim Approved: Handover Verification OTP for "${item.title}"`,
            text: `Hello ${claimerUser.full_name || claimerUser.username},\n\nYour claim for the item "${item.title}" has been approved by the Admin.\n\nTo complete the handover and physically retrieve your item, please visit the Campus Security / Lost & Found desk. Show this OTP to the Admin to verify your claim:\n\nVERIFICATION OTP: ${item.verification_pin}\n\nFinder's Contact Info: ${item.contact_info}\n\nThank you,\nCampusConnect Team`,
            html: `<h3>Hello ${claimerUser.full_name || claimerUser.username},</h3>
                   <p>Your claim for the item <strong>"${item.title}"</strong> has been approved by the Admin.</p>
                   <p>To complete the handover and physically retrieve your item, please visit the <strong>Campus Security / Lost & Found desk</strong>.</p>
                   <p>Show this OTP to the Admin to verify your claim:</p>
                   <div style="font-size: 1.8rem; font-weight: 800; letter-spacing: 2px; padding: 1rem; background: #f5f5f5; display: inline-block; border-radius: 4px; color: #000; font-family: monospace; border: 1px solid #ddd;">
                       ${item.verification_pin}
                   </div>
                   <br><br>
                   <p><strong>Finder's Contact Info:</strong> ${item.contact_info}</p>
                   <br>
                   <p>Thank you,<br>CampusConnect Team</p>`
        }).catch(err => console.error("Error sending admin claim approval email:", err));

        // Notify poster and claimant via notifications
        const notifyClaimerMsg = `Your claim request for "${item.title}" has been APPROVED by the Admin. An OTP has been sent to your email. Show it to Campus Security to collect your item.`;
        const notifyPosterMsg = `The claim request for your item "${item.title}" has been APPROVED by the Admin. Handover coordinates are being processed.`;
        
        await Notification.create(claim.claimer_id, notifyClaimerMsg, `/lost-found/${item.id}`);
        await Notification.create(item.user_id, notifyPosterMsg, `/lost-found/${item.id}`);

        const io = req.app.get('socketio');
        io.to(`user-${claim.claimer_id}`).emit('notification', { message: notifyClaimerMsg });
        io.to(`user-${item.user_id}`).emit('notification', { message: notifyPosterMsg });

        const ActivityLog = require('../models/ActivityLog');
        await ActivityLog.create(req.user.id, 'APPROVE_CLAIM', `Approved Claim #${claim.id} for Item #${item.id} by Admin`);

        res.redirect('/admin/lost-found/claims');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.rejectLostFoundClaim = async (req, res) => {
    try {
        const claim = await LostFoundClaim.findById(req.params.claimId);
        if (!claim) return res.status(404).send('Claim Not Found');

        const item = await LostFound.findById(claim.item_id);
        if (!item) return res.status(404).send('Item Not Found');

        // Update claim status to 'Rejected'
        await LostFoundClaim.updateStatus(claim.id, 'Rejected');

        // Notify claimant
        const notifyClaimerMsg = `Your claim request for "${item.title}" was rejected by the Admin.`;
        await Notification.create(claim.claimer_id, notifyClaimerMsg, `/lost-found/${item.id}`);

        const io = req.app.get('socketio');
        io.to(`user-${claim.claimer_id}`).emit('notification', { message: notifyClaimerMsg });

        const ActivityLog = require('../models/ActivityLog');
        await ActivityLog.create(req.user.id, 'REJECT_CLAIM', `Rejected Claim #${claim.id} for Item #${item.id} by Admin`);

        res.redirect('/admin/lost-found/claims');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.verifyLostFoundClaimOtp = async (req, res) => {
    try {
        const claim = await LostFoundClaim.findById(req.params.claimId);
        if (!claim) return res.status(404).send('Claim Not Found');

        const item = await LostFound.findById(claim.item_id);
        if (!item) return res.status(404).send('Item Not Found');

        const { otp } = req.body;

        if (otp !== item.verification_pin) {
            // Re-render claims list with error
            const claims = await LostFoundClaim.findAllClaimsForAdmin();
            return res.render('admin/lost-found-claims', { 
                claims, 
                activeMenu: 'lost-found-claims', 
                error: `Incorrect OTP entered for claim ID ${claim.id}. Handover verification failed.`, 
                success: null 
            });
        }

        // Mark item as Resolved (Handover completed)
        await LostFound.updateStatus(item.id, 'Resolved');

        // Notify both parties
        const successMsg = `Handover verified by Admin! Item "${item.title}" has been successfully handed over to ${claim.full_name || claim.claimer_username}.`;
        
        await Notification.create(item.user_id, successMsg, `/lost-found/${item.id}`);
        await Notification.create(claim.claimer_id, successMsg, `/lost-found/${item.id}`);
        
        const io = req.app.get('socketio');
        io.to(`user-${item.user_id}`).emit('notification', { message: successMsg });
        io.to(`user-${claim.claimer_id}`).emit('notification', { message: successMsg });
        io.emit('item_resolved', { id: item.id, title: item.title });

        const ActivityLog = require('../models/ActivityLog');
        await ActivityLog.create(req.user.id, 'VERIFY_OTP_RESOLVE', `Verified OTP & resolved Item #${item.id} (Handed over to User #${claim.claimer_id})`);

        const claims = await LostFoundClaim.findAllClaimsForAdmin();
        res.render('admin/lost-found-claims', { 
            claims, 
            activeMenu: 'lost-found-claims', 
            error: null, 
            success: `Successfully verified OTP and closed Listing #${item.id}!` 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.postAddDepartment = async (req, res) => {
    try {
        const { name, years } = req.body;
        const Department = require('../models/Department');
        await Department.create(name, parseInt(years, 10) || 3);

        const ActivityLog = require('../models/ActivityLog');
        await ActivityLog.create(req.user.id, 'ADD_DEPARTMENT', `Added department ${name} (${years} years)`);
        
        res.redirect('/admin/notes#depts-tab');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.postDeleteDepartment = async (req, res) => {
    try {
        const Department = require('../models/Department');
        const dept = await Department.findById(req.params.id);
        if (dept) {
            await Department.delete(req.params.id);
            const ActivityLog = require('../models/ActivityLog');
            await ActivityLog.create(req.user.id, 'DELETE_DEPARTMENT', `Deleted department ${dept.name}`);
        }
        res.redirect('/admin/notes#depts-tab');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.postAddSubject = async (req, res) => {
    try {
        const { name, department_id, semester } = req.body;
        const Subject = require('../models/Subject');
        await Subject.create(name, parseInt(department_id, 10), parseInt(semester, 10));

        const Department = require('../models/Department');
        const dept = await Department.findById(department_id);
        const deptName = dept ? dept.name : 'Unknown';

        const ActivityLog = require('../models/ActivityLog');
        await ActivityLog.create(req.user.id, 'ADD_SUBJECT', `Added subject ${name} for ${deptName} Sem ${semester}`);
        
        res.redirect('/admin/notes#subjects-tab');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.postDeleteSubject = async (req, res) => {
    try {
        const Subject = require('../models/Subject');
        const subject = await Subject.findById(req.params.id);
        if (subject) {
            await Subject.delete(req.params.id);
            const ActivityLog = require('../models/ActivityLog');
            await ActivityLog.create(req.user.id, 'DELETE_SUBJECT', `Deleted subject ${subject.name}`);
        }
        res.redirect('/admin/notes#subjects-tab');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};
