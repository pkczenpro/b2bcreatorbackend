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
    }
};

export default UserRepository;