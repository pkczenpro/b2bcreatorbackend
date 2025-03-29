import mongoose from "mongoose";
import dotenv from "dotenv";
import { faker } from "@faker-js/faker";
import User from "./src/models/User.js";
import Product from "./src/models/Product.js";
import Campaign from "./src/models/Campaign.js";
import bcrypt from "bcrypt";
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("MongoDB Connected"))
    .catch(err => console.error(err));

// Generate Random Users
const generateUsers = (num) => {
    return Array.from({ length: num }, () => ({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        password: bcrypt.hashSync("test", 10),
        isCompletedOnboarding: faker.datatype.boolean(),
        userType: faker.helpers.arrayElement(["creator", "brand"]),
        profileName: faker.internet.userName(),
        profileImage: faker.image.avatar(),
        coverImage: faker.image.urlPicsumPhotos(),
        socialMediaLinks: [
            { platform: "twitter", link: faker.internet.url() },
            { platform: "linkedin", link: faker.internet.url() }
        ],
        bio: faker.person.bio(),
        tags: faker.helpers.arrayElements(["tech", "startup", "developer", "marketing"], 2),
        location: faker.location.city(),
        reviews: [],
        services: [
            {
                title: faker.company.name(),
                description: faker.lorem.sentence(),
                price: faker.number.int({ min: 10, max: 100 }),
                basis: "hourly"
            }
        ],
        previousWork: [
            {
                image: faker.image.url(),
                title: faker.commerce.productName(),
                description: faker.lorem.sentence(),
                url: faker.internet.url()
            }
        ],
        stats: [{ title: "Projects Completed", value: faker.number.int({ min: 1, max: 50 }) }],
        calendar: [{ title: "Client Meeting", date: faker.date.future(), color: faker.color.rgb() }],
        isCompletedOnboarding: faker.datatype.boolean(),
    }));
};

// Generate Random Products
const generateProducts = (num, brandId) => {
    return Array.from({ length: num }, () => ({
        brandId,
        productName: faker.commerce.productName(),
        productLogo: faker.image.url(),
        publicVisibility: faker.datatype.boolean(),
        productDescription: faker.commerce.productDescription(),
        productImages: [faker.image.url()],
        productLink: faker.internet.url(),
        loomVideoLink: faker.internet.url(),
        g2Link: faker.internet.url(),
        capterraLink: faker.internet.url(),
        additionalDetails: faker.lorem.paragraph(),
        productHunt: faker.internet.url()
    }));
};

// Generate Random Campaigns
const generateCampaigns = (num, brandId) => {
    return Array.from({ length: num }, () => ({
        brandId,
        title: faker.company.buzzPhrase(),
        description: faker.lorem.paragraph(),
        tags: faker.helpers.arrayElements(["tech", "innovation", "marketing", "business"], 2),
        contentType: faker.helpers.arrayElements(["video", "blog", "podcast"], 2),
        goalsAndDeliverables: faker.lorem.sentence(),
        status: "active",
        startDate: faker.date.past(),
        endDate: faker.date.future(),
        budget: faker.number.int({ min: 1000, max: 10000 }),
        coverImage: faker.image.url(),
        appliedCreators: [],
        selectedCreators: []
    }));
};

// Function to seed data
const seedDB = async () => {
    try {
        // Clear existing data
        await User.deleteMany();
        await Product.deleteMany();
        await Campaign.deleteMany();
        console.log("Existing data cleared!");

        // Insert users
        const users = generateUsers(50);
        const insertedUsers = await User.insertMany(users);
        console.log("Users seeded!");

        // Get all brands
        const brandUsers = insertedUsers.filter(user => user.userType === "brand");
        const selectedCreators = insertedUsers.filter(user => user.userType === "creator");
        const appliedCreators = selectedCreators.map(creator => ({
            creatorId: creator._id,
            status: faker.helpers.arrayElement(["pending", "approved", "rejected"]),
            amount: faker.number.int({ min: 100, max: 1000 }),
        }));

        let allCampaigns = [];
        let allProducts = [];

        for (const brand of brandUsers) {
            // Generate products and campaigns for each brand
            const products = generateProducts(5, brand._id);
            allProducts.push(...products);

            let campaigns = generateCampaigns(3, brand._id);
            campaigns = campaigns.map(campaign => {
                const randomCreators = faker.helpers.arrayElements(selectedCreators, 3);
                return {
                    ...campaign,
                    selectedCreators: randomCreators.map(creator => ({
                        creatorId: creator._id,
                        status: faker.helpers.arrayElement(["pending", "declined", "active", "approved"]),
                        amount: faker.number.int({ min: 100, max: 1000 }),
                    })),
                    appliedCreators: appliedCreators
                };
            });

            allCampaigns.push(...campaigns);
        }

        // Insert all products and campaigns
        await Product.insertMany(allProducts);
        console.log("Products seeded!");

        await Campaign.insertMany(allCampaigns);
        console.log("Campaigns seeded!");

        // Close connection
        mongoose.connection.close();
        console.log("Database seeding complete!")
            
    } catch (err) {
        console.error("Error seeding database:", err);
        mongoose.connection.close();
    }
};

// Run the seed function
seedDB();
