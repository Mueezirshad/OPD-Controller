import express from "express";
import {
    registerDoctor,
    loginDoctor,
    getDoctorProfile,
} from "../controllers/authController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/register", registerDoctor);

router.post("/login", loginDoctor);

router.get("/profile", auth, getDoctorProfile);

export default router;