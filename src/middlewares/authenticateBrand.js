import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const authenticateBrand = (req, res, next) => {
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        req.user = decoded;
        if (req.user.userType !== 'brand') {
            return res.status(401).json({ error: 'Access denied. Not a brand.' });
        }
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token.' });
    }
};

export default authenticateBrand;
