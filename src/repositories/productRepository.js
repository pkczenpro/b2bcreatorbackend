import Product from "../models/product.js";

const productRepository = {
    create: async (data) => {
        return await Product.create(data);
    },

    findById: async (id) => {
        return await Product.findById(id);
    },

    findByBrand: async (brandId) => {
        return await Product.find({ brandId });
    },

    findAll: async () => {
        return await Product.find();
    },

    update: async (id, data) => {
        return await Product.findByIdAndUpdate(id, data, { new: true });
    },

    delete: async (id) => {
        return await Product.findByIdAndDelete(id);
    }
};

export default productRepository;
