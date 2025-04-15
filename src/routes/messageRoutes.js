import express from 'express';
import messageController from '../controllers/messageController.js';
import authenticate from '../middlewares/authenticate.js';
import upload from '../middlewares/uploadMiddleware.js';


const router = express.Router();

// Fetch messages between sender and receiver
router.get('/', authenticate, messageController.fetchMessages);

// Send a new message
router.post('/', authenticate, messageController.sendMessage);

// Mark messages as read
router.post('/read', authenticate, messageController.markMessagesAsRead);

// Get chat list for a user
router.get('/chatlist', authenticate, messageController.getChatList);

// Get contact list for a user
router.get('/contactlist', authenticate, messageController.contactWithUsers);

// Upload a file message
router.post('/upload',
    authenticate,
    upload.fields([
        { name: "file", maxCount: 1 },
    ]),
    messageController.uploadFile);


export default router;
