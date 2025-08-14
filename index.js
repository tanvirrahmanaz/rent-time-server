const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config(); // .env ফাইল থেকে ভেরিয়েবল লোড করার জন্য
const User = require('./models/User'); // ইউজার মডেল ইমপোর্ট করুন
const Post = require('./models/Post'); // পোস্ট মডেল ইমপোর্ট করুন
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