import UserRepository from "../repositories/userRepository.js";
import CampaignRepository from "../repositories/campaignRepository.js";
import ProductRepository from "../repositories/productRepository.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";
import { sendEmail } from "../utils/sendEmail.js";
import validateFieldData from "../utils/validateSchemas.js";
import mongoose, { get } from "mongoose";
import crypto from "crypto";
import { faker } from "@faker-js/faker";

const emailRE = /\S+@\S+\.\S+/;

const UserService = {
    async registerUser(userData) {
        const { email, password, name, userType } = userData;

        if (!emailRE.test(email)) throw new Error("Invalid email");

        if (!email) throw new Error("Email is required");
        if (!password) throw new Error("Password is required");
        if (!name) throw new Error("Name is required");
        if (!userType) throw new Error("User type is required");

        // Check if the user exists
        const existingUser = await UserRepository.findUserByEmail(email);
        if (existingUser) throw new Error("User already exists");

        // Hash password
        userData.password = await bcrypt.hash(password, 10);

        // Generate email verification token
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

        // Create user with the verification token but don't save yet
        const newUser = {
            ...userData,
            verificationToken,
            verificationTokenExpires,
        };

        // Send email with verification link
        const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
        try {
            await sendEmail({
                to: [{ email }],
                templateId: 1, // Update with your email template ID
                params: { link: verificationLink },
            });

            // If email is sent successfully, now save the user to the database
            const createdUser = await UserRepository.createUser(newUser);
            return createdUser;

        } catch (error) {
            // If sending the email fails, don't create the user
            throw new Error("Email sending failed: " + error.message);
        }
    },

    async verifyAccount(token) {
        const user = await UserRepository.findUserByVerificationToken(token);
        if (!user) throw new Error("Invalid or expired token");

        // Check if token is expired
        if (user.verificationTokenExpires < Date.now()) {
            throw new Error("Token has expired. Please request a new verification link.");
        }

        // Update user to be verified
        const updatedUser = await UserRepository.updateUser(user._id, {
            email_verified: true,
            verificationToken: null,
            verificationTokenExpires: null,
        });

        try {
            await sendEmail({
                to: [{ email: updatedUser.email }],
                templateId: 2, // Update with your email template ID
                params: { name: updatedUser.name },
            });
        } catch (error) {
            console.error("Error sending welcome email:", error.message);
        }

        return {
            message: "Account verified successfully", user: updatedUser
        };
    },

    async loginUser(userType, email, password) {
        const user = await UserRepository.findUserByEmail(email);
        if (!user) throw new Error("We couldn't find an account with that email. Please check and try again.");

        if (userType !== user.userType) throw new Error("Oops! The email or password is incorrect. Please try again.");
        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw new Error("Oops! The email or password is incorrect. Please try again.");

        // Generate JWT token
        const token = jwt.sign({ id: user._id, userType: user.userType }, process.env.JWT_SECRET, {
            expiresIn: "1d",
        });

        return { token, user };
    },

    async loginWithLinkedIn({ code, userType }, authtype) {
        if (!userType) throw new Error("User type is required");
        try {
            // Step 1: Exchange code for access token
            let linkedInToken;
            try {
                linkedInToken = await axios.post(
                    "https://www.linkedin.com/oauth/v2/accessToken",
                    new URLSearchParams({
                        grant_type: "authorization_code",
                        code,
                        redirect_uri: process.env.FRONTEND_URL + "/auth/linkedin/callback",
                        client_id: process.env.LINKEDIN_CLIENT_ID,
                        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
                    }),
                    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
                );
            } catch (error) {
                console.error("Error fetching LinkedIn access token:", error.response?.data || error.message);
                throw new Error("Failed to get LinkedIn access token.");
            }


            // Step 2: Fetch user profile
            let linkedInUser;
            try {
                linkedInUser = await axios.get("https://api.linkedin.com/v2/userinfo", {
                    headers: {
                        Authorization: `Bearer ${linkedInToken.data.access_token}`,
                    },
                });
            } catch (error) {
                console.error("Error fetching LinkedIn user profile:", error.response?.data || error.message);
                throw new Error("Failed to fetch LinkedIn user profile.");
            }
            const userEmail = linkedInUser.data.email || `${linkedInUser.data.id}@linkedin.com`;
            let user;
            try {
                user = await UserRepository.findUserByEmail(userEmail);
            } catch (error) {
                console.error("Database error while searching for user:", error.message);
                throw new Error("Database error while searching for user.", error.message);
            }
            if (!user) {
                try {
                    user = await UserRepository.createUser({
                        email: userEmail,
                        name: linkedInUser.data.name,
                        userType,
                        profileImage: linkedInUser.data.picture || process.env.DOMAIN + "/default.png",
                        location: linkedInUser.data.locale.country,
                        email_verified: linkedInUser.data.email_verified,
                        linkedin: {
                            id: linkedInUser.data.sub,
                            access_token: linkedInToken.data.access_token,
                            expires_in: linkedInToken.data.expires_in,
                            linkedinId: linkedInUser.data.id,
                        },
                    });
                } catch (error) {
                    console.error("Database error while creating user:", error.message);
                    throw new Error("Database error while creating new user.", error.message);
                }
            } else if (user && authtype === "1") {
                user = await UserRepository.updateUser(user._id, {
                    linkedin: {
                        id: linkedInUser.data.id,
                        access_token: linkedInToken.data.access_token,
                        expires_in: linkedInToken.data.expires_in,
                        linkedinId: linkedInUser.data.id,
                    },
                });
            }

            // Step 6: Generate JWT token
            let token;
            try {
                token = jwt.sign(
                    { id: user._id, userType: user.userType },
                    process.env.JWT_SECRET,
                    { expiresIn: "1d" }
                );
            } catch (error) {
                console.error("Error generating JWT token:", error.message);
                throw new Error("Failed to generate authentication token.");
            }

            return { token, user };
        } catch (error) {
            console.error("LinkedIn Authentication Error:", error.message);
            throw new Error(error.message);
        }
    },

    async loginWithGoogle({ code, userType }) {
        if (!userType) throw new Error("User type is required");

        try {
            // Step 1: Exchange the authorization code for access token
            const googleTokenResponse = await axios.post("https://oauth2.googleapis.com/token", {
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                code,
                redirect_uri: process.env.FRONTEND_URL + "/auth/google/callback",
                grant_type: "authorization_code",
            });

            const { access_token } = googleTokenResponse.data;

            // Step 2: Fetch user profile
            const userInfoResponse = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
                headers: { Authorization: `Bearer ${access_token}` },
            });

            const googleUser = userInfoResponse.data;
            // Step 3: Check if user exists in the database
            const userEmail = googleUser.email;
            let user = await UserRepository.findUserByEmail(userEmail);

            // Step 4: If user does not exist, create a new one
            if (!user) {
                user = await UserRepository.createUser({
                    email: googleUser.email,
                    name: googleUser.name,
                    userType,
                    profileImage: googleUser.picture || process.env.DOMAIN + "/default.png",
                    email_verified: googleUser.verified_email,
                });
            }
            // Step 5: Generate JWT token
            const token = jwt.sign(
                { id: user._id, userType: user.userType },
                process.env.JWT_SECRET,
                { expiresIn: "1d" }
            );

            return { token, user };
        } catch (error) {
            console.error("Google Authentication Error:", error.message);
            throw new Error(error.message);
        }
    },

    // New service for updating user details
    async updateUser(req, userId, updateData) {
        const user = await UserRepository.findUserById(userId);
        if (!user) throw new Error("User not found");

        const profileImage = req.files?.profileImage?.[0] || null;
        const coverImage = req.files?.coverImage?.[0] || null;

        // Convert user to an object to avoid modifying the Mongoose document directly
        const updatedUserData = { ...user.toObject(), ...updateData };

        if (profileImage) {
            updatedUserData.profileImage = `/uploads/${profileImage.filename}`;
        }
        if (coverImage) {
            updatedUserData.coverImage = `/uploads/${coverImage.filename}`;
        }

        if (req.body.tags) {
            updatedUserData.tags = req.body.tags.split(",") || [];
        }

        if (req.body.socialMediaLinks) {
            updatedUserData.socialMediaLinks = JSON.parse(req.body.socialMediaLinks) || [];
        }

        // Hash password only if it's provided and not empty
        if (updateData.password && updateData.password.trim() !== "") {
            updatedUserData.password = await bcrypt.hash(updateData.password, 10);
        } else {
            delete updatedUserData.password; // Remove password field if it's empty
        }

        return await UserRepository.updateUser(userId, { $set: updatedUserData });
    },


    // New service for fetching a user's details
    async getUserDetails(userId) {
        const user = await UserRepository.findUserById(userId);
        if (!user) throw new Error("User not found");

        // Optionally exclude sensitive data such as password
        const { password, ...userDetails } = user;

        return userDetails;
    },

    // New service for deleting a user
    async deleteUser(userId) {
        const user = await UserRepository.findUserById(userId);
        if (!user) throw new Error("User not found");

        // Delete user
        await UserRepository.deleteUser(userId);

        return { message: "User deleted successfully" };
    },

    // New service for sending password reset link
    async sendPasswordResetLink(email) {
        // Find user by email
        const user = await UserRepository.findUserByEmail(email);
        if (!user) throw new Error("User not found");

        // Generate password reset token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        // Construct reset password link
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

        try {
            await sendEmail({
                to: [{ email }],
                templateId: 3,
                params: { link: resetLink },
            });

            return { message: "Password reset link sent to your email" };
        } catch (error) {
            console.error("Error sending password reset email:", error);
            throw new Error("Failed to send password reset link. Please try again.");
        }
    },
    // New service for resetting password
    async resetPassword(token, newPassword) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await UserRepository.findUserById(decoded.id);
        if (!user) throw new Error("User not found");

        // Hash new password
        const password = await bcrypt.hash(newPassword, 10);

        // Update user's password
        await UserRepository.updateUser(user._id, { password });

        return { message: "Password reset successful" };
    },

    // New service for completing user setup
    async completeUserSetup(req, userId, setupData) {
        const profileImage = req.files?.profileImage?.[0];
        const coverImage = req.files?.coverImage?.[0];
        if (!setupData || Object.keys(setupData).length === 0) {
            throw new Error("No data provided for update");
        }

        const user = await UserRepository.findUserById(userId);
        if (!user) throw new Error("User not found");

        // Parse the JSON fields (socialMediaLinks and tags)
        let socialMediaLinks = [];
        let tags = [];
        if (setupData.socialMediaLinks) {
            try {
                socialMediaLinks = JSON.parse(setupData.socialMediaLinks);
            } catch (error) {
                throw new Error("Invalid social media links format");
            }
        }
        if (setupData.tags) {
            try {
                tags = JSON.parse(setupData.tags);
            } catch (error) {
                throw new Error("Invalid tags format");
            }
        }

        // Prepare updated user data, including file handling
        const updatedUserData = {
            ...user.toObject(), // Convert Mongoose document to plain object
            ...setupData, // Overwrite with new data
            socialMediaLinks: socialMediaLinks.length ? socialMediaLinks : user.socialMediaLinks,
            tags: tags.length ? tags : user.tags,
        };

        // Handle file uploads (profileImage, coverImage)
        if (profileImage) {
            updatedUserData.profileImage = `/uploads/${profileImage.filename}`;
        } 
        if (coverImage) {
            updatedUserData.coverImage = `/uploads/${coverImage.filename}`;
        }

        // Ensure proper replacement of socialMediaLinks if needed
        if (Array.isArray(updatedUserData.socialMediaLinks)) {
            updatedUserData.socialMediaLinks = updatedUserData.socialMediaLinks.map(({ _id, ...rest }) => rest);
        }

        // Remove any undefined fields from the updatedUserData
        Object.keys(updatedUserData).forEach(key => {
            if (updatedUserData[key] === undefined) delete updatedUserData[key];
        });

        // Update user data in the repository
        const updatedUser = await UserRepository.updateUser(userId, updatedUserData);
        return updatedUser;
    },

    // Generic method to update a user field (for array-based fields like services, previous work, etc.)
    async modifyUserField(userId, field, operation, itemId = null, data = null) {
        const user = await UserRepository.findUserById(userId);
        if (!user[field]) throw new Error(`${field} does not exist on user schema`);

        if (operation === "add" || operation === "update") {
            validateFieldData(field, data);
        }

        switch (operation) {
            case "add":
                user[field].push(data);
                break;
            case "update":
                {
                    const item = user[field].id(itemId);
                    if (!item) throw new Error(`${field.slice(0, -1)} not found`);
                    item.set(data);
                }
                break;
            case "delete":
                {
                    const item = user[field].id(itemId);
                    console.log(item);
                    if (!item) throw new Error(`${field.slice(0, -1)} not found`);
                    item.deleteOne();
                }
                break;
            default:
                throw new Error("Invalid operation");
        }

        return await UserRepository.updateUser(userId, user);
    },

    // Unified service method
    async handleUserField({ userId, field, operation, itemId = null, data = null }) {
        return await this.modifyUserField(userId, field, operation, itemId, data);
    },

    async getCreators() {
        const creators = await UserRepository.findUsersByType("creator");
        return creators;
    },

    async getBrands() {
        const brands = await UserRepository.findUsersByType("brand");
        return brands;
    },

    // brand preview
    async getBrandById(brandId) {
        const mongooseObjectId = mongoose.Types.ObjectId;
        if (!mongooseObjectId.isValid(brandId)) throw new Error("Invalid brand ID");

        const brand = await UserRepository.findUserById(brandId);
        if (!brand) throw new Error("Brand not found");

        const brandCampaigns = await CampaignRepository.findCampaignsByBrandId(brandId);
        const brandProducts = await ProductRepository.findByBrand(brandId);
        const brandPartnerships = await Promise.all(
            brandCampaigns.map(async (campaign) => {
                if (campaign.selectedCreators.length > 0) {
                    return await Promise.all(
                        campaign.selectedCreators
                            .filter((creator) => creator.status === "done")
                            .map(async (creator) => {
                                // Assuming that creatorId is the key for finding user
                                const user = await UserRepository.findUserById(creator.creatorId); // Get the user data
                                const creatorCampaigns = await CampaignRepository.getCampaignsBySelectedCreatorsId(creator.creatorId); // Get the creator's campaigns

                                return {
                                    ...creator._doc, // Keep the original creator data
                                    name: user.name,
                                    email: user.email,
                                    profileImage: user.profileImage || process.env.DOMAIN + "/default.png",
                                    coverImage: user.coverImage,
                                    bio: user.bio,
                                    tags: user.tags,
                                    user_id: user._id,
                                    campaigns: creatorCampaigns
                                };
                            })
                    );
                }
                return []; // If no creators are selected, return an empty array
            })
        );



        const brandData = {
            ...brand.toObject(),
            campaigns: brandCampaigns,
            products: brandProducts,
            partnerships: brandPartnerships.flat(),
        };

        return brandData;
    },

    // creator preview
    async getCreatorById(creatorId) {
        const mongooseObjectId = mongoose.Types.ObjectId;
        if (!mongooseObjectId.isValid(creatorId)) throw new Error("Invalid creator ID");

        const creator = await UserRepository.findUserById(creatorId);
        if (!creator) throw new Error("Creator not found");

        return creator;
    },

    // async registerLinkedInUpload(accessToken, ownerUrn, type = "image") {
    //     const url = "https://api.linkedin.com/v2/assets?action=registerUpload";

    //     const recipes = type === "video"
    //         ? ["urn:li:digitalmediaRecipe:feedshare-video"]
    //         : type === "pdf"
    //             ? ["urn:li:digitalmediaRecipe:feedshare-document"]
    //             : ["urn:li:digitalmediaRecipe:feedshare-image"];

    //     console.log("Registering upload with recipes:", recipes);

    //     const requestBody = {
    //         registerUploadRequest: {
    //             recipes,
    //             owner: ownerUrn,
    //             serviceRelationships: [
    //                 {
    //                     relationshipType: "OWNER",
    //                     identifier: "urn:li:userGeneratedContent"
    //                 }
    //             ]
    //         }
    //     };

    //     try {
    //         const response = await axios.post(url, requestBody, {
    //             headers: {
    //                 "Authorization": `Bearer ${accessToken}`,
    //                 "Content-Type": "application/json"
    //             }
    //         });

    //         return response.data.value;
    //     } catch (error) {
    //         console.error("Error registering upload:", error.response?.data || error.message);
    //         throw error;
    //     }
    // },

    // async uploadMedia(accessToken, ownerUrn, type, mediaUrl) {
    //     try {
    //         const uploadData = await this.registerLinkedInUpload(accessToken, ownerUrn, type);
    //         const uploadUrl = uploadData.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
    //         const assetUrn = uploadData.asset;

    //         const mediaBuffer = Buffer.from(await fetch(mediaUrl).then(res => res.arrayBuffer()));

    //         const mediaResponse = await axios.put(uploadUrl, mediaBuffer, {
    //             headers: {
    //                 "Authorization": `Bearer ${accessToken}`,
    //                 "Content-Type": type === "video" ? "video/mp4" : type === "pdf" ? "application/pdf" : "image/jpeg"
    //             }
    //         });

    //         console.log("Media upload response:", mediaResponse.data);

    //         if (mediaResponse.status === 201 || mediaResponse.status === 200) {
    //             return assetUrn;
    //         } else {
    //             console.error("Media upload failed", mediaResponse.data);
    //             return null;
    //         }
    //     } catch (error) {
    //         console.error("Error uploading media:", error.response?.data || error.message);
    //         return null;
    //     }
    // },

    // async shareContent(req, res) {
    //     const { accessToken, userId, postContent, mediaType } = req.body;
    //     const imageFiles = req.files?.image || []; // Support multiple images
    //     const mediaUrls = imageFiles.map(file => `${process.env.DOMAIN}/uploads/${file.filename}`);

    //     try {
    //         let mediaUrns = [];

    //         // Step 1: Upload each media file if provided
    //         if (mediaType && mediaUrls.length > 0) {
    //             for (const mediaUrl of mediaUrls) {
    //                 const mediaUrn = await this.uploadMedia(accessToken, `urn:li:person:${userId}`, mediaType, mediaUrl);
    //                 if (mediaUrn) {
    //                     mediaUrns.push({ status: "READY", media: mediaUrn });
    //                 }
    //             }
    //             if (mediaUrns.length === 0) {
    //                 return res.status(400).json({ message: "Failed to upload media" });
    //             }
    //         }

    //         // Step 2: Create post with multiple media files
    //         const apiUrl = "https://api.linkedin.com/v2/ugcPosts";
    //         const postData = {
    //             author: `urn:li:person:${userId}`,
    //             lifecycleState: "PUBLISHED",
    //             specificContent: {
    //                 "com.linkedin.ugc.ShareContent": {
    //                     shareCommentary: { text: postContent },
    //                     shareMediaCategory: mediaUrns.length > 0 ? "IMAGE" : "NONE",
    //                     media: mediaUrns
    //                 },
    //             },
    //             visibility: {
    //                 "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
    //             },
    //         };

    //         const response = await fetch(apiUrl, {
    //             method: 'POST',
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 Authorization: `Bearer ${accessToken}`,
    //                 'X-Restli-Protocol-Version': '2.0.0',
    //             },
    //             body: JSON.stringify(postData),
    //         });

    //         const responseData = await response.json();

    //         if (response.ok) {
    //             return res.json({ message: 'Post published successfully!', responseData });
    //         } else {
    //             return res.status(400).json({ message: 'Failed to publish post', error: responseData });
    //         }
    //     } catch (error) {
    //         console.error('Content Sharing Error:', error);
    //         return res.status(500).json({ message: 'Failed to share content', error: error.message });
    //     }
    // },


    // async getSharedPosts(req, res) {
    //     const { accessToken, userId } = req.body;

    //     // Convert userId to URN format
    //     const userUrn = `urn:li:person:${userId}`;

    //     // Corrected API URL for retrieving user posts
    //     const apiUrl = `https://api.linkedin.com/v2/shares?q=owners&owners=${userUrn}`;

    //     try {
    //         const response = await fetch(apiUrl, {
    //             method: 'GET',
    //             headers: {
    //                 'Authorization': `Bearer ${accessToken}`,
    //                 'LinkedIn-Version': '202503',
    //                 'Content-Type': 'application/json'
    //             }
    //         });

    //         if (response.ok) {
    //             const data = await response.json();
    //             res.status(200).json({ message: 'Posts retrieved successfully', posts: data });
    //         } else {
    //             const error = await response.json();
    //             res.status(400).json({ message: 'Failed to fetch posts', error });
    //         }
    //     } catch (error) {
    //         res.status(500).json({ message: 'Server error', error });
    //     }
    // },


    async followBrand(req, res) {
        const userId = req.user.id;
        const brandId = req.params.brandId;

        try {
            // Find the user and brand
            const user = await UserRepository.findUserById(userId);
            if (!user) return { message: 'User not found' };

            if (user.userType !== "creator") return { message: 'Only creators can follow brands' };

            const brand = await UserRepository.findUserById(brandId);
            if (!brand) return { message: 'Brand not found' };

            // If the user is already following the brand, unfollow it
            if (user.following.includes(brandId)) {
                // Remove the brand from the user's following list
                user.following = user.following.filter(id => id.toString() !== brandId);
                await UserRepository.updateUser(userId, { following: user.following });

                // Remove the user from the brand's followers list
                brand.followers = brand.followers.filter(id => id.toString() !== userId);
                await UserRepository.updateUser(brandId, { followers: brand.followers });

                return { message: 'Unfollowed the brand successfully', user }
            }

            // Add the brand to the user's following list
            user.following.push(brandId);
            await UserRepository.updateUser(userId, { following: user.following });

            // Add the user to the brand's followers list
            brand.followers.push(userId);
            await UserRepository.updateUser(brandId, { followers: brand.followers });

            return { message: 'Brand followed successfully', user }
        } catch (error) {
            console.error("Error following brand:", error);
            return { message: 'An error occurred while following the brand' };
        }
    },


    async getAccessToken(req, res) {
        const { code } = req.body;
        const user = req.user.id;

        const linkedInUser = await UserRepository.findUserById(user);
        if (!linkedInUser) return { message: 'User not found' };


        try {
            const response = await axios.post("https://www.linkedin.com/oauth/v2/accessToken"
                , new URLSearchParams({
                    grant_type: "authorization_code",
                    code,
                    redirect_uri: process.env.FRONTEND_URL + "/auth/linkedin/access_token_callback",
                    client_id: process.env.LINKEDIN_CLIENT_ID,
                    client_secret: process.env.LINKEDIN_CLIENT_SECRET,
                }),
                { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
            );
            if (response.status === 200) {
                let linkedInUser;
                try {
                    linkedInUser = await axios.get("https://api.linkedin.com/v2/userinfo", {
                        headers: {
                            Authorization: `Bearer ${response.data.access_token}`,
                        },
                    });
                    linkedInUser = await UserRepository.updateUser(user, {
                        linkedin: {
                            id: linkedInUser.data.sub,
                            access_token: response.data.access_token,
                            expires_in: response.data.expires_in,
                        },
                    });
                    return { success: true, message: "Access token updated successfully", linkedInUser };
                } catch (error) {
                    console.error("Error fetching LinkedIn user profile:", error.response?.data || error.message);
                    throw new Error("Failed to fetch LinkedIn user profile.");
                }
            } else {
                return { success: false, message: "Failed to get access token" };
            }
        } catch (error) {
            console.error("Error getting access token:", error.response?.data || error.message);
            return { success: false, message: "Error getting access token" };
        }
    },

    async getPartnerships(req, res) {
        const userId = req.user.id;
        const user = await UserRepository.findUserById(userId);
        if (!user) return { message: 'User not found' };

        // Find 'done' campaigns 
        const campaigns = await CampaignRepository.findCampaignsByBrandId(userId);
        if (!campaigns) return { message: 'No campaigns found' };

        // Find 'done' products
        console.log(campaigns)

        // return partnerships;
    }

};


export default UserService;