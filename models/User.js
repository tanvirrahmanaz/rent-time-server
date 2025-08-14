const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    uid: { type: String, required: true, unique: true }, // Firebase থেকে আসা ইউনিক আইডি
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    photoURL: { type: String }, // এটি আবশ্যক নয়
    lastLogin: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

module.exports = User;