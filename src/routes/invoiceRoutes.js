import express from 'express';
const router = express.Router();
import razorpay from '../utils/razorpayInstance.js';
import crypto from 'crypto';
import campaign from '../models/campaign.js';
import user from '../models/user.js';
import Invoice from '../models/invoice.js';

router.post('/create-order', async (req, res) => {
    try {
        const options = {
            amount: req.body.amount * 100,
            currency: 'INR',
            receipt: 'order_rcptid_11',
        };

        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.error.description });
    }
});


router.post('/verify-payment', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId } = req.body;

    const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

    if (generated_signature === razorpay_signature) {
        try {
            const invoice = await Invoice.findById(invoiceId);
            if (!invoice) {
                return res.status(404).json({ success: false, message: 'Invoice not found' });
            }
            invoice.status = 'paid';
            invoice.razorpayPaymentId = razorpay_payment_id;
            invoice.razorpayOrderId = razorpay_order_id;
            await invoice.save();

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    } else {
        res.status(400).json({ success: false, message: 'Invalid signature' });
    }
});


router.get('/invoice-details/:campaignId/:userEmail', async (req, res) => {
    const { campaignId, userEmail } = req.params;

    const campaignItem = await campaign.findById(campaignId);
    if (!campaignItem) {
        return res.status(404).json({ message: 'Campaign not found' });
    }

    const userData = await user.findById(userEmail);
    if (!userData) {
        return res.status(404).json({ message: 'User not found' });
    }

    const selectedCreator = campaignItem.selectedCreators.find((item) => {
        return item.creatorId.toString() === userData._id.toString();
    });

    const invoiceDetails = {
        campaignName: campaignItem.title,
        profileImage: userData.profileImage,
        userName: userData.name,
        amount: selectedCreator.amount,
        status: campaignItem.status,
        content: selectedCreator.content,
    };

    res.json(invoiceDetails);
});



export default router;
