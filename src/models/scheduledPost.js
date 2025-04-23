import mongoose from "mongoose";

const scheduledPostSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    scheduledDate: { type: Date, required: true },
    status: { type: String, required: true, default: "pending" },
    textContent: { type: String, required: false },
    files: [{ type: String }],
    type: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    label: { type: String, required: false },
});

const ScheduledPost = mongoose.model("ScheduledPost", scheduledPostSchema);

export default ScheduledPost;