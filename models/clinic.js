import mongoose from "mongoose";

const clinicSchema = new mongoose.Schema(
    {
        clinicName: {
            type: String,
            required: true,
            trim: true,
        },

        doctorName: {
            type: String,
            required: true,
            trim: true,
        },

        qualification: {
            type: String,
            default: "",
        },

        phone: {
            type: String,
            default: "",
        },

        address: {
            type: String,
            default: "",
        },

        area: {
            type: String,
            default: "",
        },

        googleMapLink: {
            type: String,
            default: "",
        },

        openingTime: {
            type: String,
            default: "05:00 PM",
        },

        closingTime: {
            type: String,
            default: "10:00 PM",
        },

        averageConsultationTime: {
            type: Number,
            default: 6,
        },

        emergencyFee: {
            type: Number,
            default: 500,
        },

        clinicStatus: {
            type: String,
            enum: ["Open", "Break", "Closed"],
            default: "Open",
        },

        announcement: {
            type: String,
            default: "",
        },

        currentToken: {
            type: Number,
            default: 0,
        },

        nextToken: {
            type: Number,
            default: 1,
        },

        paused: {
            type: Boolean,
            default: false,
        },
        lastResetDate: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }

);

export default mongoose.model("Clinic", clinicSchema);