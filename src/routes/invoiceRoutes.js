import express from 'express';
const router = express.Router();
import razorpay from '../utils/razorpayInstance.js';
import crypto from 'crypto';
import campaign from '../models/campaign.js';
import user from '../models/user.js';

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
        res.status(500).json({ error: err.message });
    }
});


router.post('/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, campaignId, userId } = req.body;

    const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + '|' + razorpay_payment_id)
        .digest('hex');

    if (generated_signature === razorpay_signature) {
        // Payment is successful, handle your business logic here
        const invoice = 

        res.json({ success: true });
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
