import express from "express";
import userRoutes from "./userRoutes.js";
import campaignRoutes from "./campaignRoutes.js";
import productRoutes from "./productRoutes.js";
import messageRoutes from "./messageRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import invoiceRoutes from "./invoiceRoutes.js";

const router = express.Router();

router.use("/users", userRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/products", productRoutes);
router.use("/messages", messageRoutes);
router.use("/notifications", notificationRoutes);
router.use("/invoices", invoiceRoutes)

export default router;