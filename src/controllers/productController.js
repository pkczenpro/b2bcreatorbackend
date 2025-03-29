import product from "../models/product.js";
import productService from "../services/productService.js";

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

            const productLogo = req.files?.productLogo ? req.files.productLogo[0].filename : null;
            const productImages = req.files?.productImages ? req.files.productImages.map(file =>
                "/uploads/" + file.filename
            ) : [];
            const newProduct = new product({
                brandId: req.user.id, // Assuming authentication middleware sets `req.user`
                productName,
                productLogo: "/uploads/" + productLogo,
                publicVisibility,
                productDescription,
                productImages,
                productLink,
                loomVideoLink,
                g2Link,
                capterraLink,
                additionalDetails,
                productHunt,
            });

            await newProduct.save();
            res.status(201).json({ message: "Product created successfully!", product: newProduct });
        } catch (error) {
            console.log(error)
            res.status(500).json({ error: error.message });
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
            const product = await productService.updateProduct(req.params.id, req.body);
            if (!product) return res.status(404).json({ message: "Product not found" });
            res.json(product);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    deleteProduct: async (req, res) => {
        try {
            const product = await productService.deleteProduct(req.params.id);
            if (!product) return res.status(404).json({ message: "Product not found" });
            res.json({ message: "Product deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

export default productController;
