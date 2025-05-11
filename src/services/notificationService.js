import Notification from "../models/notification.js";
import user from "../models/user.js";
import UserRepository from "../repositories/userRepository.js";
import { sendEmail } from "../utils/sendEmail.js";

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

        io.to(receiverId.toString()).emit('newNotification', populatedNotification);
    },

    async sendContentEmail(data) {
        console.log("Sending email to user with ID:", data);
        console.log("Email parameters:", data.params);


        const user = await UserRepository.findUserById(data.userId);

        if (!user || !user.email) {
            throw new Error("User not found");
        }

        const email = user?.email;
        const params = data?.params;

        try {
            const res = await sendEmail({
                to: [{ email }],
                templateId: 3,
                params: {
                    title: params.title,
                    content: params.content,
                    link: process.env.FRONTEND_URL + params.link,
                    button: params.button,
                    subject: params.title
                },
            });
            return res;
        } catch (error) {
            // If sending the email fails, don't create the user
            throw new Error("Email sending failed: " + error.message);
        }
    }
};

export default NotificationService;