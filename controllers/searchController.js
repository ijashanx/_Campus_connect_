const Note = require('../models/Note');
const Donation = require('../models/Donation');
const Complaint = require('../models/Complaint');

exports.getGlobalSearch = async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.render('search/results', { 
                query: '', 
                results: { notes: [], donations: [], complaints: [] },
                savedNoteIds: [],
                savedDonationIds: [],
                savedLostFoundIds: [],
                savedComplaintIds: []
            });
        }

        const filters = { keyword: query };

        // Fetch concurrently and safely handle non-logged-in users
        const complaintsPromise = req.user 
            ? (req.user.role === 'admin' ? Complaint.findAll(filters) : Complaint.findByUser(req.user.id, filters))
            : Promise.resolve([]);

        const [notes, donations, complaints] = await Promise.all([
            Note.findAll(filters),
            Donation.findAll(filters),
            complaintsPromise
        ]);

        const results = {
            notes: notes || [],
            donations: donations || [],
            complaints: complaints || []
        };

        // Fetch bookmark states
        let savedNoteIds = [];
        let savedDonationIds = [];
        let savedLostFoundIds = [];
        let savedComplaintIds = [];

        if (req.user) {
            const Bookmark = require('../models/Bookmark');
            const [noteBookmarks, donationBookmarks, lfBookmarks, complaintBookmarks] = await Promise.all([
                Bookmark.findByUser(req.user.id, 'Note'),
                Bookmark.findByUser(req.user.id, 'Donation'),
                Bookmark.findByUser(req.user.id, 'LostFound'),
                Bookmark.findByUser(req.user.id, 'Complaint')
            ]);
            savedNoteIds = noteBookmarks.map(b => b.item_id);
            savedDonationIds = donationBookmarks.map(b => b.item_id);
            savedLostFoundIds = lfBookmarks.map(b => b.item_id);
            savedComplaintIds = complaintBookmarks.map(b => b.item_id);
        }

        res.render('search/results', { 
            query, 
            results,
            savedNoteIds,
            savedDonationIds,
            savedLostFoundIds,
            savedComplaintIds
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).send('Server Error during search');
    }
};
