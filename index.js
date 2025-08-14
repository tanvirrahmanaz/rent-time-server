const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config(); // .env ফাইল থেকে ভেরিয়েবল লোড করার জন্য
const User = require('./models/User'); // ইউজার মডেল ইমপোর্ট করুন
const Post = require('./models/Post'); // পোস্ট মডেল ইমপোর্ট করুন
const Booking = require('./models/Booking');
const verifyToken = require('./middleware/verifyToken'); // মিডলওয়্যার ইমপোর্ট করুন
// অ্যাপ ইনিশিয়ালাইজেশন
const app = express();
const port = process.env.PORT || 5000;

// মিডলওয়্যার
app.use(cors());
app.use(express.json()); // এটি ইনকামিং JSON রিকোয়েস্ট পার্স করার জন্য

// --- ডেটাবেজ কানেকশন ---
const uri = process.env.DATABASE_URI;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const connection = mongoose.connection;
connection.once('open', () => {
    console.log("✅ MongoDB database connection established successfully!");
});
// --- Firebase Admin SDK Setup ---
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// --- Mongoose Schema and Model (উদাহরণ) ---
app.post('/api/users', async (req, res) => {
    try {
        const { uid, email, name, photoURL } = req.body;

        if (!uid || !email) {
            return res.status(400).json({ message: "UID and Email are required." });
        }

        // "Find or Create" লজিক
        const user = await User.findOneAndUpdate(
            { uid: uid }, // কোন ফিল্ড দিয়ে খুঁজবে
            { 
                $set: { // কী কী ডেটা সেট বা আপডেট করবে
                    name: name,
                    email: email,
                    photoURL: photoURL,
                    lastLogin: new Date()
                }
            },
            { 
                new: true,      // যদি ডকুমেন্ট আপডেট হয়, তাহলে নতুন ভার্সনটি রিটার্ন করবে
                upsert: true    // যদি uid দিয়ে কোনো ইউজার খুঁজে না পায়, তাহলে নতুন একটি তৈরি করবে
            }
        );

        res.status(200).json({ message: "User data synced successfully!", user: user });

    } catch (error) {
        res.status(500).json({ message: "Server error during user sync", error: error.message });
    }
});

// পোস্ট তৈরির জন্য একটি POST রুট
// এই রুটটি আমরা পরে JWT দিয়ে সুরক্ষিত করব
app.post('/api/posts', async (req, res) => {
    try {
        const postData = req.body;
        // ownerId আমরা পরে JWT টোকেন থেকে নেব, বডি থেকে নয়
        // const ownerId = req.user.uid; // উদাহরণস্বরূপ
        
        // এখনকার জন্য, আমরা সিমুলেশনের জন্য বডি থেকেই নিচ্ছি
        if (!postData.ownerId) {
             return res.status(400).json({ message: "Owner ID is required." });
        }

        const newPost = new Post(postData);
        await newPost.save();
        res.status(201).json({ message: "Post created successfully!", post: newPost });

    } catch (error) {
        res.status(400).json({ message: "Error creating post", error: error.message });
    }
});

app.get('/api/posts', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 9; // প্রতি পেইজে ৯টি পোস্ট
        const postType = req.query.type; // URL থেকে 'type' প্যারামিটার নিন (যেমন: house, roommate)
        const skip = (page - 1) * limit;

        // ফিল্টার করার জন্য একটি অবজেক্ট তৈরি করুন
        const filter = {};
        if (postType) {
            filter.postType = postType;
        }

        // ফিল্টারসহ মোট পোস্ট গণনা করুন
        const totalPosts = await Post.countDocuments(filter);
        
        // ফিল্টারসহ নির্দিষ্ট পেইজের জন্য পোস্ট খুঁজুন
        const posts = await Post.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        res.status(200).json({
            posts,
            totalPages: Math.ceil(totalPosts / limit),
            currentPage: page,
        });

    } catch (error) {
        res.status(500).json({ message: "Error fetching posts", error: error.message });
    }
});

// --- নতুন রুট: নির্দিষ্ট ইউজারের সব পোস্ট পাওয়ার জন্য (সুরক্ষিত) ---
app.get('/api/my-posts', verifyToken, async (req, res) => {
    try {
        const userUid = req.user.uid; // verifyToken থেকে পাওয়া uid
        const posts = await Post.find({ ownerId: userUid }).sort({ createdAt: -1 });
        res.status(200).json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user posts', error: error.message });
    }
});

// --- নতুন রুট: একটি পোস্ট ডিলিট করার জন্য (সুরক্ষিত) ---
app.delete('/api/posts/:id', verifyToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const userUid = req.user.uid;

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found.' });
        }

        // চেক করা হচ্ছে যে ইউজারটি পোস্টের আসল মালিক কি না
        if (post.ownerId !== userUid) {
            return res.status(403).json({ message: 'Forbidden: You are not the owner of this post.' });
        }

        await Post.findByIdAndDelete(postId);
        res.status(200).json({ message: 'Post deleted successfully.' });

    } catch (error) {
        res.status(500).json({ message: 'Error deleting post', error: error.message });
    }
});

