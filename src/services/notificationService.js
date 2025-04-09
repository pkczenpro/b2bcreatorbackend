import Notification from "../models/notification.js";

const NotificationService = {
    async sendNotification(io, senderId, receiverId, message, link = "") {
        const notification = await Notification.create({
            sender: senderId,
            receiver: receiverId,
            message,
            link,
        });

        const populatedNotification = await Notification.findById(notification._id)
            .populate("sender", "name email") // Populate sender details

        console.log("Notification sent:", populatedNotification);
        // Emit the notification to the receiver

        io.to(receiverId.toString()).emit('newNotification', populatedNotification);
    }
};

export default NotificationService;