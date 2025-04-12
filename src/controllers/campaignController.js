import campaign from "../models/campaign.js";
import user from "../models/user.js";
import productRepository from "../repositories/productRepository.js";
import UserRepository from "../repositories/userRepository.js";
import CampaignService from "../services/campaignService.js";
import NotificationService from "../services/notificationService.js";
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
            `You have been removed from the campaign "${campaign.title}"`,
            "/dashboard/campaigns",
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
            `You have been selected for the campaign "${campaign.title}"`,
            "/dashboard/campaigns",
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
            `You have been ${req.params.status === "approved" ? "accepted" : "rejected"} for the campaign "${campaign.title}"`,
            "/dashboard/campaigns",
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
            return res.status(400).json({ error: campaign?.message });
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
            `Your work for the campaign "${campaign.title}" has been accepted`,
            "/dashboard/campaigns",
        );

        res.status(200).json(campaign);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
export const generateCampaignPostContent = async (req, res) => {
    try {
        const { prompt, selectedCampaign, hookType } = req.body;

        const camp = await campaign.findById(selectedCampaign);
        if (!camp) throw new Error("Campaign not found");

        const brand = await UserRepository.findUserById(camp.brandId);
        if (!brand) throw new Error("Brand not found");

        const brandName = brand.name;


        // Generate ideas based on hook types for dynamic brand name
        let hookIdeas = {
            "Trending and Timely Hook": [
                `Why HR leaders are choosing ${brandName} Assessment in 2025 – the most trusted tool for recruitment in an AI-driven world.`,
                `The latest trend in employee assessments – discover how ${brandName} Assessment is reshaping talent acquisition.`,
                `In today’s hiring landscape, ${brandName} Assessment is a game-changer. Here's why you need to know about it.`
            ],
            "Value Driven Hook": [
                `Save time and hire the right talent faster with ${brandName} Assessment – the ultimate hiring tool for smarter decisions.`,
                `Maximize your hiring success – learn how ${brandName} Assessment delivers real results for companies worldwide.`,
                `Unlock insights to hire better with ${brandName} Assessment – see how it can transform your recruitment process.`
            ],
            "Curiosity Driven Hook": [
                `What if you could predict employee success before hiring them? With ${brandName} Assessment, you can!`,
                `What’s the secret behind hiring top talent? Discover how ${brandName} Assessment is changing the recruitment game.`,
                `Ever wondered how the most successful companies select their employees? The answer lies in ${brandName} Assessment.`
            ],
            "Lead Magnet Style Hook": [
                `Free eBook: How ${brandName} Assessment helps HR teams reduce hiring mistakes. Get your copy now!`,
                `Sign up for a free demo of ${brandName} Assessment and see firsthand how it can enhance your recruitment process.`,
                `Download our free guide on optimizing your hiring process with ${brandName} Assessment.`
            ],
            "Awareness Type Hook": [
                `Recruitment doesn’t have to be a guessing game. Learn how ${brandName} Assessment brings precision to your hiring.`,
                `Over 10,000 HR professionals trust ${brandName} Assessment for smarter hiring decisions. Find out why.`,
                `Discover the power of data-driven hiring with ${brandName} Assessment – the next big thing in recruitment technology.`
            ]
        };

        // Select the appropriate hook ideas based on the selected hook type
        const selectedHookIdeas = hookIdeas["Trending and Timely Hook"] || [];

        // Generate a post using the selected hook idea and campaign details
        const campaignPrompt = `Generate a LinkedIn post using the following details:
        - User Prompt: ${prompt}
        - Selected Hook Type: ${hookType}
        - Hook Ideas: ${selectedHookIdeas.join(", ")}
        - Campaign Details: ${camp.title}
        - Make sure the post is not more than 300 words and is tailored for LinkedIn to drive awareness for the ${brandName} brand.
        - Add emojies to make it more engaging.
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
        console.log("Campaign ID:", campaignId);
        const analytics = await CampaignService.getCampaignAnalytics(req, campaignId);
        res.status(200).json(analytics);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}



export const generateCarouselMakerContent = async (req, res) => {
    const { posts, campaignId, aiPrompt } = req.body;

    try {
        const campaignData = await campaign.findById(campaignId);

        if (!campaignData) {
            return res.status(404).json({ error: "Campaign not found" });
        }

        const results = await Promise.all(posts.map(async (post) => {
            const prompt = `
            You are a creative AI expert in designing engaging LinkedIn carousel content.
            
            ## Objective:
            Based on the provided JSON data structure, generate a professional and visually appealing carousel post for LinkedIn.
            
            ---
            
            ## Context:
            Campaign Name: ${campaignData.title}
            
            Creator's Notes & Style Guide: 
            ${aiPrompt}
            
            ---
            
            ## Data Structure Provided:
            ${JSON.stringify(post.postData, null, 2)}
            
            ---
            
            ## Instructions:
            
            1. Fill empty "label" fields with creative and suitable content.
            2. Improve existing "label" texts to sound professional, engaging, and LinkedIn-friendly.
            3. Add relevant emojis only when it enhances the message.
            4. Modify design properties to support the content, such as:
               - "fontSize"
               - "color"
               - "textAlign"
               - "hidden" (set to true if element feels unnecessary)
            5. Feel free to modify:
               - "bgColor" for better visual impact
               - "editableButton" text to drive action
            6. Keep the JSON structure *exactly the same*. Do not add or remove keys.
            7. Use concise, punchy language ideal for carousel consumption.
            8. Ensure consistency across slides (title-tone-design alignment).
            9. Ensure fontSize for title label is const fontSize = Math.max(32, 64 - [value of item].length);
            
            ---
            
            ## Output Rules:
            - Respond with ONLY the updated JSON.
            - No extra explanation or notes.
            - Valid JSON only.
            
            Let's begin creating an outstanding carousel!
            `;


            const contentPrompt = await generatePost(prompt);


            console.log("Generated content:", contentPrompt);

            let newPostData;
            try {
                newPostData = JSON.parse(contentPrompt);
            } catch (err) {
                console.error("Failed to parse GPT response for post index:", post.index);
                throw new Error("Invalid GPT response format.");
            }

            return {
                ...post,
                postData: newPostData,
            };
        }));

        res.status(200).json(results);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};




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
    generateCarouselMakerContent
};