import express from "express";

import auth from "../middleware/auth.js";

import {
    reserveToken,
    getCurrentQueue,
    nextToken,
    skipToken,
    pauseQueue,
    resumeQueue,
    dashboardStats,
getWaitingPatients,
getCompletedPatients,
getEmergencyPatients,
cancelToken,
searchMyToken
} from "../controllers/tokenController.js";

const router = express.Router();

router.post("/reserve", reserveToken);

router.post("/search", searchMyToken);

router.get("/current", getCurrentQueue);

router.put("/next", auth, nextToken);

router.put("/skip", auth, skipToken);

router.put("/pause", auth, pauseQueue);

router.put("/resume", auth, resumeQueue);

router.get("/dashboard", auth, dashboardStats);

router.get("/waiting", auth, getWaitingPatients);

router.get("/completed", auth, getCompletedPatients);

router.get("/emergency", auth, getEmergencyPatients);

router.put("/cancel/:id", cancelToken);

export default router;