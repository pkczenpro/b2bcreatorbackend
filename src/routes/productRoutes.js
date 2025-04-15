import express from "express";
import productController from "../controllers/productController.js";
import upload from "../middlewares/uploadMiddleware.js";
import authenticateBrand from "../middlewares/authenticateBrand.js";
import authenticate from "../middlewares/authenticate.js";

const router = express.Router();

router.post(
    "/",
    authenticateBrand,
    upload.fields([
        { name: "productLogo", maxCount: 1 },
        { name: "productImages", maxCount: 5 } // Allow up to 5 images
    ]),
    productController.createProduct
);
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);
router.get("/brand/:brandId", productController.getProductsByBrand);
router.put(
    "/:id",
    authenticateBrand,
    upload.fields([
        { name: "productLogo", maxCount: 1 },
        { name: "productImages", maxCount: 5 }
    ]),
    productController.updateProduct
);
router.delete("/:id", productController.deleteProduct);
router.post("/rate/:id", authenticate, productController.rateProduct);



export default router;
