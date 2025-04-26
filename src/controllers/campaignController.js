import campaign from "../models/campaign.js";
import UserRepository from "../repositories/userRepository.js";
import CampaignService from "../services/campaignService.js";
import NotificationService from "../services/notificationService.js";
import MessageService from "../services/messageService.js";
import generatePost from "../services/openAiServices.js";



export const createCampaign = async (req, res) => {
    try {
        const newCampaign = await CampaignService.createCampaign({
            ...req.body,
            brandId: req.user.id
        });
        res.status(201).json(newCampaign);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const getAllCampaigns = async (req, res) => {
    try {
        const campaigns = await CampaignService.getAllCampaigns();

        const data = campaigns
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // newest first
            .map(campaign => ({
                id: campaign?._id,
                title: campaign?.title,
                company: campaign?.brandId?.profileName || null,
                image: campaign?.brandId?.profileImage,
                description: campaign?.description,
                channels: campaign?.brandId?.socialMediaLinks
                    .map(link => link?.value ? link?.platform : null)
                    .filter(Boolean)
                    .join(", "),
                status: campaign?.status,
                category: campaign?.brandId?.category,
                participants: campaign?.selectedCreators?.length,
                budget: campaign?.budget,
                startDate: campaign?.startDate,
                endDate: campaign?.endDate,
                createdAt: campaign?.createdAt,
                updatedAt: campaign?.updatedAt,
                category: campaign?.brandId?.category,
                subCategory: campaign?.brandId?.subCategory || null,
            }));

        res.status(200).json(data); // no random shuffle
    } catch (error) {
        console.error("Error fetching campaigns:", error);
        res.status(400).json({ error: error.message });
    }
};


export const getCampaignById = async (req, res) => {
    try {
        const brandId = req.user.id;
        const campaign = await CampaignService.getCampaignById(req.params.campaignId, brandId);
        res.status(200).json(campaign);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const applyToCampaign = async (req, res) => {
    try {
        const campaign = await CampaignService.applyToCampaign(
            req,
            req.params.campaignId,
            req.user.id,
            req.body.amount
        );
        res.status(200).json(campaign);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const removeCreator = async (req, res) => {
    try {
        const campaign = await CampaignService.removeCreator(req.params.campaignId, req.params.creatorId);

        await NotificationService.sendNotification(
            req.app.get('io'),
            req.user.id,  // sender
            req.params.creatorId, // receiver
            `You've been removed from the "${campaign.title}" campaign. If you have any questions, feel free to reach out!`,
            null
        );

        res.status(200).json(campaign);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const selectCreator = async (req, res) => {
    try {
        const campaign = await CampaignService.selectCreator(req.params.campaignId, req.body);

        await NotificationService.sendNotification(
            req.app.get('io'),
            req.user.id,  // sender
            req.body.creatorId, // receiver
            `🎉 Great news! You have been selected for the campaign "${campaign.title}"`,
            "/dashboard/campaigns-details/" + req.params.campaignId,
        );

        res.status(200).json(campaign);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const updateCampaign = async (req, res) => {
    try {
        const updatedCampaign = await CampaignService.updateCampaign(req.params.campaignId, req.body);
        res.status(200).json(updatedCampaign);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const deleteCampaign = async (req, res) => {
    try {
        await CampaignService.deleteCampaign(req.params.campaignId);
        res.status(200).json({ message: "Campaign deleted successfully" });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const rateCreator = async (req, res) => {
    try {
        const { campaignId, creatorId } = req.params;
        const { rating, review } = req.body;
        const reviewerId = req.user.id; // Assuming the user is authenticated

        const updatedCreator = await CampaignService.rateCreator(campaignId, creatorId, reviewerId, rating, review);
        res.status(200).json(updatedCreator);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const getRelatedCampaigns = async (req, res) => {
    try {
        const brandId = req.user.id;
        const campaigns = await CampaignService.getRelatedCampaigns(brandId);
        res.status(200).json(campaigns);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const getRelatedCampaignsForCreator = async (req, res) => {
    try {
        const creatorId = req.params.creatorId;
        const campaigns = await CampaignService.getRelatedCampaignsForCreator(creatorId);
        res.status(200).json(campaigns);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export const addToCampaign = async (req, res) => {
    try {
        const campaign = await CampaignService.addToCampaign(req, req.params.campaignId, req.body);
        res.status(200).json(campaign);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const acceptCreator = async (req, res) => {
    try {
        const campaign = await CampaignService.acceptCreator(req.params.campaignId, req.params.creatorId, req.params.status);

        await NotificationService.sendNotification(
            req.app.get('io'),
            req.user.id,  // sender
            req.params.creatorId, // receiver
            `🎉 Great news! You have been ${req.params.status === "approved" ? "accepted" : "rejected"} for the campaign "${campaign.title}"`,
            "/dashboard/campaigns-details/" + req.params.campaignId,
        );

        // send message to creator
        await MessageService.saveMessage(
            req,
            req.user.id,
            req.params.creatorId,
            `🎉 Great news! You have been ${req.params.status === "approved" ? "accepted" : "rejected"} for the campaign "${campaign.title}"`,
        );

        // send using i

        res.status(200).json(campaign);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export const submitWork = async (req, res) => {
    try {
        const campaign = await CampaignService.submitWork(req, req.params.campaignId, req.params.creatorId, req.body);
        if (campaign?.error_code === 400) {
            return res.status(200).json(campaign);
        }
        res.status(200).json(campaign);
    } catch (error) {
        console.error("Error submitting work:", error);
        res.status(500).json({ error: error.message });
    }
}

export const acceptWork = async (req, res) => {
    try {
        const campaign = await CampaignService.acceptWork(req.params.campaignId, req.params.creatorId, req.body.contentId);

        await NotificationService.sendNotification(
            req.app.get('io'),
            req.user.id,  // sender
            req.params.creatorId, // receiver
            `🎉 Great news! Your work for the campaign "${campaign.title}" has been accepted`,
            "/dashboard/campaigns-details/" + req.params.campaignId,
        );

        await MessageService.saveMessage(
            req,
            req.user.id,
            req.params.creatorId,
            `🎉 Great news! Your work for the "${campaign.title}" campaign has been accepted by the brand and shared on LinkedIn!`,
        );

        res.status(200).json(campaign);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const generateCampaignPostContent = async (req, res) => {
    try {
        const { prompt, selectedCampaign, hookType, selectedProduct, brandName } = req.body;

        // const brandName = brand.name;

        // Generate a post using the selected hook idea and campaign details
        const campaignPrompt = `Generate a LinkedIn post using the following details:
        - User Prompt: ${prompt}
        - Selected Hook Type: ${hookType}
        - Product Details: ${selectedProduct}
        - Make sure the post is not more than 300 words and is tailored for LinkedIn to drive awareness for the ${brandName} brand.
        - Add emojies to make it more engaging.
        - Today's date is ${new Date().toLocaleDateString()}
        
           
        `;

        const post = await generatePost(campaignPrompt);

        res.status(200).json({ post });
    } catch (error) {
        console.log("Error generating campaign post content:", error);
        res.status(400).json({ error: error.message });
    }
};

export const getLinkedInAnalytics = async (req, res) => {
    try {
        const contentId = req.params.contentId;
        const analytics = await CampaignService.getLinkedInAnalytics(req, contentId);
        res.status(200).json(analytics);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export const getCampaignAnalytics = async (req, res) => {
    try {
        const campaignId = req.params.campaignId;
        const analytics = await CampaignService.getCampaignAnalytics(req, campaignId);
        res.status(200).json(analytics);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

const generateSection = async (label, input, today, defaultText) => {
    const prompt = `
You are an AI assistant generating only the "${label}" text for a LinkedIn carousel.

${label === "title" ? `For the title, create an engaging hook that:
- Starts with a surprising fact, question, or bold statement
- Creates curiosity and makes people want to read more
- Uses power words and emotional triggers
- Is concise and impactful
- Maximum 40 characters
- Include relevant emojis to make it more engaging

Example hooks:
"🚀 90% of startups fail because of this..."
"💡 The secret to viral content? It's not what you think"
"🔥 Stop wasting time on social media! Here's why..."` : ''}

Respond with ONLY the "${label}" content as a plain string. No quotes, no formatting, no explanations.

INPUT:
- User Prompt: ${input}
- input name: ${defaultText}
`

    const rawResponse = await generatePost(prompt);

    // Clean the response in case there are extra quotes or whitespace
    return rawResponse.trim().replace(/^"(.*)"$/, '$1');
};

export const generateCarouselMakerContent = async (req, res) => {
    const { aiPrompt } = req.body;

    if (!aiPrompt) {
        return res.status(400).json({ error: "Missing required 'aiPrompt'" });
    }

    try {
        const today = new Date().toLocaleDateString();

        const [topic, title, tagline, button] = await Promise.all([
            generateSection("topic", aiPrompt, today, "Create a short, impactful topic that sets the stage for the carousel. Maximum 10 characters. Make it intriguing and relevant to the content."),
            generateSection("title", aiPrompt, today, "Create an attention-grabbing hook that makes people stop scrolling. Use power words, questions, or surprising facts. Maximum 40 characters. Include relevant emojis."),
            generateSection("tagline", aiPrompt, today, "Write a compelling tagline that builds on the hook and creates curiosity. Use emotional triggers and make it personal. Maximum 20 characters."),
            generateSection("button", aiPrompt, today, "Create a clear, action-oriented button text that encourages engagement. Maximum 5 characters. Use words like 'Read', 'Learn', 'See', 'Try'."),
        ]);

        res.status(200).json({
            editableTopic: topic,
            editableTitle: title,
            editableTagline: tagline,
            editableButton: button,
        });

    } catch (error) {
        console.error("Error generating content:", error);
        res.status(500).json({ error: error.message || "Internal Server Error" });
    }
};


export const schedulePost = async (req, res) => {
    try {
        const scheduledPost = await CampaignService.schedulePost(req, res);
        res.status(200).json(scheduledPost);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export const hideCampaign = async (req, res) => {
    try {
        const campaign = await CampaignService.hideCampaign(req.params.campaignId);
        res.status(200).json(campaign);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}


export default {
    createCampaign,
    getAllCampaigns,
    getCampaignById,
    applyToCampaign,
    removeCreator,
    selectCreator,
    updateCampaign,
    deleteCampaign,
    rateCreator,
    getRelatedCampaigns,
    addToCampaign,
    getRelatedCampaignsForCreator,
    acceptCreator,
    submitWork,
    generateCampaignPostContent,
    acceptWork,
    getLinkedInAnalytics,
    getCampaignAnalytics,
    generateCarouselMakerContent,
    schedulePost,
    hideCampaign
};