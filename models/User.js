const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    uid: { // Firebase থেকে আসা ইউনিক আইডি
        type: String, 
        required: true, 
        unique: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    photoURL: { // এটি আবশ্যক নয়
        type: String 
    },
    
    // --- নতুন ফিল্ড যোগ করা হলো ---
    phone: { // যোগাযোগের জন্য ফোন নম্বর
        type: String,
    },
    address: { // ইউজারের ঠিকানা
        type: String,
    },
    role: { // ইউজারের ভূমিকা (ভবিষ্যতে অ্যাডমিন প্যানেলের জন্য)
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    savedPosts: [{ // ইউজারের পছন্দের বা সেভ করা পোস্টের তালিকা
        type: Schema.Types.ObjectId,
        ref: 'Post'
    }],

    // --- আগের ফিল্ড ---
    lastLogin: { 
        type: Date 
    },

}, { 
    // Mongoose কে createdAt এবং updatedAt ফিল্ড স্বয়ংক্রিয়ভাবে ম্যানেজ করতে বলা হলো
    timestamps: true 
});

const User = mongoose.model('User', userSchema);

module.exports = User;``````````````````````````````````````````````````````````````````````````````````````