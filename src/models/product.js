import mongoose from "mongoose";

// productName: "",
// productLogo: null,
// publicVisibility: false,
// productDescription: "",
// productImages: [] as File[],
// productLink: "",
// loomVideoLink: "",
// g2Link: "",
// capterraLink: "",
// additionalDetails: "",
// productHunt: "",

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
        productHunt: { type: String, required: false },
    },
    { timestamps: true } // Automatically adds createdAt and updatedAt
);

export default mongoose.model("Product", productSchema);
