import mongoose from "mongoose";

const patientSchema = new mongoose.Schema(
    {
        tokenNumber: {
            type: Number,
            required: true,
        },

        patientName: {
            type: String,
            required: true,
            trim: true,
        },

        phone: {
            type: String,
            required: true,
            trim: true,
        },

        age: {
            type: Number,
            required: true,
        },

        gender: {
            type: String,
            enum: ["Male", "Female", "Other"],
            required: true,
        },

        emergency: {
            type: Boolean,
            default: false,
        },

        emergencyFee: {
            type: Number,
            default: 0,
        },

        estimatedTime: {
            type: Number,
            default: 0,
        },

        peopleAhead: {
            type: Number,
            default: 0,
        },

        status: {
            type: String,
            enum: [
                "Waiting",
                "Current",
                "Completed",
                "Cancelled",
                "Skipped",
            ],
            default: "Waiting",
        },

        visitDate: {
            type: String,
            required: true,
        },

        bookingTime: {
            type: String,
            required: true,
        },

        calledAt: {
            type: String,
            default: "",
        },

        completedAt: {
            type: String,
            default: "",
        }
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Patient", patientSchema);