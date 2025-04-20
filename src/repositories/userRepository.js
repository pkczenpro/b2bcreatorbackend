import Message from "../models/message.js";
import User from "../models/user.js";

const UserRepository = {
    async createUser(userData) {
        return await User.create(userData);
    },

    async findUserById(userId) {
        return await User.findById(userId);
    },

    async findUserByEmail(email) {
        return await User.findOne({ email });
    },

    async updateUser(userId, updateData) {
        return await User.findByIdAndUpdate(userId, updateData, { new: true });
    },

    async deleteUser(userId) {
        return await User.findByIdAndDelete(userId);
    },

    async findUsersByType(userType) {
        console.log("Finding users by type:", userType); // Debugging
        return await User.find({ userType });
    },

    async findUserByVerificationToken(verificationToken) {
        return await User.findOne({
            verificationToken,
            verificationTokenExpires: { $gt: new Date() },
        });
    },

    async findUnReadMessages(userId) {
        const unreadMessages = await Message.find({
            receiver: userId,
            isRead: false,
        }).populate("sender", "profileName profileImage");
        return unreadMessages;
    },

    async createDraft(userId, draftData) {
        return await User.findByIdAndUpdate(userId, { $push: { drafts: draftData } }, { new: true });
    },

    async findDraftsByUserId(userId) {
        return await User.findById(userId).select("drafts");
    },

    async deleteDraft(draftId, userId) {
        return await User.findByIdAndUpdate(userId, { $pull: { drafts: { _id: draftId } } }, { new: true });
    },

    async updateDraft(draftId, userId, draftData) {
        return await User.findByIdAndUpdate(userId, { $set: { "drafts.$[draft]": draftData } }, { arrayFilters: [{ "draft._id": draftId }] });
    },
};

export default UserRepository;