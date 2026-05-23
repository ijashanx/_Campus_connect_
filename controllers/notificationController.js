const Notification = require('../models/Notification');

exports.markAsRead = async (req, res) => {
    try {
        await Notification.markAsRead(req.params.id, req.user.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.markAllAsRead(req.user.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
};
