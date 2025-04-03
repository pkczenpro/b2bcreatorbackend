import MessageService from "../services/messageService.js";
import moment from "moment";

export const fetchMessages = async (req, res) => {
    const { sender, receiver } = req.query;
    const user_id = req.user.id;

    if (!sender || !receiver) {
        return res.status(400).json({ error: 'Sender and Receiver are required' });
    }

    try {
        const messages = await MessageService.getMessages(sender, receiver);
        const modified = messages.map((message) => {
            return {
                sender: message.sender,
                receiver: message.receiver,
                message: message.message,
                createdAt: moment(message.timestamp).format("hh:mm A"),
                text: message.message,
                isSender: message.sender === sender,
                from: message.sender,
            };
        });
        res.status(200).json(modified);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const sendMessage = async (req, res) => {
    const { sender, receiver, message } = req.body;
    if (!sender || !receiver || !message) {
        return res.status(400).json({ error: 'Sender, Receiver, and Message are required' });
    }
    try {
        const newMessage = await MessageService.saveMessage(sender, receiver, message);
        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getChatList = async (req, res) => {
    const user_id = req.user.id;
    try {
        const chatList = await MessageService.getChatList(user_id);
        res.status(200).json(chatList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const contactWithUsers = async (req, res) => {
    const user_id = req.user.id;
    try {
        const chatList = await MessageService.getContactWithUsers(user_id);
        res.status(200).json(chatList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export default {
    fetchMessages,
    sendMessage,
    getChatList,
    contactWithUsers,
};