app.get('/api/posts/:id', async (req, res) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId);
        
        if (!post) {
            return res.status(404).json({ message: "Post not found." });
        }
        
        res.status(200).json(post);
    } catch (error) {
        res.status(500).json({ message: "Error fetching post details", error: error.message });
    }
});


// --- নতুন রুট: নতুন বুকিং রিকোয়েস্ট তৈরি করার জন্য (সুরক্ষিত) ---
app.post('/api/bookings', verifyToken, async (req, res) => {
    try {
        const { postId } = req.body;
        const requesterId = req.user.uid;
        const { name, email } = req.user; // টোকেন থেকে নাম ও ইমেইল (যদি থাকে)

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found." });

        // ব্যবহারকারী নিজের পোস্টে বুকিং দিতে পারবে না
        if (post.ownerId === requesterId) {
            return res.status(400).json({ message: "You cannot book your own post." });
        }

        // একই পোস্টে একাধিকবার পেন্ডিং রিকোয়েস্ট করা যাবে না
        const existingBooking = await Booking.findOne({ postId, requesterId, status: 'Pending' });
        if (existingBooking) {
            return res.status(400).json({ message: "You already have a pending request for this post." });
        }

        const newBooking = new Booking({
            postId,
            ownerId: post.ownerId,
            requesterId,
            requesterName: name || email, // Firebase থেকে নাম না পেলে ইমেইল ব্যবহার
            requesterEmail: email,
        });

        await newBooking.save();
        res.status(201).json({ message: "Booking request sent successfully!", booking: newBooking });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// --- নতুন রুট: ইউজারের পোস্টে আসা সব রিকোয়েস্ট পাওয়ার জন্য (সুরক্ষিত) ---
app.get('/api/bookings/received', verifyToken, async (req, res) => {
    try {
        const ownerId = req.user.uid;
        const bookings = await Booking.find({ ownerId: ownerId })
            .populate('postId', 'title photos') // পোস্টের টাইটেল ও ছবিও সাথে নিয়ে আসবে
            .sort({ createdAt: -1 });
        res.status(200).json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching received bookings', error: error.message });
    }
});
// --- নতুন রুট: বুকিং স্ট্যাটাস আপডেট করার জন্য (Approve/Reject) (সুরক্ষিত) ---
app.patch('/api/bookings/:id/status', verifyToken, async (req, res) => {
    try {
        const { status } = req.body; // 'Approved' or 'Rejected'
        const bookingId = req.params.id;
        const userUid = req.user.uid;

        const booking = await Booking.findById(bookingId);
        if (!booking) return res.status(404).json({ message: 'Booking not found.' });

        // শুধুমাত্র পোস্টের মালিকই স্ট্যাটাস পরিবর্তন করতে পারবে
        if (booking.ownerId !== userUid) {
            return res.status(403).json({ message: 'Forbidden: You are not the owner of this post.' });
        }

        booking.status = status;
        await booking.save();
        res.status(200).json({ message: `Booking status updated to ${status}`, booking });
    } catch (error) {
        res.status(500).json({ message: 'Error updating booking status', error: error.message });
    }
});

app.get('/api/bookings/sent', verifyToken, async (req, res) => {
    try {
        const requesterId = req.user.uid; // টোকেন থেকে রিকোয়েস্টকারীর uid
        const bookings = await Booking.find({ requesterId: requesterId })
            .populate('postId', 'title photos location rent') // পোস্টের বিস্তারিত তথ্যও সাথে নিয়ে আসবে
            .sort({ createdAt: -1 });
        res.status(200).json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sent bookings', error: error.message });
    }
});
// --- নতুন রুট: একটি বুকিং রিকোয়েস্ট ডিলিট/বাতিল করার জন্য (সুরক্ষিত) ---
app.delete('/api/bookings/:id', verifyToken, async (req, res) => {
    try {
        const bookingId = req.params.id;
        const userUid = req.user.uid;

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return res.status(404).json({ message: 'Booking request not found.' });
        }

        // শুধুমাত্র যে ইউজার রিকোয়েস্ট করেছে, সেই এটি ডিলিট করতে পারবে
        if (booking.requesterId !== userUid) {
            return res.status(403).json({ message: 'Forbidden: You did not make this request.' });
        }

        await Booking.findByIdAndDelete(bookingId);
        res.status(200).json({ message: 'Booking request cancelled successfully.' });

    } catch (error) {
        res.status(500).json({ message: 'Error cancelling booking request', error: error.message });
    }
});

// --- API রাউট (Routes) ---
// টেস্ট রুট
app.get('/', (req, res) => {
    res.send('Rent Time Server is running!');
});

// ইউজার তৈরির জন্য একটি স্যাম্পল POST রুট
app.post('/api/users', async (req, res) => {
    try {
        const { name, email } = req.body;
        const newUser = new User({ name, email });
        await newUser.save();
        res.status(201).json({ message: "User created successfully!", user: newUser });
    } catch (error) {
        res.status(400).json({ message: "Error creating user", error: error.message });
    }
});


// --- সার্ভার চালু করা ---
app.listen(port, () => {
    console.log(`🚀 Server is running on port: ${port}`);
});