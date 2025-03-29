import productRepository from "../repositories/productRepository.js";

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
    }


};

export default productService;
