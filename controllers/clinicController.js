import Clinic from "../models/clinic.js";

export const getClinic = async (req, res) => {
    try {
        const clinic = await Clinic.findOne();

        res.status(200).json({
            success: true,
            clinic,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const createClinic = async (req, res) => {
    try {
        const exists = await Clinic.findOne();

        if (exists) {
            return res.status(400).json({
                success: false,
                message: "Clinic already exists",
            });
        }

        const clinic = await Clinic.create(req.body);

        res.status(201).json({
            success: true,
            message: "Clinic created successfully",
            clinic,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const updateClinic = async (req, res) => {
    try {
        const clinic = await Clinic.findOne();

        if (!clinic) {
            return res.status(404).json({
                success: false,
                message: "Clinic not found",
            });
        }

        Object.assign(clinic, req.body);

        await clinic.save();

        res.status(200).json({
            success: true,
            message: "Clinic updated successfully",
            clinic,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};