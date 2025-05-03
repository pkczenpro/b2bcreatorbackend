import mongoose from "mongoose";
import Campaign from "../models/campaign.js";
import User from "../models/user.js";
import { shareLinkedIn } from "../utils/shareLinkedIn.js";
import NotificationService from "./notificationService.js";
import ScheduledPost from "../models/scheduledPost.js";
import campaign from "../models/campaign.js";
import product from "../models/product.js";
import campaignRepository from "../repositories/campaignRepository.js";
import user from "../models/user.js";
import Invoice from "../models/invoice.js";
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
        return await Campaign.find(filter).populate("brandId", "name profileName email profileImage socialMediaLinks category subCategory");
    },

    async getRelatedCampaigns(brandId) {
        return await Campaign.find({ brandId });
    },

    async getRelatedCampaignsForCreator(creatorId) {
        return await Campaign.find({
            selectedCreators: {
                $elemMatch: {
                    creatorId: creatorId,
                    status: { $ne: "prospect" }
                }
            }
        });
    },

    async getRelatedProducts(campaignId) {
        const brandId = await campaignRepository.findCampaignById(campaignId);
        const brand = await user.findById(brandId.brandId);

        const brandName = brand.profileName;

        const products = await product.find({ brandId: brandId.brandId });

        return {
            products: products,
            brandName: brandName,
        };
    },

    /**
     * Get a single campaign by ID
     */
    async getCampaignById(campaignId, brandId) {
        const campaign = await Campaign.findById(campaignId)
            .populate("brandId", "profileName email")
            .populate("selectedCreators.creatorId", "name email profileImage reviews");

        const isOwner = campaign.brandId._id.toString() === brandId.toString();
        const isApplied = campaign.selectedCreators.some(
            (c) => c.creatorId?._id?.toString() === brandId?.toString()
        );
        const userCampaignStatus = campaign.selectedCreators.find(
            (c) => c.creatorId?._id?.toString() === brandId?.toString()
        )?.status;

        // 🔍 Filter each creator's reviews to only include ones for this campaign
        const selectedCreatorsWithFilteredReviews = campaign.selectedCreators.map((creatorObj) => {
            const filteredReviews = (creatorObj.creatorId?.reviews || []).filter(
                (review) => review.campaignId.toString() === campaignId.toString()
            );

            return {
                ...creatorObj._doc,
                creatorId: {
                    ...creatorObj.creatorId._doc,
                    reviews: filteredReviews,
                },
            };
        });

        return {
            ...campaign._doc,
            isOwner,
            isApplied,
            status: userCampaignStatus,
            selectedCreators: selectedCreatorsWithFilteredReviews,
        };
    }
    ,

    /**
     * Apply for a campaign as a creator
     */
    async applyToCampaign(req, campaignId, creatorId, amount) {
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

        // Check if creator is already selected
        await NotificationService.sendNotification(
            req.app.get('io'),
            req.user.id,  // sender
            campaign.brandId, // receiver
            `A new creator has applied to your campaign: ` + campaign.title,
            "/dashboard/campaigns-details/" + campaignId,
        );

        return campaign;
    },

    async addToCampaign(req, campaignId, creatorData) {
        const { creatorId, amount, status = "approved" } = creatorData;


        if (!mongoose.Types.ObjectId.isValid(campaignId)) {
            throw new Error("Invalid Campaign ID");
        }

        const campaign = await Campaign.findById(campaignId);
        if (!campaign) throw new Error("Campaign not found");

        // Check if the creator is already added
        const alreadyAdded = campaign.selectedCreators.some(
            (c) => c.creatorId.toString() === creatorId.toString()
        );
        if (alreadyAdded) throw new Error("Creator is already added");

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

        // Find the creator i   n the selectedCreators list
        const selectedCreator = campaign.selectedCreators.find(
            (c) => c.creatorId._id.toString() === creatorId
        );
        if (!selectedCreator) throw new Error("Creator is not selected for this campaign");

        selectedCreator.status = "approved";
        selectedCreator.approved = true;

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


        if (isCampaign) {
            // Check if campaign exists
            const campaign = await Campaign.findById(campaignId);
            if (!campaign) throw new Error("Campaign not found");

            // Find the creator in the selectedCreators list
            const selectedCreator = campaign.selectedCreators.find(
                (c) => c.creatorId?.toString() === creatorId
            );
            if (!selectedCreator) throw new Error("Creator is not selected for this campaign");

            selectedCreator.status = "content_submitted";

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
                "/dashboard/campaigns-details/" + campaignId,
            );

            // Send notification to the brand
            await NotificationService.sendNotification(
                req.app.get('io'),
                req.user.id,  // sender
                campaign.brandId, // receiver
                `The creator "${user.name}" has submitted their work for the campaign "${campaign.title}"`,
                "/dashboard/campaigns-details/" + campaignId,
            );
        }

        if (isIndependent) {
            const linkedinToken = user.linkedin.access_token;
            const linkedinId = user.linkedin.id;
            await shareLinkedIn(
                imageFiles,
                linkedinToken,
                linkedinId,
                content.content,
                "IMAGE"
            );
        }


        return {
            message: "Post shared successfully",
        };
    },

    async acceptWork(campaignId, creatorId, postId) {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) throw new Error("Campaign not found");

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

        post.urnli = res?.id || null; 
        post.url = "https://www.linkedin.com/embed/feed/update/" + res?.id || null;
        post.type = "AI Text Creator";
        selectedCreator.status = "done";

        // Create invoice
        const newInvoice = await Invoice.create({
            brandId: campaign.brandId,
            invoiceNumber: `INV-${Date.now()}-${campaignId}`,
            dateIssued: new Date(),
            creatorId: selectedCreator.creatorId,
            items: [
                {
                    description: `Campaign: ${campaign.title}`,
                    quantity: 1,
                    price: selectedCreator.amount,
                    total: selectedCreator.amount,
                    files: post.files,
                    content: post.content,
                },
            ],
            totalAmount: selectedCreator.amount,
            status: "pending",
        });

        // Attach invoice ID to the post
        selectedCreator.invoiceId = newInvoice._id;

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
            const campaign = await Campaign.findById(campaignId)
                .populate("brandId", "name email profileImage socialMediaLinks")
                .populate("selectedCreators.creatorId", "name email profileImage");
            if (!campaign) {
                throw new Error("Campaign not found");
            }

            const analytics = {
                totalContent: campaign.selectedCreators.length,
                contentDistribution: this.getContentDistribution(campaign.selectedCreators),
                contentCountByType: this.getContentCountByType(campaign.selectedCreators),
            };

            return { campaign, analytics };
        }
        catch (ex) {
            console.log(ex);
            throw new Error("Campaign not found");
        }
    },

    getContentDistribution(selectedCreators) {
        const monthData = {};

        selectedCreators.forEach(creator => {
            console.log(creator.createDate);
            const month = new Date(creator.createDate).toLocaleString('default', { month: 'long', year: 'numeric' });
            console.log(month);
            if (!monthData[month]) {
                monthData[month] = 0;
            }

            monthData[month] += 1;
        });

        return Object.keys(monthData).map(month => ({
            label: month,
            count: monthData[month]
        }));
    },

    getContentCountByType(selectedCreators) {
        const statusData = {};

        selectedCreators.forEach(creator => {
            const status = creator.status;

            if (!statusData[status]) {
                statusData[status] = 0;
            }

            statusData[status] += 1;
        });

        return Object.keys(statusData).map(status => ({
            label: status,
            count: statusData[status]
        }));
    },

    async schedulePost(req, res) {
        try {
            const { textContent, type, scheduledDate, label } = req.body;
            const userId = req.user.id;
            const imageFiles = req.files?.["images"] || [];

            // Basic validation
            if (!textContent && imageFiles.length === 0) {
                throw new Error("Text content or images are required.");
            }

            // if (!scheduledDate || new Date(scheduledDate) <= new Date()) {
            //     throw new Error("Scheduled date must be in the future.");
            // }

            const user = await User.findById(userId);
            if (!user?.linkedin?.access_token) {
                throw new Error("Creator has not linked their LinkedIn account.");
            }

            // Create scheduled post
            const scheduledPost = await ScheduledPost.create({
                userId,
                textContent,
                files: imageFiles.map(file => "/uploads/" + file.filename),
                type,
                scheduledDate,
                label
            });

            // Assign random color to calendar entry
            const randomColors = ["#0078d4", "#0094ff", "#00b5ff", "#00d5ff", "#00f5ff"];
            const color = randomColors[Math.floor(Math.random() * randomColors.length)];

            // Push to user's calendar
            await User.findByIdAndUpdate(userId, {
                $push: {
                    calendar: {
                        title: label,
                        date: scheduledDate,
                        color,
                        type,
                        status: "pending",
                        postId: scheduledPost._id,
                    }
                }
            });

            return scheduledPost;
        } catch (err) {
            console.error("Error scheduling post:", err);
            throw new Error("Failed to schedule post");
        }
    },

    async hideCampaign(campaignId) {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            throw new Error('Campaign not found');
        }
        const newStatus = !campaign.visibility;
        return await Campaign.findByIdAndUpdate(
            campaignId,
            { visibility: newStatus },
            { new: true }
        );
    },

    async updateCreatorAmount(req, campaignId, creatorId, amount) {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) throw new Error("Campaign not found");

        // Find the creator in the selectedCreators list
        const selectedCreator = campaign.selectedCreators.find(
            (c) => c.creatorId.toString() === creatorId
        );

        console.log(selectedCreator);

        if (!selectedCreator) throw new Error("Creator is not selected for this campaign");

        selectedCreator.amount = Number(amount);
        await campaign.save();

        await NotificationService.sendNotification(
            req.app.get('io'),
            req.user.id,  // sender
            creatorId, // receiver
            `Your amount has been updated for the campaign: ` + campaign.title + " to " + amount + "$",
            "/dashboard/campaigns-details/" + campaignId,
        );
    }
};

export default CampaignService;
