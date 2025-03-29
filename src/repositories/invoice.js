import Invoice from "../models/invoice.js";

const InvoiceRepository = {
    async createInvoice(invoiceData) {
        return await Invoice.create(invoiceData);
    },

    async findInvoiceById(invoiceId) {
        return await Invoice.findById(invoiceId);
    },

    async findInvoicesByBrandId(brandId) {
        return await Invoice.find({ brandId });
    },

    async updateInvoice(invoiceId, updateData) {
        return await Invoice.findByIdAndUpdate(invoiceId, updateData, { new: true });
    },

    async deleteInvoice(invoiceId) {
        return await Invoice.findByIdAndDelete(invoiceId);
    }
};

export default InvoiceRepository;
