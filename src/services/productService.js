import productRepository from "../repositories/productRepository.js";
import userRepository from "../repositories/userRepository.js";

const productService = {
    createProduct: async (data) => {
        return await productRepository.create(data);
    },

    getProductById: async (id) => {
        return await productRepository.findById(id);
    },

    getAllProducts: async () => {
        return await productRepository.findAll();
    },

    getProductsByBrand: async (brandId) => {
        return await productRepository.findByBrand(brandId);
    },

    updateProduct: async (id, data) => {
        return await productRepository.update(id, data);
    },

    deleteProduct: async (id) => {
        return await productRepository.delete(id);
    },

    rateProduct: async (id, userId, rating) => {
        const user = await userRepository.findUserById(userId);
        if (!user) throw new Error("User not found");

        if (user.userType !== "creator") {
            throw new Error("Only creators can rate products");
        }

        const product = await productRepository.findById(id);
        if (!product) return null;

        // Check if the user has already rated the product
        const existingRating = product.ratings.find((r) => r.userId.toString() === userId);

        if (existingRating) {
            throw new Error("User has already rated this product");
        } else {
            product.ratings.push({ userId, rating }); // Add a new rating
        }

        // Calculate the new average rating
        const totalRatings = product.ratings.reduce((acc, r) => acc + r.rating, 0);
        product.rating = totalRatings / product.ratings.length;

        return await productRepository.update(id, { ratings: product.ratings, rating: product.rating });
    }
};

export default productService;
