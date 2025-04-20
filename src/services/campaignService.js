import mongoose from "mongoose";
import Campaign from "../models/campaign.js";
import User from "../models/user.js";
import { shareLinkedIn } from "../utils/shareLinkedIn.js";
import NotificationService from "./notificationService.js";
const ObjectId = mongoose.Types.ObjectId;

const CampaignService = {
    /**
     * Create a new campaign
     */
    async createCampaign(campaignData) {

        return await Campaign.create(campaignData);
    },

    /**
     * Get all campaigns (with optional filtering)
     */
    async getAllCampaigns(filter = {}) {
        return await Campaign.find(filter).populate("brandId", "name email profileImage socialMediaLinks");
    },

    async getRelatedCampaigns(brandId) {
        return await Campaign.find({ brandId });
    },

    async getRelatedCampaignsForCreator(creatorId) {
        return await Campaign.find({ "selectedCreators.creatorId": creatorId });
    },

    /**
     * Get a single campaign by ID
     */
    async getCampaignById(campaignId, brandId) {
        console.log(campaignId);
        const campaign = await Campaign.findById(campaignId)
            .populate("brandId", "name email")
            .populate("selectedCreators.creatorId", "name email profileImage");
        const isOwner = campaign.brandId._id.toString() === brandId.toString();
        return {
            ...campaign._doc,
            isOwner,
        };
    },

    /**
     * Apply for a campaign as a creator
     */
    async applyToCampaign(campaignId, creatorId, amount) {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) throw new Error("Campaign not found");

        // Check if creator already applied
        const alreadyApplied = campaign.selectedCreators.some(
            (c) => c.creatorId.toString() === creatorId
        );
        if (alreadyApplied) throw new Error("Creator already applied to this campaign");


        campaign.selectedCreators.push({
            creatorId: creatorId,
            status: "pending",
            amount: amount || 0,
            createDate: new Date(),
        });

        await campaign.save();
        return campaign;
    },

    async addToCampaign(req, campaignId, creatorData) {
        const { creatorId, amount, status = "prospect" } = creatorData;


        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            throw new Error("Invalid Campaign ID");
        }
        // console.log(campaignId);
        const campaign = await Campaign.findById(campaignId);
        console.log(creatorId);
        if (!campaign) throw new Error("Campaign not found");

        // Check if the creator is already added
        // const alreadyAdded = campaign.selectedCreators.some(
        //     (c) => c.creatorId.toString() === creatorId.toString()
        // );
        // if (alreadyAdded) throw new Error("Creator is already added");

        // Add creator
        campaign.selectedCreators.push({ creatorId, amount, status });
        await campaign.save();

        await NotificationService.sendNotification(
            req.app.get('io'),
            req.user.id,  // sender
            creatorId, // receiver
            `You have been added to a campaign: ` + campaign.title,
            "/dashboard/campaigns-details/" + campaignId,
        );

        return campaign;
    },

    /** 
    * Remove a creator from a campaign
    */
    async removeCreator(campaignId, creatorId) {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) throw new Error("Campaign not found");

        // Check if the creator is selected
        const creatorObjectId = new ObjectId(creatorId);
        const selectedCreator = campaign.selectedCreators.find(
            (c) => c.creatorId.toString() === creatorObjectId.toString()
        );
        if (!selectedCreator) throw new Error("Creator is not selected for this campaign");

        // Remove creator
        campaign.selectedCreators = campaign.selectedCreators.filter(
            (c) => c.creatorId.toString() !== creatorObjectId.toString()
        );


        await campaign.save();
        return campaign;
    },


    /**
     * Select a creator for a campaign
     */
    async selectCreator(campaignId, creatorData) {
        const { creatorId, amount, status = "active" } = creatorData;

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) throw new Error("Campaign not found");

        // Check if the creator is already selected
        const alreadySelected = campaign.selectedCreators.some(
            (c) => c.creatorId.toString() === creatorId
        );

        if (alreadySelected) throw new Error("Creator is already selected");

        // Add creator
        campaign.selectedCreators.push(
            { creatorId, amount, status }
        );
        await campaign.save();
        return campaign;
    },

    /**
     * Update a campaign
     */
    async updateCampaign(campaignId, updates) {
        return await Campaign.findByIdAndUpdate(campaignId, updates, { new: true });
    },

    /**
     * Delete a campaign
     */
    async deleteCampaign(campaignId) {
        return await Campaign.findByIdAndDelete(campaignId);
    },

    /**
     * rate a creator
     */
    async rateCreator(campaignId, creatorId, reviewerId, rating, review) {
        if (rating < 1 || rating > 10) {
            throw new Error("Rating must be between 1 and 5");
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) throw new Error("Campaign not found");

        // Find the creator in the selectedCreators list
        const selectedCreator = campaign.selectedCreators.find(
            (c) => c.creatorId.toString() === creatorId
        );
        if (!selectedCreator) throw new Error("Creator is not selected for this campaign");

        // // Check if campaign is completed
        if (selectedCreator.status !== "done") {
            throw new Error("Campaign is not completed yet");
        }

        // Fetch the creator's profile
        const creator = await User.findById(creatorId);
        if (!creator) throw new Error("Creator not found");

        // Check if reviewer has already rated the creator in this campaign
        console.log(creator.reviews);
        const alreadyReviewed = creator.reviews.find(
            (r) => r.reviewerId.toString() === reviewerId && r.campaignId?.toString() === campaignId
        );
        if (alreadyReviewed) throw new Error("You have already rated this creator for this campaign");

        // Add review and rating
        creator.reviews.push({ reviewerId, review, rating, campaignId });

        // Save changes
        await creator.save();
        return creator;
    },

    async acceptCreator(campaignId, creatorId, status) {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) throw new Error("Campaign not found");

        // Find the creator in the selectedCreators list
        const selectedCreator = campaign.selectedCreators.find(
            (c) => c.creatorId.toString() === creatorId
        );
        if (!selectedCreator) throw new Error("Creator is not selected for this campaign");

        // Update status
        if (status === "approved") {
            selectedCreator.approved = true;
        } else if (status === "rejected") {
            selectedCreator.approved = false;
        }

        await campaign.save();
        return campaign;
    },

    async submitWork(req, campaignId, creatorId, content) {
        // type, url, content, images, video
        if (!req.files["images"] && content.content === "") {
            throw new Error("A content or images are required");
        }
        const imageFiles = req.files["images"];



        const user = await User.findById(creatorId);
        if (!user) throw new Error("Creator not found");


        //todo frontend part if no access token redirect to get linkedin token
        if (user?.linkedin?.access_token === null || user?.linkedin?.access_token === undefined) {
            return {
                message: "Creator has not linked their LinkedIn account",
                error_code: 400,
            };
        }

        const isCampaign = req.body.isCampaign === "1";
        const isIndependent = req.body.isCampaign === "0";

        if (!isCampaign && !isIndependent) {
            throw new Error("Invalid post sharing type");
        }

        if (isCampaign) {
            // Check if campaign exists
            const campaign = await Campaign.findById(campaignId);
            if (!campaign) throw new Error("Campaign not found");

            // Find the creator in the selectedCreators list
            const selectedCreator = campaign.selectedCreators.find(
                (c) => c.creatorId?.toString() === creatorId
            );
            if (!selectedCreator) throw new Error("Creator is not selected for this campaign");

            if (selectedCreator.content.length > 0) {
                throw new Error("Content already submitted content for this campaign");
            }

            // Add content
            selectedCreator.content.push({
                type: content.type,
                url: content.url || null,
                content: content.content,
                files: imageFiles ? imageFiles.map((file) =>
                    "/uploads/" + file.filename
                ) : [],
            });

            await campaign.save();


            await NotificationService.sendNotification(
                req.app.get('io'),
                req.user.id,  // sender
                req.params.creatorId, // receiver
                `You have submitted your work for the campaign "${campaign.title}"`,
                "/dashboard/campaigns",
            );

            // Send notification to the brand
            await NotificationService.sendNotification(
                req.app.get('io'),
                req.user.id,  // sender
                campaign.brandId, // receiver
                `The creator "${user.name}" has submitted their work for the campaign "${campaign.title}"`,
                "/dashboard/campaigns",
            );
        }

        if (isIndependent) {
            const linkedinToken = user.linkedin.access_token;
            const linkedinId = user.linkedin.id;
            const res = await shareLinkedIn(
                imageFiles,
                linkedinToken,
                linkedinId,
                content.content,
                "image"
            );

            console.log("RESULT: _______")
            console.log(res);
        }


        return {
            message: "Post shared successfully",
        };
    },

    async acceptWork(campaignId, creatorId, postId) {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) throw new Error("Campaign not found");

        // Find the creator in the selectedCreators list
        const selectedCreator = campaign.selectedCreators.find(
            (c) => c.creatorId.toString() === creatorId
        );

        const user = await User.findById(creatorId);
        if (!user) throw new Error("Creator not found");

        const linkedinToken = user.linkedin.access_token;
        const linkedinId = user.linkedin.id;

        if (!selectedCreator) throw new Error("Creator is not selected for this campaign");
        const post = selectedCreator.content.find((c) => c._id.toString() === postId);

        if (!post) throw new Error("Content not found");
        const res = await shareLinkedIn(
            post.files,
            linkedinToken,
            linkedinId,
            post.content,
            "IMAGE"
        );

        post.urnli = res.id;
        post.url = "https://www.linkedin.com/embed/feed/update/" + res.id;
        post.type = "ai_text_creator";
        // Update status
        selectedCreator.status = "done";
        await campaign.save();
        return campaign;
    },


    async getLinkedInAnalytics(req, contentId) {

        const user_id = req.user.id;
        const user = await User.findById(user_id);
        const accessToken = user?.linkedin?.access_token;

        if (!accessToken) {
            return { message: "LinkedIn access token not found", error_code: 400 };
        }

        const apiUrl = `https://api.linkedin.com/rest/reactions/${contentId}`;
        const response = await fetch(apiUrl, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
                "X-Restli-Protocol-Version": "2.0.0",
                "LinkedIn-Version": "202503",
            },
        });

        const responseData = await response.json();

        if (response.ok) {
            return responseData;
        } else {
            console.error("LinkedIn Analytics Error:", responseData);
            return { message: "Failed to get LinkedIn analytics", error: responseData };
        }
    },

    async getCampaignAnalytics(req, campaignId) {
        try {
            // const userId = req.user.id;

            // Check if the user is a brand
            // const user = await User.findById(userId);
            // if (!user || user.userType !== "brand") {
            //     throw new Error("Unauthorized access");
            // }

            console.log(campaignId);
            const campaign = await Campaign.findById(campaignId)
                .populate("brandId", "name email profileImage socialMediaLinks")
                .populate("selectedCreators.creatorId", "name email profileImage");
            console.log(campaign);
            if (!campaign) {
                throw new Error("Campaign not found");
            }

            const analytics = {
                totalCreators: campaign.selectedCreators.length,
                completedCreators: campaign.selectedCreators.filter(
                    (c) => c.status === "done"
                ).length,
                pendingCreators: campaign.selectedCreators.filter(
                    (c) => c.status === "pending"
                ).length,
                rejectedCreators: campaign.selectedCreators.filter(
                    (c) => c.status === "rejected"
                ).length,
                totalContent: campaign.selectedCreators.reduce(
                    (acc, creator) => acc + creator.content.length,
                    0
                ),
            };

            return { campaign, analytics };
        }
        catch (ex) {
            console.log(ex);
            throw new Error("Campaign not found");
        }
    },
};

export default CampaignService;
