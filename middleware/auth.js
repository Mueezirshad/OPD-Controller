import jwt from "jsonwebtoken";
import Doctor from "../models/doctor.js";

const auth = async (req, res, next) => {
    try {
        let token = req.headers.authorization;

        if (!token || !token.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        token = token.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const doctor = await Doctor.findById(decoded.id).select("-password");

        if (!doctor) {
            return res.status(401).json({
                success: false,
                message: "Doctor not found",
            });
        }

        req.doctor = doctor;

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid Token",
        });
    }
};

export default auth;