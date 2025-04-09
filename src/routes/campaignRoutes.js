import express from 'express';
const router = express.Router();

import CampaignController from '../controllers/campaignController.js';
import authenticate from '../middlewares/authenticate.js';
import authenticateBrand from '../middlewares/authenticateBrand.js';
import upload from "../middlewares/uploadMiddleware.js";

// Get all campaigns
router.get('/', authenticate, CampaignController.getAllCampaigns);

// Get related campaigns by brand ID
router.get('/related-cg', authenticate, CampaignController.getRelatedCampaigns);

// Get related campaigns for each creator
router.get('/related-cg/:creatorId', authenticate, CampaignController.getRelatedCampaignsForCreator);

// Get a single campaign by ID
router.get('/:campaignId', authenticate, CampaignController.getCampaignById);

// Apply to a campaign (requires authentication)
router.post('/:campaignId/apply', authenticate, CampaignController.applyToCampaign);

// Add to a campaign (requires brand authentication)
router.post('/:campaignId/add', authenticateBrand, CampaignController.addToCampaign);

// Create a new campaign
router.post('/', authenticateBrand, CampaignController.createCampaign);

// Remove a creator from a campaign
router.delete('/:campaignId/creators/:creatorId', authenticateBrand, CampaignController.removeCreator);

// Select a creator for a campaign
router.post('/:campaignId/select', authenticateBrand, CampaignController.selectCreator);

// Update a campaign
router.put('/:campaignId', authenticateBrand, CampaignController.updateCampaign);

// Delete a campaign
router.delete('/:campaignId', authenticateBrand, CampaignController.deleteCampaign);

// Rate a creator
router.post('/:campaignId/creators/:creatorId/rate', authenticateBrand, CampaignController.rateCreator);

// accept or reject a creator
router.put('/:campaignId/creators/:creatorId/:status', authenticateBrand, CampaignController.acceptCreator);

// Submit work for a campaign
router.post(
    '/:campaignId/creators/:creatorId/submit',
    authenticate,
    upload.fields([
        { name: "images", maxCount: 10 },
    ]),
    CampaignController.submitWork
);

// Accept work for a campaign
router.post('/:campaignId/creators/:creatorId/accept', authenticateBrand, CampaignController.acceptWork);

// Generate campaign post content
router.post('/generate-post', authenticate, CampaignController.generateCampaignPostContent);

// get post analytics from linkedin
router.get('/linkedin-analytics/:contentId', authenticate, CampaignController.getLinkedInAnalytics);

// get campaign analytics
router.get('/analytics/:campaignId', CampaignController.getCampaignAnalytics);

// generate carousel maker content
router.post('/generate-carousel', authenticate, CampaignController.generateCarouselMakerContent);

export default router;