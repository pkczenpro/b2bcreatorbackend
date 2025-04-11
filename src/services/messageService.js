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

    async saveMessage(req, sender, receiver, message) {
        try {
            const newMessage = new Message({
                sender,
                receiver,
                message,
            });

            const isFirstMessage = await Message.findOne({
                sender: receiver,
                receiver: sender,
                isRead: false,
            });

            await newMessage.save();
            const io = req.app.get('io');
            console.log("io", io);
            if (io) {
                io.to(receiver.toString()).emit('message', {
                    from: sender,
                    text: message,
                    isSender: false,
                    createdAt: newMessage.timestamp,
                    isFirstMessage: !isFirstMessage,
                });

                console.log("Message sent to receiver:", receiver);
            }

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
                {
                    $match: {
                        $or: [{ sender: user_id }, { receiver: user_id }]
                    }
                },

                // Sort messages in descending order by timestamp
                { $sort: { timestamp: -1 } },

                // Group by conversation partner (the other user)
                {
                    $group: {
                        _id: {
                            $cond: [
                                { $eq: ["$sender", user_id] },
                                "$receiver",
                                "$sender"
                            ]
                        },
                        message: { $first: "$message" },
                        timestamp: { $first: "$timestamp" },
                        sender: { $first: "$sender" },
                        receiver: { $first: "$receiver" },
                        isReadRaw: { $first: "$isRead" }
                    }
                },

                // Determine isRead from the perspective of the current user
                {
                    $addFields: {
                        isRead: {
                            $cond: [
                                { $eq: ["$receiver", user_id] },
                                "$isReadRaw",  // If the latest message was received, use its isRead
                                true           // If the user sent the latest message, consider it read
                            ]
                        },
                        _id: { $toObjectId: "$_id" }  // Convert for lookup
                    }
                },

                // Lookup user details
                {
                    $lookup: {
                        from: "users",
                        localField: "_id",
                        foreignField: "_id",
                        as: "user"
                    }
                },
                { $unwind: "$user" },

                // Select final fields
                {
                    $project: {
                        _id: "$user._id",
                        name: "$user.name",
                        image: "$user.profileImage",
                        message: 1,
                        timestamp: 1,
                        isRead: 1,
                        userType: "$user.userType"
                    }
                },

                // Sort by unread first, then by timestamp
                {
                    $sort: {
                        isRead: 1,
                        timestamp: -1
                    }
                }
            ]);

            console.log("Chat List:", chatList);

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
