import Message from '../models/message.js';
import User from '../models/user.js';

const MessageService = {

    async getMessages(sender, receiver) {
        try {
            const messages = await Message.find({
                $or: [
                    { sender, receiver },
                    { sender: receiver, receiver: sender },
                ],
            }).sort({ timestamp: 1 });

            // Mark messages as read if the sender is not the current user
            if (sender !== receiver) {
                await Message.updateMany(
                    { sender: receiver, receiver: sender, isRead: false },
                    { $set: { isRead: true } }
                );
            }
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

    async markMessagesAsRead(sender, receiver) {
        try {
            await Message.updateMany(
                { sender: receiver, receiver: sender, isRead: false },
                { $set: { isRead: true } }
            );
        } catch (error) {
            throw new Error('Error marking messages as read');
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
                        isRead: { $first: "$isRead" },  // Include read status in the group stage
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
                        // _id: 0,
                        _id: "$user._id",
                        name: "$user.name",
                        image: "$user.profileImage",
                        message: 1,
                        timestamp: 1,
                        isRead: 1,
                        userType: "$user.userType",
                    },
                },

                // Sort first by read status (false = unread first), then by timestamp
                {
                    $sort: {
                        isRead: 1,  // Unread messages first
                        timestamp: -1,  // Then sort by timestamp (latest first)
                    }
                },
            ]);

            return chatList;
        } catch (error) {
            throw new Error("Error fetching chat list: " + error.message);
        }
    },
    
    async getContactWithUsers(req) {
        try {
            const user = req.user;
            const user_id = user.id;

            if (!user) throw new Error("User not found");

            // Determine target userType based on current user
            const targetUserType = user.userType === "creator" ? "brand" : user.userType === "brand" ? "creator" : null;

            // Fetch contacts directly filtered by targetUserType
            let contacts = await User.find(targetUserType ? { userType: targetUserType } : {})
                .select("_id name profileImage userType")
                .lean();

            const defaultImage = `${process.env.DOMAIN}/default.png`;

            contacts = contacts
                .filter(contact => contact._id.toString() !== user_id.toString())
                .map(contact => ({
                    ...contact,
                    image: contact.profileImage || defaultImage,
                    profileImage: undefined, // remove profileImage
                    userType: contact.userType, // remove userType
                }));

            return contacts;

        } catch (ex) {
            throw new Error(`Error fetching contact with users: ${ex.message}`);
        }
    }





}

export default MessageService;
