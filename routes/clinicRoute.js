import express from "express";

import auth from "../middleware/auth.js";

import {
    getClinic,
    createClinic,
    updateClinic,
} from "../controllers/clinicController.js";

const router = express.Router();

router.get("/", getClinic);

router.post("/", auth, createClinic);

router.put("/", auth, updateClinic);

export default router;