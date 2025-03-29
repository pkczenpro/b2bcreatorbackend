import express from 'express';
import messageController from '../controllers/messageController.js';
import authenticate from '../middlewares/authenticate.js';


const router = express.Router();

// Fetch messages between sender and receiver
router.get('/', authenticate, messageController.fetchMessages);

// Send a new message
router.post('/', authenticate, messageController.sendMessage);

// Get chat list for a user
router.get('/chatlist', authenticate, messageController.getChatList);

export default router;
