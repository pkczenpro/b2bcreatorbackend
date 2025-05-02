import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        brandId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Reference to the brand that owns the product
        productName: { type: String, required: true },
        productLogo: { type: String, required: false },
        publicVisibility: { type: Boolean, required: true },
        productDescription: { type: String, required: true },
        productImages: [{ type: String }], // URLs of product images
        productLink: { type: String, required: false },
        loomVideoLink: { type: String, required: false },
        g2Link: { type: String, required: false },
        capterraLink: { type: String, required: false },
        additionalDetails: { type: String, required: false },
        resources: [{ type: String }], // URLs of product resources
        productHunt: { type: String, required: false },
        rating: { type: Number, default: 0 }, // Average rating of the product
        ratings: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Reference to the user who rated
                rating: { type: Number, min: 1, max: 5 }, // Rating value between 1 and 5
            },
        ],
    },
    { timestamps: true } // Automatically adds createdAt and updatedAt
);

export default mongoose.model("Product", productSchema);
