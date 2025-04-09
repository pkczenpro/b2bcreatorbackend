import Notification from "../models/notification.js";

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ receiver: req.user.id }).sort({ createdAt: -1 })
      .populate("sender", "name email") // Populate sender details
      
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ receiver: req.user.id, isRead: false }, { isRead: false });
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
