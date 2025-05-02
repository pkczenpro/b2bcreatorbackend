import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
    {
        brandId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        title: { type: String, required: true },
        description: { type: String, required: true },
        tags: [{ type: String }],
        contentType: [{ type: String }],
        goalsAndDeliverables: { type: String, required: true },
        status: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        budget: { type: Number, required: true },
        coverImage: { type: String, required: false },
        selectedCreators: [
            {
                creatorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
                status: { type: String, default: "pending" },
                amount: { type: Number, required: false },
                approved: { type: Boolean, default: false },
                content: [
                    {
                        type: { type: String, required: false },
                        url: { type: String, required: false },
                        content: { type: String, required: false },
                        files: [{ type: String }],
                        urnli: { type: String, required: false },
                        createdAt: { type: Date, default: Date.now },

                    },
                ],
                invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
                createDate: { type: Date, default: Date.now },
                updatedAt: { type: Date, default: Date.now },
            },
        ],
        visibility: { type: Boolean, default: true },
    },
    { timestamps: true }
);

export default mongoose.model("Campaign", campaignSchema);