import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
    {
        brandId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to the brand that created the campaign
        title: { type: String, required: true },
        description: { type: String, required: true },
        tags: [{ type: String }], // Categories, e.g., ["tech", "fashion"]
        contentType: [{ type: String }], // Type of content, e.g., ["image", "video", "blog"]
        goalsAndDeliverables: { type: String, required: true },
        status: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        budget: { type: Number, required: true }, // Budget in USD
        coverImage: { type: String, required: false }, // Cover image URL
        // Selected creators with details
        selectedCreators: [
            {
                creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to the creator
                status: { type: String, default: "pending" }, // Status of collaboration
                amount: { type: Number, required: false }, // Amount allocated for this creator
                approved: { type: Boolean, default: false }, // Approval status
                content: [
                    {
                        type: { type: String, required: false }, // e.g., "image", "video", "blog"
                        url: { type: String, required: false }, // URL of the content
                        content: { type: String, required: false }, // Description of the content
                        files: [{ type: String }], // File URLs
                        urnli: { type: String, required: false }, // LinkedIn URN
                        createdAt: { type: Date, default: Date.now },
                    },
                ],
                createDate: { type: Date, default: Date.now }, // Date when the creator was selected
                updatedAt: { type: Date, default: Date.now }, // Date when the creator was last updated
            },
        ],
    },
    { timestamps: true }
);

export default mongoose.model("Campaign", campaignSchema);