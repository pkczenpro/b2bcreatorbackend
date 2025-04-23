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
        const data = campaigns.map(campaign => ({
            id: campaign?._id,
            title: campaign?.title,
            company: campaign?.brandId?.name || null,
            image: campaign?.brandId?.profileImage,
            description: campaign?.description,
            channels: campaign?.brandId?.socialMediaLinks.map(link => link?.value ? link?.platform : null).filter(Boolean).join(", ")
        }));

        const randomizedData = data.sort(() => Math.random() - 0.5);


        res.status(200).json(randomizedData);
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
            `You've been removed from the “${campaign.title}” campaign. If you have any questions, feel free to reach out!`,
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
            `🎉 Great news! Your work for the “${campaign.title}” campaign has been accepted by the brand and shared on LinkedIn!`,
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

export const generateCarouselMakerContent = async (req, res) => {
    const {
        aiPrompt,
        editableTopic,
        editableTitle,
        editableTagline,
        editableButton,
    } = req.body;

    if (!aiPrompt || !editableTopic || !editableTitle || !editableTagline || !editableButton) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const today = new Date().toLocaleDateString();

        const prompt = `
You are an AI assistant for generating LinkedIn content blocks.

Based on the following user input, generate a JSON response with:
- topic
- title
- tagline
- button

Do NOT include any explanations or text before or after the JSON.

INPUT:
- User Prompt: ${aiPrompt}
- Topic: ${editableTopic}
- Title: ${editableTitle}
- Tagline: ${editableTagline}
- Button: ${editableButton}
- Date: ${today}

FORMAT:
{
  "topic": "string",
  "title": "string",
  "tagline": "string",
  "button": "string"
}
`;

        const rawResponse = await generatePost(prompt);

        let data;
        try {
            const jsonStart = rawResponse.indexOf('{');
            const jsonEnd = rawResponse.lastIndexOf('}') + 1;
            const jsonString = rawResponse.substring(jsonStart, jsonEnd);
            data = JSON.parse(jsonString);
        } catch (parseError) {
            console.error("JSON parse error:", parseError, "Raw response:", rawResponse);
            return res.status(500).json({ error: "Invalid JSON response from content generator" });
        }

        res.status(200).json({
            editableTopic: data.topic,
            editableTitle: data.title,
            editableTagline: data.tagline,
            editableButton: data.button,
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
    schedulePost
};