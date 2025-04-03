import campaign from "../models/campaign.js";
import CampaignService from "../services/campaignService.js";
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
            id: campaign._id,
            title: campaign.title,
            company: campaign.brandId.name,
            image: campaign.brandId.profileImage,
            description: campaign.description,
            channels: campaign.brandId.socialMediaLinks.map(link => link.value ? link.platform : null).filter(Boolean).join(", ")
        }));

        const randomizedData = data.sort(() => Math.random() - 0.5);


        res.status(200).json(randomizedData);
    } catch (error) {
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
        res.status(200).json(campaign);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const selectCreator = async (req, res) => {
    try {
        const campaign = await CampaignService.selectCreator(req.params.campaignId, req.body);
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
        const campaign = await CampaignService.addToCampaign(req.params.campaignId, req.body);
        res.status(200).json(campaign);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

export const acceptCreator = async (req, res) => {
    try {
        const campaign = await CampaignService.acceptCreator(req.params.campaignId, req.params.creatorId, req.params.status);
        res.status(200).json(campaign);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export const submitWork = async (req, res) => {
    try {
        const campaign = await CampaignService.submitWork(req, req.params.campaignId, req.params.creatorId, req.body);
        res.status(200).json(campaign);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const acceptWork = async (req, res) => {
    try {
        const campaign = await CampaignService.acceptWork(req.params.campaignId, req.params.creatorId, req.body.contentId);
        res.status(200).json(campaign);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const generateCampaignPostContent = async (req, res) => {
    try {
        const { prompt, selectedCampaign } = req.body;

        const camp = await campaign.findById(selectedCampaign);
        if (!camp) throw new Error("Campaign not found");

        const campaignPrompt = "Generate from these few words a post about the campaign --> This is prompt from user: " + prompt + " and campaign JSON object (details of it) is: " + camp;

        const post = await generatePost(campaignPrompt);
        res.status(200).json({ post });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

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
    getCampaignAnalytics
};