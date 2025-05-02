import mongoose from "mongoose";

const invoiceSchema = new mongoose.Schema(
    {
        brandId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        invoiceNumber: {
            type: String,
            required: true,
            unique: true,
        },
        dateIssued: {
            type: Date,
            default: Date.now,
        },
        creatorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        items: [
            {
                description: {
                    type: String,
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                },
                price: {
                    type: Number,
                    required: false,
                },
                total: {
                    type: Number,
                    required: false,
                },
                files: [
                    {
                        type: String,
                    },
                ],
                content: {
                    type: String,
                },
            },
        ],
        totalAmount: {
            type: Number,
            required: false,
        },
        status: {
            type: String,
            enum: ["pending", "paid", "overdue"],
            default: "pending",
        },
    },
    { timestamps: true }
);

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
