const LostFound = require('../models/LostFound');
const LostFoundClaim = require('../models/LostFoundClaim');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmail } = require('../config/mailer');

exports.getIndex = async (req, res) => {
    try {
        const filters = {
            keyword: req.query.keyword,
            category: req.query.category,
            type: req.query.type,
            status: req.query.status,
            sort: req.query.sort,
            location: req.query.location,
            date: req.query.date,
            user_id: req.query.my_posts === 'true' ? req.user.id : null,
            is_approved: req.query.my_posts === 'true' ? 'all' : 1
        };
        const items = await LostFound.findAll(filters);

        let savedLostFoundIds = [];
        if (req.user) {
            const Bookmark = require('../models/Bookmark');
            const bookmarks = await Bookmark.findByUser(req.user.id, 'LostFound');
            savedLostFoundIds = bookmarks.map(b => b.item_id);
        }

        if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1)) {
            return res.render('partials/_lostFoundGrid', { items, savedLostFoundIds });
        }
        res.render('lost-found/index', { items, category: req.query.type || 'all', filters, savedLostFoundIds });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};
exports.getNew = (req, res) => {
    res.render('lost-found/new', { error: null, item: {} });
};

exports.postNew = async (req, res) => {
    const { title, description, location, date, contact_info, type, category, hidden_details, color, brand } = req.body;
    
    const renderWithError = (errorMsg) => {
        return res.render('lost-found/new', {
            error: errorMsg,
            item: { title, description, location, date, contact_info, type, category, hidden_details, color, brand }
        });
    };

    try {
        // General validation
        if (!title || title.trim() === '') {
            return renderWithError('Item Name is required.');
        }
        
        // 1. Title validation (Letters and spaces only)
        const titleRegex = /^[a-zA-Z\s]+$/;
        if (!titleRegex.test(title.trim())) {
            return renderWithError('Item Name must contain only letters and spaces (no numbers or special characters allowed).');
        }

        if (!color || color.trim() === '') {
            return renderWithError('Color is required.');
        }

        if (!location || location.trim() === '') {
            return renderWithError('Location is required.');
        }
        if (!date || date.trim() === '') {
            return renderWithError('Date is required.');
        }

        // 2. Date validation (Only today or up to 7 days in the past)
        const inputDate = new Date(date);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        if (inputDate > today) {
            return renderWithError('Lost/Found date cannot be in the future.');
        }
        if (inputDate < sevenDaysAgo) {
            return renderWithError('Lost/Found date cannot be older than 7 days.');
        }

        if (!contact_info || contact_info.trim() === '') {
            return renderWithError('Contact info is required.');
        }

        // 3. Contact Info validation (Exactly 10 digits)
        const contactRegex = /^\d{10}$/;
        if (!contactRegex.test(contact_info.trim())) {
            return renderWithError('Contact info must be exactly a 10-digit phone number (no characters or special signs).');
        }

        // Generate fingerprint
        const fingerprint = LostFound.generateFingerprint(title, category, color, brand, location);

        // 4. Duplicate Check
        const isDuplicate = await LostFound.checkDuplicateFingerprint(fingerprint);
        if (isDuplicate) {
            return renderWithError('A similar item has already been reported in the system.');
        }

        // Backend validation for lost items
        if (type === 'lost') {
            if (!description || description.trim() === '') {
                return renderWithError('Description is required for lost items.');
            }
            if (!hidden_details || hidden_details.trim() === '') {
                return renderWithError('Secret hidden details are required for lost items.');
            }
        }

        // Required item image validation
        const image_url = req.file ? `/uploads/${req.file.filename}` : null;
        if (!image_url) {
            return renderWithError('Item Image is required.');
        }

        // Match check
        let matchScore = null;
        let matchedItemId = null;
        const matches = await LostFound.findMatches(type, title, category, color, brand, location);
        if (matches.length > 0) {
            matchScore = matches[0].score;
            matchedItemId = matches[0].item.id;
        }

        const newId = await LostFound.create(
            req.user.id, 
            title, 
            description, 
            image_url, 
            location, 
            date, 
            contact_info, 
            type, 
            category, 
            hidden_details,
            color,
            brand,
            fingerprint,
            matchScore,
            matchedItemId
        );

        // Send notifications if high-confidence match is found
        if (matchedItemId) {
            const matchedItem = matches[0].item;
            const msgToOwner = `Possible match detected: A similar item "${title}" has been reported (Match Score: ${matchScore}%).`;
            const msgToCreator = `Possible match detected: A similar item "${matchedItem.title}" has been reported (Match Score: ${matchScore}%).`;
            
            await Notification.create(matchedItem.user_id, msgToOwner, `/lost-found/${newId}`);
            await Notification.create(req.user.id, msgToCreator, `/lost-found/${matchedItem.id}`);

            // Emit socket notification
            const io = req.app.get('socketio');
            if (io) {
                io.to(`user-${matchedItem.user_id}`).emit('notification', { message: msgToOwner });
                io.to(`user-${req.user.id}`).emit('notification', { message: msgToCreator });
            }
        }

        // Log user activity
        const UserActivity = require('../models/UserActivity');
        await UserActivity.create(req.user.id, 'POST_LOST_FOUND', `Reported ${type} item: "${title}" at ${location}`);

        // Send email
        const { sendEmail } = require('../config/mailer');
        sendEmail({
            to: req.user.email,
            subject: `[CampusConnect] Item Posted: "${title}" (${type})`,
            text: `Hello ${req.user.full_name || req.user.username},\n\nYou have successfully listed "${title}" as a ${type} item on CampusConnect.\n\nThank you,\nCampusConnect Team`,
            html: `<h3>Hello ${req.user.full_name || req.user.username},</h3>
                   <p>You have successfully listed <strong>"${title}"</strong> as a <strong>${type}</strong> item on CampusConnect.</p>
                   <p>Thank you,<br>CampusConnect Team</p>`
        });

        res.redirect('/lost-found?my_posts=true');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.checkDuplicateMatch = async (req, res) => {
    try {
        const { title, category, color, brand, location, type } = req.body;
        
        if (!title || !category || !color || !location || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Generate fingerprint
        const fingerprint = LostFound.generateFingerprint(title, category, color, brand, location);

        // Check for exact duplicate fingerprint
        const duplicate = await LostFound.checkDuplicateFingerprint(fingerprint);
        if (duplicate) {
            return res.json({ 
                status: 'duplicate', 
                message: 'A similar item has already been reported in the system.' 
            });
        }

        // Check for matches
        const matches = await LostFound.findMatches(type, title, category, color, brand, location);
        if (matches.length > 0) {
            return res.json({
                status: 'match',
                matches: matches.map(m => ({
                    id: m.item.id,
                    title: m.item.title,
                    category: m.item.category,
                    color: m.item.color,
                    brand: m.item.brand,
                    location: m.item.location,
                    date: m.item.date ? new Date(m.item.date).toLocaleDateString() : '',
                    image_url: m.item.image_url,
                    score: m.score
                }))
            });
        }

        return res.json({ status: 'ok' });
    } catch (error) {
        console.error('Error in checkDuplicateMatch:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};

exports.getShow = async (req, res) => {
    try {
        const item = await LostFound.findById(req.params.id);
        if (!item) return res.status(404).send('Not Found');

        let claims = [];
        let myClaim = null;
        if (item.user_id === req.user.id || req.user.role === 'admin') {
            claims = await LostFoundClaim.findByItemId(item.id);
        } else {
            myClaim = await LostFoundClaim.findByClaimerAndItem(req.user.id, item.id);
        }

        let isSaved = false;
        if (req.user) {
            const Bookmark = require('../models/Bookmark');
            const bookmark = await Bookmark.findByUserAndItem(req.user.id, 'LostFound', item.id);
            isSaved = !!bookmark;
        }

        res.render('lost-found/show', { item, claims, myClaim, isSaved });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.getMessages = async (req, res) => {
    try {
        const messages = await Message.getByItemId(req.params.id);
        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Server Error' });
    }
};

exports.resolveItem = async (req, res) => {
    try {
        const item = await LostFound.findById(req.params.id);
        if (!item || item.user_id !== req.user.id) {
            return res.status(403).send('Unauthorized');
        }
        // Lost items must be resolved via PIN verification (return flow), not self-resolved.
        if (item.type === 'lost') {
            return res.status(400).send('Lost items must be resolved by PIN verification.');
        }
        await LostFound.updateStatus(req.params.id, 'Resolved');

        // Notify via sockets
        const io = req.app.get('socketio');
        io.emit('item_resolved', { id: item.id, title: item.title });

        res.redirect('/lost-found/' + item.id);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.claimItem = async (req, res) => {
    try {
        const item = await LostFound.findById(req.params.id);
        if (!item || item.type !== 'found' || item.status !== 'Open') {
            return res.status(400).send('Invalid claim request');
        }

        if (item.user_id === req.user.id) {
            return res.status(403).send('Creators cannot claim their own found items');
        }

        if (req.body.pin !== item.verification_pin) {
            return res.status(400).send('Incorrect Secret PIN! Verification Failed.');
        }

        await LostFound.updateStatus(req.params.id, 'Claimed');

        // Notify the creator
        await Notification.create(item.user_id, `${req.user.username} has successfully claimed your found item "${item.title}" using the PIN.`, `/lost-found/${item.id}`);
        const io = req.app.get('socketio');
        io.to(`user-${item.user_id}`).emit('notification', { message: `${req.user.username} has successfully claimed your found item "${item.title}" using the PIN.` });

        io.emit('item_resolved', { id: item.id, title: item.title });

        res.redirect('/lost-found/' + item.id);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.returnLostItem = async (req, res) => {
    try {
        const item = await LostFound.findById(req.params.id);
        if (!item || item.type !== 'lost' || item.status !== 'Open') {
            return res.status(400).send('Invalid return request');
        }

        if (item.user_id === req.user.id) {
            return res.status(403).send('Creators cannot verify-return their own lost items');
        }

        if (req.body.pin !== item.verification_pin) {
            return res.status(400).send('Incorrect Secret PIN! Verification Failed.');
        }

        // Save returned_by_id and received_by_id
        await LostFound.setReturnedReceived(req.params.id, req.user.id, item.user_id);

        // Notify the creator
        await Notification.create(item.user_id, `${req.user.username} has successfully returned your lost item "${item.title}" using the PIN.`, `/lost-found/${item.id}`);
        const io = req.app.get('socketio');
        io.to(`user-${item.user_id}`).emit('notification', { message: `${req.user.username} has successfully returned your lost item "${item.title}" using the PIN.` });

        // Log activity for finder (who returned it)
        const UserActivity = require('../models/UserActivity');
        await UserActivity.create(req.user.id, 'RETURN_ITEM', `Returned lost item "${item.title}" to owner @${item.username}`);

        // Log activity for owner (who received it)
        await UserActivity.create(item.user_id, 'RECOVER_ITEM', `Recovered lost item "${item.title}", returned by @${req.user.username}`);

        // Send email to owner
        const { sendEmail } = require('../config/mailer');
        const User = require('../models/User');
        const ownerUser = await User.findById(item.user_id);
        if (ownerUser) {
            sendEmail({
                to: ownerUser.email,
                subject: `[CampusConnect] Lost Item Returned: "${item.title}"`,
                text: `Hello ${ownerUser.full_name || ownerUser.username},\n\nYour lost item "${item.title}" has been successfully returned to you by @${req.user.username}!\n\nBest regards,\nCampusConnect Team`,
                html: `<h3>Hello ${ownerUser.full_name || ownerUser.username},</h3>
                       <p>Your lost item <strong>"${item.title}"</strong> has been successfully returned to you by <strong>@${req.user.username}</strong>!</p>
                       <p>Best regards,<br>CampusConnect Team</p>`
            });
        }

        // Send email to finder
        sendEmail({
            to: req.user.email,
            subject: `[CampusConnect] Item Returned Successfully: "${item.title}"`,
            text: `Hello ${req.user.full_name || req.user.username},\n\nYou have successfully returned the lost item "${item.title}" to @${item.username}.\n\nThank you for making our campus helpful!\n\nBest regards,\nCampusConnect Team`,
            html: `<h3>Hello ${req.user.full_name || req.user.username},</h3>
                   <p>You have successfully returned the lost item <strong>"${item.title}"</strong> to <strong>@${item.username}</strong>.</p>
                   <p>Thank you for making our campus helpful!</p>
                   <p>Best regards,<br>CampusConnect Team</p>`
        });

        io.emit('item_resolved', { id: item.id, title: item.title });

        res.redirect('/lost-found/' + item.id);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const item = await LostFound.findById(req.params.id);
        if (!item) return res.status(404).send('Not Found');

        // Allow ONLY admin
        if (req.user.role !== 'admin') {
            return res.status(403).send('Unauthorized');
        }

        const newStatus = req.body.status;
        await LostFound.updateStatus(item.id, newStatus);

        // Notify if admin updated it
        if (req.user.role === 'admin' && item.user_id !== req.user.id) {
            await Notification.create(item.user_id, `Your Lost & Found item "${item.title}" status was updated to ${newStatus} by Admin.`, `/lost-found/${item.id}`);
            const io = req.app.get('socketio');
            io.to(`user-${item.user_id}`).emit('notification', { message: `Your Lost & Found item "${item.title}" status was updated to ${newStatus} by Admin.` });
        }

        if (req.headers.referer) {
            res.redirect(req.headers.referer);
        } else {
            res.redirect(`/lost-found/${item.id}`);
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.postSubmitClaim = async (req, res) => {
    try {
        const item = await LostFound.findById(req.params.id);
        if (!item) return res.status(404).send('Item Not Found');

        if (item.user_id === req.user.id) {
            return res.status(400).send('You cannot claim your own item.');
        }

        const { proof_color, proof_location, proof_description } = req.body;
        const proof_image_url = req.file ? `/uploads/${req.file.filename}` : null;

        await LostFoundClaim.create(
            item.id,
            req.user.id,
            proof_color || '',
            proof_location || '',
            proof_description || '',
            proof_image_url
        );

        // Notify the listing owner
        const notifyMsg = `New claim proof submitted for your item "${item.title}" by ${req.user.username}.`;
        await Notification.create(item.user_id, notifyMsg, `/lost-found/${item.id}`);
        
        const io = req.app.get('socketio');
        io.to(`user-${item.user_id}`).emit('notification', { message: notifyMsg });

        // Log activity for claimer
        const UserActivity = require('../models/UserActivity');
        await UserActivity.create(req.user.id, 'SUBMIT_CLAIM', `Submitted claim request for item "${item.title}"`);

        res.redirect(`/lost-found/${item.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.postActionClaim = async (req, res) => {
    try {
        const item = await LostFound.findById(req.params.id);
        if (!item) return res.status(404).send('Item Not Found');

        // Only listing owner can act on claims
        if (item.user_id !== req.user.id) {
            return res.status(403).send('Unauthorized');
        }

        const { action } = req.body; // 'approve' or 'reject'
        const claim = await LostFoundClaim.findById(req.params.claimId);
        if (!claim || claim.item_id !== item.id) {
            return res.status(404).send('Claim Not Found');
        }

        if (action === 'approve') {
            // Update claim status to Approved
            await LostFoundClaim.updateStatus(claim.id, 'Approved');
            // Reject all other pending claims for this item
            await LostFoundClaim.rejectOtherClaims(item.id, claim.id);
            // Update item status to Claimed
            await LostFound.updateStatus(item.id, 'Claimed');

            // Generate unique 6-digit OTPs
            const claimerOtp = Math.floor(100000 + Math.random() * 900000).toString();
            const posterOtp = Math.floor(100000 + Math.random() * 900000).toString();

            // Save OTPs
            await LostFoundClaim.saveOtps(claim.id, claimerOtp, posterOtp);

            // Fetch user profiles for email delivery
            const claimerUser = await User.findById(claim.claimer_id);
            const posterUser = await User.findById(item.user_id);

            // Email to Claimer
            sendEmail({
                to: claimerUser.email,
                subject: `[CampusConnect] Claim Approved: Handover Verification OTP for "${item.title}"`,
                text: `Hello ${claimerUser.full_name || claimerUser.username},\n\nYour claim for "${item.title}" has been approved by the finder.\n\nTo complete the handover, please meet at the Campus Security / Lost & Found desk. Provide your OTP to the finder during the meetup to verify the exchange:\n\nCLAIMER OTP: ${claimerOtp}\n\nFinder's Contact Info: ${item.contact_info}\n\nThank you,\nCampusConnect Team`,
                html: `<h3>Hello ${claimerUser.full_name || claimerUser.username},</h3>
                       <p>Your claim for the item <strong>"${item.title}"</strong> has been approved by the finder.</p>
                       <p>To complete the handover, please meet at the <strong>Campus Security / Lost & Found desk</strong>.</p>
                       <p>Provide your OTP to the finder during the meetup to verify the exchange:</p>
                       <div style="font-size: 1.8rem; font-weight: 800; letter-spacing: 2px; padding: 1rem; background: #f5f5f5; display: inline-block; border-radius: 4px; color: #000; font-family: monospace; border: 1px solid #ddd;">
                           ${claimerOtp}
                       </div>
                       <br><br>
                       <p><strong>Finder's Contact Info:</strong> ${item.contact_info}</p>
                       <br>
                       <p>Thank you,<br>CampusConnect Team</p>`
            });

            // Email to Poster
            sendEmail({
                to: posterUser.email,
                subject: `[CampusConnect] Handover Verification OTP for "${item.title}"`,
                text: `Hello ${posterUser.full_name || posterUser.username},\n\nYou have approved the claim request for "${item.title}".\n\nTo complete the handover, please meet at the Campus Security / Lost & Found desk. Provide your OTP to the claimer during the meetup to verify the exchange:\n\nPOSTER OTP: ${posterOtp}\n\nClaimer's Contact Info: ${claimerUser.email}\n\nThank you,\nCampusConnect Team`,
                html: `<h3>Hello ${posterUser.full_name || posterUser.username},</h3>
                       <p>You have approved the claim request for the item <strong>"${item.title}"</strong>.</p>
                       <p>To complete the handover, please meet at the <strong>Campus Security / Lost & Found desk</strong>.</p>
                       <p>Provide your OTP to the claimer during the meetup to verify the exchange:</p>
                       <div style="font-size: 1.8rem; font-weight: 800; letter-spacing: 2px; padding: 1rem; background: #f5f5f5; display: inline-block; border-radius: 4px; color: #000; font-family: monospace; border: 1px solid #ddd;">
                           ${posterOtp}
                       </div>
                       <br><br>
                       <p><strong>Claimer's Contact Info:</strong> ${claimerUser.email}</p>
                       <br>
                       <p>Thank you,<br>CampusConnect Team</p>`
            });

            // Notify the claimer (reveal PIN and tell them to meet at Campus Security Desk)
            const notifyMsg = `Congratulations! Your claim for "${item.title}" has been APPROVED. Handover verification OTPs have been sent to your registered emails. Please coordinate via DMs to meet at the Campus Security / Lost & Found desk.`;
            await Notification.create(claim.claimer_id, notifyMsg, `/lost-found/${item.id}`);
            
            const io = req.app.get('socketio');
            io.to(`user-${claim.claimer_id}`).emit('notification', { message: notifyMsg });

            // Log claim approval for owner and claimer
            const UserActivity = require('../models/UserActivity');
            await UserActivity.create(req.user.id, 'APPROVE_CLAIM', `Approved claim request for item "${item.title}" from @${claim.username}`);
            await UserActivity.create(claim.claimer_id, 'CLAIM_APPROVED', `Your claim request for item "${item.title}" has been approved by the finder`);

            io.emit('item_resolved', { id: item.id, title: item.title });
        } else if (action === 'reject') {
            await LostFoundClaim.updateStatus(claim.id, 'Rejected');

            // Notify the claimer
            const notifyMsg = `Your claim for "${item.title}" was rejected by the owner.`;
            await Notification.create(claim.claimer_id, notifyMsg, `/lost-found/${item.id}`);

            const io = req.app.get('socketio');
            io.to(`user-${claim.claimer_id}`).emit('notification', { message: notifyMsg });

            // Log activity
            const UserActivity = require('../models/UserActivity');
            await UserActivity.create(req.user.id, 'REJECT_CLAIM', `Rejected claim request for item "${item.title}" from @${claim.username}`);
            await UserActivity.create(claim.claimer_id, 'CLAIM_REJECTED', `Your claim request for item "${item.title}" was rejected`);

            // Send email to claimer
            const { sendEmail } = require('../config/mailer');
            const User = require('../models/User');
            const claimerUser = await User.findById(claim.claimer_id);
            if (claimerUser) {
                sendEmail({
                    to: claimerUser.email,
                    subject: `[CampusConnect] Claim Request Rejected: "${item.title}"`,
                    text: `Hello ${claimerUser.full_name || claimerUser.username},\n\nYour claim request for the item "${item.title}" has been rejected by the listing owner.\n\nBest regards,\nCampusConnect Team`,
                    html: `<h3>Hello ${claimerUser.full_name || claimerUser.username},</h3>
                           <p>Your claim request for the item <strong>"${item.title}"</strong> has been rejected by the listing owner.</p>
                           <p>Best regards,<br>CampusConnect Team</p>`
                });
            }
        }

        res.redirect(`/lost-found/${item.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

exports.postVerifyOtp = async (req, res) => {
    try {
        const item = await LostFound.findById(req.params.id);
        if (!item) return res.status(404).send('Item Not Found');

        // Retrieve the approved claim
        let myClaim = null;
        if (item.user_id === req.user.id) {
            const claims = await LostFoundClaim.findByItemId(item.id);
            myClaim = claims.find(c => c.status === 'Approved');
        } else {
            myClaim = await LostFoundClaim.findByClaimerAndItem(req.user.id, item.id);
        }

        if (!myClaim || myClaim.status !== 'Approved') {
            return res.status(400).send('No active approved claim found for this item.');
        }

        const { otp } = req.body;
        const isPoster = item.user_id === req.user.id;
        const isClaimer = myClaim.claimer_id === req.user.id;

        if (!isPoster && !isClaimer) {
            return res.status(403).send('Unauthorized');
        }

        if (isPoster) {
            // Poster must enter the Claimer's OTP to verify the Claimer
            if (otp !== myClaim.claimer_otp) {
                return res.render('error', { message: 'Incorrect Claimer OTP! Handover verification failed.' });
            }
            await LostFoundClaim.verifyClaimer(myClaim.id);
        } else if (isClaimer) {
            // Claimer must enter the Poster's OTP to verify the Poster
            if (otp !== myClaim.poster_otp) {
                return res.render('error', { message: 'Incorrect Poster OTP! Handover verification failed.' });
            }
            await LostFoundClaim.verifyPoster(myClaim.id);
        }

        // Check if both are now verified
        const updatedClaim = await LostFoundClaim.findById(myClaim.id);
        if (updatedClaim.claimer_verified && updatedClaim.poster_verified) {
            // Determine returned_by_id and received_by_id based on item.type
            let returned_by_id = null;
            let received_by_id = null;
            if (item.type === 'found') {
                returned_by_id = item.user_id; // Finder
                received_by_id = myClaim.claimer_id; // Owner
            } else {
                returned_by_id = myClaim.claimer_id; // Finder
                received_by_id = item.user_id; // Owner
            }

            // Mark item as Resolved (Handover completed) and save returned/received ids
            await LostFound.setReturnedReceived(item.id, returned_by_id, received_by_id);

            // Notify both parties
            const io = req.app.get('socketio');
            const successMsg = `Handover verified successfully! Item "${item.title}" is now marked as resolved and closed.`;
            
            await Notification.create(item.user_id, successMsg, `/lost-found/${item.id}`);
            await Notification.create(myClaim.claimer_id, successMsg, `/lost-found/${item.id}`);
            
            io.to(`user-${item.user_id}`).emit('notification', { message: successMsg });
            io.to(`user-${myClaim.claimer_id}`).emit('notification', { message: successMsg });

            // Log activity for both
            const UserActivity = require('../models/UserActivity');
            await UserActivity.create(returned_by_id, 'RETURN_ITEM', `Returned item "${item.title}" to @${item.type === 'found' ? updatedClaim.username : item.username}`);
            await UserActivity.create(received_by_id, 'RECOVER_ITEM', `Recovered item "${item.title}", returned by @${item.type === 'found' ? item.username : updatedClaim.username}`);

            // Send email to both
            const { sendEmail } = require('../config/mailer');
            const User = require('../models/User');
            const returner = await User.findById(returned_by_id);
            const receiver = await User.findById(received_by_id);

            if (returner) {
                sendEmail({
                    to: returner.email,
                    subject: `[CampusConnect] Handover Successful: "${item.title}"`,
                    text: `Hello ${returner.full_name || returner.username},\n\nThe handover verification for "${item.title}" has been successfully completed!\n\nYou have returned the item.\n\nThank you,\nCampusConnect Team`,
                    html: `<h3>Hello ${returner.full_name || returner.username},</h3>
                           <p>The handover verification for the item <strong>"${item.title}"</strong> has been successfully completed!</p>
                           <p>You have returned the item.</p>
                           <p>Thank you,<br>CampusConnect Team</p>`
                });
            }

            if (receiver) {
                sendEmail({
                    to: receiver.email,
                    subject: `[CampusConnect] Handover Successful: "${item.title}"`,
                    text: `Hello ${receiver.full_name || receiver.username},\n\nThe handover verification for "${item.title}" has been successfully completed!\n\nYou have received your item.\n\nBest regards,\nCampusConnect Team`,
                    html: `<h3>Hello ${receiver.full_name || receiver.username},</h3>
                           <p>The handover verification for the item <strong>"${item.title}"</strong> has been successfully completed!</p>
                           <p>You have received your item.</p>
                           <p>Best regards,<br>CampusConnect Team</p>`
                });
            }

            io.emit('item_resolved', { id: item.id, title: item.title });
        }

        res.redirect(`/lost-found/${item.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};
