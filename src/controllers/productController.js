import product from "../models/product.js";
import UserRepository from "../repositories/userRepository.js";
import productService from "../services/productService.js";
import userService from "../services/userService.js";

const productController = {
    createProduct: async (req, res) => {
        try {
            const {
                productName,
                publicVisibility,
                productDescription,
                productLink,
                loomVideoLink,
                g2Link,
                capterraLink,
                additionalDetails,
                productHunt,
            } = req.body;

            // Validate required fields
            if (!productName) {
                return res.status(400).json({ message: "Product name is required." });
            }

            if (typeof publicVisibility === "undefined") {
                return res.status(400).json({ message: "Public visibility is required." });
            }

            if (!req.user?.id) {
                return res.status(401).json({ message: "Unauthorized. User ID not found." });
            }

            // Handle files safely
            const productLogoFile = req.files?.productLogo?.[0]?.filename;
            const productLogo = productLogoFile ? "/uploads/" + productLogoFile : null;

            const productImages = Array.isArray(req.files?.productImages)
                ? req.files.productImages.map(file => "/uploads/" + file.filename)
                : [];

            const productResources = Array.isArray(req.files?.resources)
                ? req.files.resources.map(file => "/uploads/" + file.filename)
                : [];

            const newProduct = new product({
                brandId: req.user.id,
                productName,
                productLogo,
                publicVisibility,
                productDescription: productDescription || "",
                productImages,
                productLink: productLink || "",
                loomVideoLink: loomVideoLink || "",
                g2Link: g2Link || "",
                capterraLink: capterraLink || "",
                additionalDetails: additionalDetails || "",
                productHunt: productHunt || "",
                resources: productResources,
            });

            await newProduct.save();
            return res.status(201).json({ message: "Product created successfully!", product: newProduct });

        } catch (error) {
            console.error("Error creating product:", error);
            return res.status(500).json({
                message: "An error occurred while creating the product.",
                error: error.message || error
            });
        }
    },

    getProductById: async (req, res) => {
        try {
            const product = await productService.getProductById(req.params.id);
            if (!product) return res.status(404).json({ message: "Product not found" });
            res.json(product);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    getAllProducts: async (req, res) => {
        try {
            const products = await productService.getAllProducts();
            res.json(products);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    getProductsByBrand: async (req, res) => {
        try {
            const products = await productService.getProductsByBrand(req.params.brandId);
            res.json(products);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    updateProduct: async (req, res) => {
        try {
            const {
                productName,
                publicVisibility,
                productDescription,
                productLink,
                loomVideoLink,
                g2Link,
                capterraLink,
                additionalDetails,
                productHunt,
            } = req.body;

            // Basic null/undefined checks on required fields
            if (!productName) {
                return res.status(400).json({ message: "Product name is required." });
            }

            if (typeof publicVisibility === "undefined") {
                return res.status(400).json({ message: "Public visibility status is required." });
            }

            // Handle files safely
            const productLogo = req.files?.productLogo?.[0]?.filename
                ? "/uploads/" + req.files.productLogo[0].filename
                : undefined;

            const productImages = Array.isArray(req.files?.productImages)
                ? req.files.productImages.map(file => "/uploads/" + file.filename)
                : undefined;

            const productResources = Array.isArray(req.files?.resources)
                ? req.files.resources.map(file => "/uploads/" + file.filename)
                : undefined;

            // Prepare the updated data object
            const updatedData = {
                productName,
                publicVisibility,
                productDescription: productDescription || "",
                productLink: productLink || "",
                loomVideoLink: loomVideoLink || "",
                g2Link: g2Link || "",
                capterraLink: capterraLink || "",
                additionalDetails: additionalDetails || "",
                productHunt: productHunt || "",
            };

            if (productLogo) updatedData.productLogo = productLogo;
            if (productImages) updatedData.productImages = productImages;
            if (productResources) updatedData.resources = productResources;

            // Check if the product ID is valid
            if (!req.params.id) {
                return res.status(400).json({ message: "Product ID is missing in request parameters." });
            }

            const product = await productService.updateProduct(req.params.id, updatedData);

            if (!product) {
                return res.status(404).json({ message: "Product not found or could not be updated." });
            }

            return res.json(product);

        } catch (error) {
            console.error("Error updating product:", error);
            return res.status(500).json({ message: "An unexpected error occurred while updating the product.", error: error.message || error });
        }
    },


    deleteProduct: async (req, res) => {
        try {
            const user = req.user;

            if (!user) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            if (user.userType !== "brand") {
                return res.status(403).json({ message: "Forbidden" });
            }

            const userData = await UserRepository.findUserById(user.id);
            if (!userData) {
                return res.status(404).json({ message: "User not found" });
            }

            const brandId = userData._id;

            const productData = await productService.getProductById(req.params.id);
            if (!productData) {
                return res.status(404).json({ message: "Product not found" });
            }

            if (productData.brandId.toString() !== brandId?.toString()) {
                return res.status(403).json({ message: "Forbidden" });
            }

            await productService.deleteProduct(req.params.id);

            return res.json({ message: "Product deleted successfully" });

        } catch (error) {
            console.error('Error deleting product:', error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    },


    rateProduct: async (req, res) => {
        try {
            const { rating } = req.body;
            const product = await productService.rateProduct(req.params.id, req.user.id, rating);
            if (!product) return res.status(404).json({ message: "Product not found" });
            res.json({ message: "Product rated successfully", product });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

export default productController;
