import mongoose from "mongoose";
import Campaign from "./campaign.js";
import { faker } from "@faker-js/faker";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },

    email_verified: { type: Boolean, required: true, default: false },
    verificationToken: { type: String, required: false },
    verificationTokenExpires: { type: Date, required: false },
    linkedin: { type: Object, required: false },
    // onboarding
    isCompletedOnboarding: { type: Boolean, required: true, default: false },
    userType: { type: String, required: false },  // creator or brand
    profileName: { type: String, required: false },
    profileImage: { type: String, required: false, default: process.env.DOMAIN + "/default.png" },
    coverImage: { type: String, required: false, default: faker.image.urlPicsumPhotos() },
    socialMediaLinks: [
        {
            platform: { type: String, required: false }, // e.g., "google", "linkedin", "facebook"
            link: { type: String, required: false }, // e.g., URL of the social media profile
        },
    ],
    bio: { type: String },
    tags: [{ type: String, required: false }], // e.g., ["tech", "startup", "developer"]

    // onboarding - brand
    location: { type: String, required: false }, // e.g., "New York, USA"

    // rating and reviews - creator
    reviews: [
        {
            reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            campaignId: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign", required: true },
            review: { type: String, required: true },
            rating: { type: Number, required: true },
        },
    ],

    // services - creator
    services: [
        {
            title: { type: String, required: false },
            description: { type: String, required: false },
            price: { type: Number, required: false },
            basis: { type: String, required: false }, // e.g., "hourly", "fixed"
        },
    ],

    // previous work - creator
    previousWork: [
        {
            image: { type: String, required: false },
            title: { type: String, required: false },
            description: { type: String, required: false },
            url: { type: String, required: false },
        },
    ],

    // featured work - creator
    featuredWork: [
        {
            image: { type: String, required: false },
            title: { type: String, required: false },
            description: { type: String, required: false },
            url: { type: String, required: false },
        },
    ],

    // testimonials - creator
    testimonials: [
        {
            name: { type: String, required: false },
            position: { type: String, required: false },
            text: { type: String, required: false },
            image: { type: String, required: false },
        },
    ],

    // text block - creator
    textBlock: [
        {
            title: { type: String, required: false },
            description: { type: String, required: false },
        },
    ],

    // stats - creator
    stats: [
        {
            title: { type: String, required: false },
            value: { type: Number, required: false },
        },
    ],

    // calendar
    calendar: [
        {
            title: { type: String, required: false },
            date: { type: Date, required: false },
            color: { type: String, required: false },
        },
    ],

    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    category: { type: String, required: false }, // e.g., "tech", "lifestyle", "travel"
    subCategory: { type: String, required: false }, // e.g., "software", "gadgets", "travel tips"

    drafts: [
        {
            postContent: { type: String, required: false },
            selectedCampaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: false },
            selectedProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
            brandName: { type: String, required: false },
            hookType: { type: String, required: false },
            uploadedImages: { type: [String], required: false },
            isCampaignPost: { type: Boolean, required: false, default: false },
            category: { type: String, required: false },
            createdAt: { type: Date, required: true, default: Date.now },
        },
    ],

}, { timestamps: true });

export default mongoose.model("User", userSchema);