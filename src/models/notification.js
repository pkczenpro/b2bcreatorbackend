import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: { type: String, required: false },
    link: { type: String },
    isRead: { type: Boolean, default: false },
}, { timestamps: true });

const Notification = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

export default Notification;
