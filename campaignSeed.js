import mongoose from "mongoose";
import dotenv from "dotenv";
import { faker } from "@faker-js/faker";
import User from "./src/models/User.js";
import campaign from "./src/models/campaign.js";


dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("MongoDB Connected"))
    .catch((err) => console.error(err));

// YOUR CAMPAIGN ID HERE
const CAMPAIGN_ID = "67f405cb91053314f4ebe014"; // <-- put your campaign id

// Function to add creators to the campaign
const addCreatorsToCampaign = async () => {
    try {
        // Fetch creators
        const creators = await User.find({ userType: "creator" }).limit(20); // Fetch 5 random creators (you can adjust)

        if (!creators.length) {
            console.log("No creators found.");
            mongoose.connection.close();
            return;
        }

        const randomMOnthNumber = faker.number.int({ min: 1, max: 12 });

        const randomDate = new Date(
            faker.date.past(randomMOnthNumber, new Date())
        );

        // Prepare selectedCreators data
        const selectedCreators = creators.map((creator) => ({
            creatorId: creator._id,
            status: faker.helpers.arrayElement(
                ["pending", "approved", "rejected", "done", "prospect", "content_submitted"]
            ),
            amount: faker.number.int({ min: 100, max: 1000 }),
            approved: faker.datatype.boolean(),
            createDate: randomDate,
            updatedAt: new Date(),
        }));

        // Update campaign
        const updatedCampaign = await campaign.findByIdAndUpdate(
            CAMPAIGN_ID,
            { $push: { selectedCreators: { $each: selectedCreators } } },
            { new: true }
        );

        console.log("Campaign updated successfully:", updatedCampaign);
        mongoose.connection.close();
    } catch (err) {
        console.error("Error updating campaign:", err);
        mongoose.connection.close();
    }
};

// Run the function
addCreatorsToCampaign();
