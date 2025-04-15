import express from "express";
import UserController from "../controllers/userController.js";
import authenticate from "../middlewares/authenticate.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.post("/register", UserController.register);
router.get("/verify-account", UserController.verifyAccount);

router.post("/login", UserController.login);

router.post("/login/linkedin", UserController.loginWithLinkedIn);
router.post("/login/google", UserController.loginWithGoogle);


router.get("/creators", UserController.getCreators);
router.get("/creator/:id", UserController.getCreatorById);
router.get("/brands", UserController.getBrands);
router.get("/brand/:id", UserController.getBrandById);

router.put("/user-update", authenticate, upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "coverImage", maxCount: 1 }
]), UserController.update);

router.get("/user", authenticate, UserController.getUserDetails);
router.delete("/:id", authenticate, UserController.deleteUser);

router.post("/send-password-reset-link", UserController.sendPasswordResetLink);
router.post("/reset-password", UserController.resetPassword);

router.post("/complete-onboarding", authenticate, upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "coverImage", maxCount: 1 }
]), UserController.completeUserSetup);

router.post("/:userId/:field/:operation/:itemId?", authenticate, upload.single("image"), UserController.handleUserField);

router.get("/follow-brand/:brandId", authenticate, UserController.followBrand);

router.post("/get-access-token", authenticate, UserController.getAccessToken);



export default router;