const admin = require('firebase-admin');

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    }

    const idToken = authHeader.split(' ')[1];

    try {
        // Firebase Admin SDK দিয়ে টোকেনটি ভেরিফাই করুন
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
        // ডিকোড করা তথ্য থেকে uid নিয়ে রিকোয়েস্টে যোগ করুন
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
        };
        next();
    } catch (error) {
        console.error('Error verifying token:', error);
        return res.status(403).json({ message: 'Forbidden: Invalid token.' });
    }
};

module.exports = verifyToken;