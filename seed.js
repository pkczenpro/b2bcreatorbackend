import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/user.js";
import Product from "./src/models/product.js";
import Campaign from "./src/models/campaign.js";
import Message from "./src/models/message.js";
import Invoice from "./src/models/invoice.js";
import Notification from "./src/models/notification.js";
import ScheduledPost from "./src/models/scheduledPost.js";

dotenv.config();

const flushDBPreservingUsers = async () => {
    const excludedUserIds = [
        "680aa2d6040ce9a7aa52192d",
        "67e679d85250b70adfe252aa",
        "67ea69317d5d16fdbae9960a",
        "6819d0be749adb17d762c270",
        "67dfd4c998ec7b91dc8d0fdc",
        "67f82cfec24c574e8e15e395",
        "682783c11e11d28c9bf73528",
        "67e67bfc5250b70adfe25bc1"
    ];

    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        const excludedObjectIds = excludedUserIds.map(id => new mongoose.Types.ObjectId(id));

        // Delete all users EXCEPT the excluded ones
        await User.deleteMany({ _id: { $nin: excludedObjectIds } });

        // Delete all products and campaigns
        await Product.deleteMany({
            brandId: { $nin: excludedObjectIds }
        });

        await Message.deleteMany({});
        await Invoice.deleteMany({});
        await Notification.deleteMany({});
        await ScheduledPost.deleteMany({});
        await Campaign.deleteMany({});



        console.log("Database flushed, preserved specified users.");

        await mongoose.disconnect();
    } catch (err) {
        console.error("Error flushing database:", err);
        await mongoose.disconnect();
    }
};

flushDBPreservingUsers();
