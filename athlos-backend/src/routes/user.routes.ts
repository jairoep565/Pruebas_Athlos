import { Router } from "express";
import { getProfile, updateProfile, updateEnvironment } from "../controllers/user.controller";

const router = Router();

router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/environment", updateEnvironment);

export default router;
