import Message from '../models/message.js';

const MessageService = {

    async getMessages(sender, receiver) {
        try {
            const messages = await Message.find({
                $or: [
                    { sender, receiver },
                    { sender: receiver, receiver: sender },
                ],
            }).sort({ timestamp: 1 });

            return messages;
        } catch (error) {
            throw new Error('Error fetching messages');
        }
    },

    async saveMessage(sender, receiver, message) {
        try {
            const newMessage = new Message({
                sender,
                receiver,
                message,
            });

            await newMessage.save();
            return newMessage;
        } catch (error) {
            throw new Error('Error saving message');
        }
    },

    async getChatList(user_id) {
        try {
            const chatList = await Message.aggregate([
                // Match messages where the user is either sender or receiver
                { $match: { $or: [{ sender: user_id }, { receiver: user_id }] } },

                // Sort messages in descending order by timestamp
                { $sort: { timestamp: -1 } },

                // Group by conversation partner (other user)
                {
                    $group: {
                        _id: {
                            $cond: [
                                { $eq: ["$sender", user_id] },
                                "$receiver",
                                "$sender",
                            ],
                        },
                        message: { $first: "$message" },
                        timestamp: { $first: "$timestamp" },
                    },
                },

                // Convert _id to ObjectId (Ensures proper lookup)
                {
                    $addFields: {
                        _id: { $toObjectId: "$_id" }
                    }
                },

                // Lookup user details from Users collection
                {
                    $lookup: {
                        from: "users",
                        localField: "_id",
                        foreignField: "_id",
                        as: "user",
                    },
                },
                { $unwind: "$user" },

                // Project required fields
                {
                    $project: {
                        _id: 0,
                        _id: "$user._id",
                        name: "$user.name",
                        image: "$user.profileImage",
                        message: 1,
                        timestamp: 1,
                    },
                },

                // Sort again to ensure final list is ordered properly
                { $sort: { timestamp: -1 } },
            ]);

            return chatList;
        } catch (error) {
            throw new Error("Error fetching chat list: " + error.message);
        }
    }
}

export default MessageService;
