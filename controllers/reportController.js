const Report = require('../models/Report');
const LostFound = require('../models/LostFound');
const Notification = require('../models/Notification');

exports.postReport = async (req, res) => {
    try {
        const { item_type, item_id, reason } = req.body;
        
        // Ensure user is authenticated
        if (!req.user) {
            return res.status(401).json({ error: 'You must be logged in to report content.' });
        }

        await Report.create(req.user.id, item_type, item_id, reason);

        // Auto-moderation check for LostFound items
        if (item_type === 'LostFound') {
            await LostFound.incrementReportCount(item_id);
            const item = await LostFound.findById(item_id);
            if (item && item.report_count >= 3) {
                // Suspend the item (set is_approved to 0)
                await LostFound.suspend(item_id);

                // Notify listing owner
                const notifyMsg = `Your Lost & Found listing "${item.title}" has been temporarily hidden because it received multiple flags. An admin will review it shortly.`;
                await Notification.create(item.user_id, notifyMsg, `/lost-found/${item.id}`);

                const io = req.app.get('socketio');
                if (io) {
                    io.to(`user-${item.user_id}`).emit('notification', { message: notifyMsg });
                    // Also notify client to remove from feed if open
                    io.emit('item_resolved', { id: item.id, title: item.title });
                }
            }
        }
        
        res.json({ success: true, message: 'Report submitted successfully. Our moderators will review it.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while submitting the report.' });
    }
};
