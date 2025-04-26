import Campaign from "../models/campaign.js";

const CampaignRepository = {
    async createCampaign(campaignData) {
        return await Campaign.create(campaignData);
    },

    async findCampaignById(campaignId) {
        return await Campaign.findById(campaignId);
    },

    async findCampaignsByBrandId(brandId) {
        return await Campaign.find({ brandId });
    },

    async updateCampaign(campaignId, updateData) {
        return await Campaign.findByIdAndUpdate(campaignId, updateData, { new: true });
    },

    async deleteCampaign(campaignId) {
        return await Campaign.findByIdAndDelete(campaignId);
    },

    async getCampaignsBySelectedCreatorsId(creatorId, brandId) {
        return await Campaign.find({ "selectedCreators.creatorId": creatorId, "brandId": brandId });
    }
};

export default CampaignRepository;