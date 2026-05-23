const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const Message = require('./models/Message');

const { checkUser, isAuthenticated } = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
const lostFoundRoutes = require('./routes/lostFoundRoutes');
const notesRoutes = require('./routes/notesRoutes');
const donationRoutes = require('./routes/donationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const searchRoutes = require('./routes/searchRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Make io accessible in routing if needed
app.set('socketio', io);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Global Middleware
app.use(checkUser);

app.use((req, res, next) => {
    res.locals.firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY || '',
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
        projectId: process.env.FIREBASE_PROJECT_ID || '',
        appId: process.env.FIREBASE_APP_ID || ''
    };
    next();
});

// View Engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routes
app.use('/', authRoutes);
app.use('/lost-found', lostFoundRoutes);
app.use('/notes', notesRoutes);
app.use('/donations', donationRoutes);
app.use('/admin', adminRoutes);
app.use('/complaints', complaintRoutes);
app.use('/notifications', notificationRoutes);
app.use('/report', reportRoutes);
app.use('/search', searchRoutes);

const bookmarkController = require('./controllers/bookmarkController');
app.post('/bookmarks/add', isAuthenticated, bookmarkController.addBookmark);
app.post('/bookmarks/remove', isAuthenticated, bookmarkController.removeBookmark);
app.get('/bookmarks', isAuthenticated, bookmarkController.getBookmarks);

const LostFound = require('./models/LostFound');
const Donation = require('./models/Donation');
const Note = require('./models/Note');
const Complaint = require('./models/Complaint');

app.get('/', isAuthenticated, async (req, res) => {
    try {
        const recentLostFound = await LostFound.findAll({ 
            limit: 4, 
            ...(req.user ? { exclude_user_id: req.user.id } : {}) 
        });
        const recentDonations = await Donation.findAll({ 
            exclude_status: 'Donated', 
            limit: 4, 
            ...(req.user ? { exclude_user_id: req.user.id } : {}) 
        });
        const recentNotes = await Note.findAll({ 
            limit: 4, 
            ...(req.user ? { exclude_user_id: req.user.id } : {}) 
        });
        const recentComplaints = await Complaint.findAll({ limit: 4 });

        let savedNoteIds = [];
        let savedDonationIds = [];
        let savedLostFoundIds = [];
        let savedComplaintIds = [];
        if (req.user) {
            const Bookmark = require('./models/Bookmark');
            const noteBookmarks = await Bookmark.findByUser(req.user.id, 'Note');
            savedNoteIds = noteBookmarks.map(b => b.item_id);

            const donationBookmarks = await Bookmark.findByUser(req.user.id, 'Donation');
            savedDonationIds = donationBookmarks.map(b => b.item_id);

            const lfBookmarks = await Bookmark.findByUser(req.user.id, 'LostFound');
            savedLostFoundIds = lfBookmarks.map(b => b.item_id);

            const complaintBookmarks = await Bookmark.findByUser(req.user.id, 'Complaint');
            savedComplaintIds = complaintBookmarks.map(b => b.item_id);
        }

        res.render('index', { 
            recentLostFound, 
            recentDonations, 
            recentNotes, 
            recentComplaints,
            savedNoteIds,
            savedDonationIds,
            savedLostFoundIds,
            savedComplaintIds
        });
    } catch (err) {
        console.error("Error loading home page data:", err);
        res.render('index', { 
            recentLostFound: [], recentDonations: [], recentNotes: [], recentComplaints: [],
            savedNoteIds: [], savedDonationIds: [], savedLostFoundIds: [], savedComplaintIds: []
        });
    }
});

// Socket.IO connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinItemRoom', (itemId) => {
        socket.join(`item-${itemId}`);
        console.log(`Socket joined room: item-${itemId}`);
    });

    socket.on('joinUserRoom', (userId) => {
        socket.join(`user-${userId}`);
        console.log(`Socket joined room: user-${userId}`);
    });

    socket.on('sendMessage', async (data) => {
        try {
            const msgId = await Message.create(data.item_id, data.sender_id, data.content);
            io.to(`item-${data.item_id}`).emit('receiveMessage', {
                id: msgId,
                item_id: data.item_id,
                sender_id: data.sender_id,
                content: data.content,
                username: data.username,
                created_at: new Date()
            });
        } catch (error) {
            console.error('Socket message save error:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// 404 Catch-All Route
app.use((req, res, next) => {
    res.status(404).render('404');
});
// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
