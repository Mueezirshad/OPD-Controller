import bcrypt from "bcryptjs";
import Doctor from "../models/doctor.js";
import generateToken from "../utils/generateToken.js";

export const registerDoctor = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const exists = await Doctor.findOne({ email });

        if (exists) {
            return res.status(400).json({
                success: false,
                message: "Doctor already exists",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const doctor = await Doctor.create({
            fullName,
            email,
            password: hashedPassword,
        });

        res.status(201).json({
            success: true,
            message: "Doctor registered successfully",
            token: generateToken(doctor._id),
            doctor: {
                id: doctor._id,
                fullName: doctor.fullName,
                email: doctor.email,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const loginDoctor = async (req, res) => {
    try {
        const { email, password } = req.body;

        const doctor = await Doctor.findOne({ email });

        if (!doctor) {
            return res.status(400).json({
                success: false,
                message: "Invalid Email or Password",
            });
        }

        const match = await bcrypt.compare(password, doctor.password);

        if (!match) {
            return res.status(400).json({
                success: false,
                message: "Invalid Email or Password",
            });
        }

        res.status(200).json({
            success: true,
            token: generateToken(doctor._id),
            doctor: {
                id: doctor._id,
                fullName: doctor.fullName,
                email: doctor.email,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getDoctorProfile = async (req, res) => {
    res.status(200).json({
        success: true,
        doctor: req.doctor,
    });
};