const mongoose = require('mongoose');
const { Schema } = mongoose;

const bookingSchema = new Schema({
    postId: {
        type: Schema.Types.ObjectId,
        ref: 'Post', // 'Post' মডেলের সাথে লিঙ্ক
        required: true,
    },
    ownerId: { // পোস্টের মালিকের UID
        type: String,
        required: true,
    },
    requesterId: { // যে ইউজার রিকোয়েস্ট পাঠিয়েছে তার UID
        type: String,
        required: true,
    },
    requesterName: { type: String, required: true },
    requesterEmail: { type: String, required: true },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
    },
}, { timestamps: true });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;