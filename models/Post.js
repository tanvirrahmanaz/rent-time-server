const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    // --- Basic Info ---
    ownerId: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    postType: { type: String, enum: ['house', 'roommate'], required: true },
    location: { type: String, required: true },
    rent: { type: Number, required: true },
    photos: { type: [String], required: true, validate: [v => Array.isArray(v) && v.length > 0, 'At least one photo is required.'] },
    
    // --- Contact & Availability ---
    contactNumber: { type: String, required: [true, "Contact number is required."] },
    contactPreference: { type: String, enum: ['Phone', 'Email'], default: 'Phone' },
    availableFrom: { type: Date, required: true },
    visitingHours: { type: String },

    // --- House/Room Specific ---
    bedrooms: { type: Number },
    bathrooms: { type: Number },
    size: { type: Number }, // Square feet
    amenities: { type: [String] },

    // --- Roommate Specific ---
    preferredGender: { type: String, enum: ['Male', 'Female', 'Any'] },
    preferredOccupation: { type: String, enum: ['Student', 'Professional', 'Any'] },

    // --- Verification & Rules (New) ---
    nidNumber: { type: String }, // Optional, for verification
    rules: { type: [String] }, // e.g., No smoking, Pets not allowed

    // --- Timestamps ---
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true }); // `updatedAt` field automatically adds

const Post = mongoose.model('Post', postSchema);
module.exports = Post;