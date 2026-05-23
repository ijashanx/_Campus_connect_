const jwt = require('jsonwebtoken');
const Notification = require('../models/Notification');

exports.isAuthenticated = (req, res, next) => {
    const token = req.cookies.token;
    
    if (!token) {
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Contains id, username, role
        next();
    } catch (error) {
        return res.redirect('/login');
    }
};

exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).send('<h1>403 Forbidden</h1><p>You do not have Administrator access.</p><a href="/">Return Home</a>');
    }
};

exports.checkUser = async (req, res, next) => {
    const token = req.cookies.token;
    
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            res.locals.user = decoded; // Make user accessible in EJS templates
            
            const unreadNotifs = await Notification.getUnreadByUser(decoded.id);
            res.locals.notifications = unreadNotifs;
        } catch (error) {
            req.user = null;
            res.locals.user = null;
            res.locals.notifications = [];
        }
    } else {
        req.user = null;
        res.locals.user = null;
        res.locals.notifications = [];
    }
    next();
};
