// /src/utils/cronScheduler.js
import cron from 'node-cron';
import { shareLinkedIn } from "./shareLinkedIn.js";
import Campaign from './models/Campaign.js'; // Assuming you have the Campaign model

// Schedule a task to run every minute
cron.schedule('* * * * *', async () => {
    console.log('Running post scheduler every minute');

    try {
        // Find active campaigns that have scheduled posts
        const campaigns = await Campaign.find({
            status: 'active',
            scheduledPost: { $exists: true, $ne: null },
            'scheduledPost.date': { $lte: new Date() }
        });

        // Process each campaign
        for (const campaign of campaigns) {
            const scheduledPost = campaign.scheduledPost;
            const postDate = new Date(scheduledPost.date);
            const currentDate = new Date();

            if (postDate <= currentDate) {
                const linkedinToken = campaign.brandId.linkedin.access_token;
                const linkedinId = campaign.brandId.linkedin.id;
                const postContent = scheduledPost.content;
                const mediaFiles = scheduledPost.mediaFiles;

                try {
                    // Share the post to LinkedIn
                    const res = await shareLinkedIn(
                        mediaFiles,
                        linkedinToken,
                        linkedinId,
                        postContent,
                        "IMAGE"
                    );

                    console.log("Post shared successfully");
                } catch (error) {
                    console.error("Error sharing post:", error);
                }
            }
        }
    } catch (error) {
        console.error("Error fetching campaigns:", error);
    }
});
