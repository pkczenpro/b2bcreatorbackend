import UserService from "../services/userService.js";

const UserController = {
    async register(req, res) {
        try {
            const user = await UserService.registerUser(req.body);
            res.status(201).json({
                message: "Welcome aboard! Your account has been created successfully. Please check your email to verify your account.",
                user,
            });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async verifyAccount(req, res) {
        try {
            const response = await UserService.verifyAccount(req.query.token);
            res.json(response);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async login(req, res) {
        try {
            const { token, user } = await UserService.loginUser(req.body.userType, req.body.email, req.body.password);
            res.json({ token, user });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async loginWithLinkedIn(req, res) {
        try {
            const authtype = req.query.authtype;
            const { token, user } = await UserService.loginWithLinkedIn(req.body, authtype);
            res.json({ token, user });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async loginWithGoogle(req, res) {
        try {
            const { token, user, } = await UserService.loginWithGoogle(req.body);
            res.json({ token, user });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async sendPasswordResetLink(req, res) {
        try {
            const response = await UserService.sendPasswordResetLink(req.body.email);
            res.json(response);
        }
        catch (error) {
            res.status(404).json({ error: error.message });
        }
    },

    async resetPassword(req, res) {
        try {
            const response = await UserService.resetPassword(req.query.token, req.body.newPassword);
            res.json(response);
        }
        catch (error) {
            res.status(404).json({ error: error.message });
        }
    },

    async update(req, res) {
        try {
            const user_id = req.user.id
            const user = await UserService.updateUser(req, user_id, req.body);
            res.json({
                success: true,
                message: "Your changes have been saved successfully",
                user,
            });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async getUserDetails(req, res) {
        try {
            const user_id = req.user.id
            const user = await UserService.getUserDetails(user_id);
            console.log(user)
            res.json({
                ...user._doc,
                unreadMessages: user.unReadMessages,
            });
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    },

    async completeUserSetup(req, res) {
        try {
            const userId = req.user.id;
            const user = await UserService.completeUserSetup(req, userId, req.body);
            res.json(user);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async deleteUser(req, res) {
        try {
            const user = await UserService.deleteUser(req.params.id);
            res.json(user);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    },

    async handleUserField(req, res) {
        try {
            const { userId, field, operation, itemId } = req.params;
            const data = req.body;

            if (req.file) {
                data.image = `/uploads/${req.file.filename}`;
            }

            // Call the service method
            const result = await UserService.handleUserField({
                userId,
                field,
                operation,
                itemId: itemId || null,
                data: data || null,
            });

            const labels = {
                services: "AVAILABLE SERVICES",
                previousWork: "PREVIOUS PARTNERSHIPS",
                stats: "STATISTICS",
                calendar: "EVENTS CALENDAR",
                featuredWork: "FEAUTERED WORK",
                testimonials: "TESTIMONIALS",
                textBlock: "ABOUT ME Section",
            }


            return res.status(200).json({
                success: true,
                data: result,
                message: `Your ${labels[field]} has been ${operation === "add" ? "added" : operation === "update" ? "updated" : "deleted"} successfully`,
            });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    },

    async getCreators(req, res) {
        try {
            const creators = await UserService.getCreators();
            // name, location, followers, engagment, linkedin, website, image, desc. tags
            const data = creators.map(creator => {
                return {
                    _id: creator._id,
                    name: creator.name || "",
                    email: creator.email || "",
                    location: creator.location || "",
                    followers: creator.followers || 0,
                    engagement: creator.engagement || 0,
                    platforms: creator.socialMediaLinks || [],
                    image: creator.profileImage || "",
                    description: creator.bio || "",
                    tags: creator.tags || [],
                };
            });

            res.json(data);
        } catch (error) {
            console.log(error)
            res.status(400).json({ error: error.message });
        }
    },

    async getCreatorById(req, res) {
        try {
            const creator = await UserService.getCreatorById(req.params.id);
            const data = {
                _id: creator._id,
                name: creator.name || "",
                email: creator.email || "",
                location: creator.location || "",
                userType: creator.userType || "",
                profileName: creator.profileName || "",
                profileImage: creator.profileImage || process.env.DOMAIN + "/default.png",
                coverImage: creator.coverImage || "",
                socialMediaLinks: creator.socialMediaLinks || [],
                bio: creator.bio || "",
                tags: creator.tags || [],
                reviews: creator.reviews || [],
                services: creator.services || [],
                previousWork: creator.previousWork || [],
                stats: creator.stats || [],
                calendar: creator.calendar || [],
                featuredWork: creator.featuredWork || [],
                testimonials: creator.testimonials || [],
                textBlock: creator.textBlock || [],
            }
            res.json(data);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async getBrands(req, res) {
        try {
            const brands = await UserService.getBrands();
            const data = brands.map(creator => {
                return {
                    _id: creator._id,
                    name: creator.name || "",
                    email: creator.email || "",
                    region: creator.location || "",
                    followers: creator.followers || 0,
                    engagement: creator.engagement || 0,
                    platforms: creator.socialMediaLinks || [],
                    image: creator.profileImage || "",
                    description: creator.bio || "",
                    tags: creator.tags || [],
                    category: creator.category || "",
                    subCategory: creator.subCategory || "",
                    socialMediaLinks: creator.socialMediaLinks || [],
                };
            });
            res.json(data);
        } catch (error) {
            console.log(error)
            res.status(400).json({ error: error.message });
        }
    },

    async getBrandById(req, res) {
        try {
            const brand = await UserService.getBrandById(req.params.id);
            res.json(brand);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    // async shareContent(req, res) {
    //     try {
    //         const response = await UserService.shareContent(req, res);
    //         res.json(response);
    //     } catch (error) {
    //         res.status(400).json({ error: error.message });
    //     }
    // },

    // async getSharedContent(req, res) {
    //     try {
    //         const response = await UserService.getSharedPosts(req, res);
    //         res.json(response);
    //     } catch (error) {
    //         res.status(400).json({ error: error.message });
    //     }
    // },


    async followBrand(req, res) {
        try {
            const response = await UserService.followBrand(req, res);
            res.json(response);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async getAccessToken(req, res) {
        try {
            const response = await UserService.getAccessToken(req, res);
            res.json(response);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    },

    async getPartnerships(req, res) {
        try {
            const response = await UserService.getPartnerships(req, res);
            res.json(response);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
};

export default UserController;