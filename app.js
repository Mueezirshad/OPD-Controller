import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoute.js";
import clinicRoutes from "./routes/clinicRoute.js";
import tokenRoutes from "./routes/tokenRoute.js";

const app = express();

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use((req, res, next) => {
    req.body = req.body || {};
    next();
});

app.use("/api/auth", authRoutes);
app.use("/api/clinic", clinicRoutes);
app.use("/api/token", tokenRoutes);

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "🚀 OPD Controller Backend Running..."
    });
});


export default app;