// /src/utils/cronScheduler.js
import cron from 'node-cron';
import ScheduledPost from '../models/scheduledPost.js'; // adjust path as needed
import { shareLinkedIn } from './shareLinkedIn.js';
import Notification from '../models/notification.js';
// Run every 30second
cron.schedule('* * * * *', async () => {
    console.log('⏰ Running scheduled post check...');

    try {
        // Find scheduled posts that are due and not yet posted
        const duePosts = await ScheduledPost.find({
            scheduledDate: { $lte: new Date() },
            status: "pending"
        }).populate('userId');
        if (duePosts.length === 0) {
            console.log('No scheduled posts due at this time');
            return;
        }
        for (const post of duePosts) {
            const user = post.userId;
            // Skip if user doesn't have LinkedIn connected
            if (!user?.linkedin?.access_token || !user?.linkedin?.id) {
                console.warn(`⚠️ Skipping user ${user?._id}: LinkedIn not connected`);
                continue;
            }

            try {
                const res = await shareLinkedIn(
                    post.files || [],
                    user.linkedin.access_token,
                    user.linkedin.id,
                    post.textContent,
                    'IMAGE'
                );

                // Mark as posted
                post.status = "posted";
                await post.save();

                await Notification.create({
                    sender: user._id,
                    receiver: user._id,
                    message: "Your scheduled post has been shared successfully",
                    link: `/campaigns/${post._id}`,
                });

                console.log(`✅ Post shared successfully for user ${user._id}`);
            } catch (err) {
                console.error(`❌ Failed to post for user ${user._id}:`, err.message);
            }
        }
    } catch (err) {
        console.error('❌ Error in cron job:', err.message);
    }
});
