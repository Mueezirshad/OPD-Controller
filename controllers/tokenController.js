import { getIO } from "../socket.js"
import Patient from "../models/patient.js";
import Clinic from "../models/clinic.js";

// ===============================
// Helpers
// ===============================

const getToday = () => {
    return new Date().toISOString().split("T")[0];
};

const getCurrentTime = () => {
    return new Date().toLocaleTimeString("en-PK", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });
};

const recalculateQueue = async (clinic) => {

    const today = getToday();

    const waitingPatients = await Patient.find({
        visitDate: today,
        status: "Waiting",
    }).sort({
        emergency: -1,
        tokenNumber: 1,
    });

    let peopleAhead = 0;

    for (const patient of waitingPatients) {

        patient.peopleAhead = peopleAhead;

        patient.estimatedTime = peopleAhead * clinic.averageConsultationTime;

        await patient.save();

        peopleAhead++;

    }

};

// ===============================
// Reserve Token
// ===============================
export const reserveToken = async (req, res) => {
    try {
        const {
            patientName,
            phone,
            age,
            gender,
            emergency = false,
        } = req.body;

        // ==========================
        // Validation
        // ==========================

        if (!patientName || !phone || !age || !gender) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields.",
            });
        }

        if (patientName.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: "Invalid patient name.",
            });
        }

        if (!/^03\d{9}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: "Invalid phone number.",
            });
        }

        if (age < 1 || age > 120) {
            return res.status(400).json({
                success: false,
                message: "Invalid age.",
            });
        }

        // ==========================
        // Clinic
        // ==========================

        const clinic = await Clinic.findOne();

        if (!clinic) {
            return res.status(404).json({
                success: false,
                message: "Clinic not found.",
            });
        }

        // ==========================
        // Daily Reset
        // ==========================

        const today = getToday();

        if (clinic.lastResetDate !== today) {

            clinic.currentToken = 0;
            clinic.nextToken = 1;
            clinic.lastResetDate = today;

            await clinic.save();
        }

        // ==========================
        // Daily Token Limit
        // ==========================

        const bookedToday = await Patient.countDocuments({
            visitDate: today,
            status: { $ne: "Cancelled" },
        });

        if (bookedToday >= clinic.dailyLimit) {
            return res.status(400).json({
                success: false,
                message: "Sorry, today's tokens are full. Please visit tomorrow.",
            });
        }
// ==========================
// Clinic Timing Validation
// ==========================

const now = new Date();

const convertToMinutes = (time) => {
    const [timePart, period] = time.split(" ");
    let [hours, minutes] = timePart.split(":").map(Number);

    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    return hours * 60 + minutes;
};

const currentMinutes =
    now.getHours() * 60 + now.getMinutes();

const openingMinutes = convertToMinutes(clinic.openingTime);

const closingMinutes = convertToMinutes(clinic.closingTime);

if (
    currentMinutes < openingMinutes ||
    currentMinutes >= closingMinutes
) {
    return res.status(400).json({
        success: false,
        message: "Clinic is closed.",
    });
}
        // ==========================
        // Clinic Closed
        // ==========================

        if (clinic.clinicStatus === "Closed") {
            return res.status(400).json({
                success: false,
                message: "Clinic is closed.",
            });
        }

        // ==========================
        // Queue Paused
        // ==========================

        if (clinic.paused) {
            return res.status(400).json({
                success: false,
                message: "Queue is temporarily paused.",
            });
        }

        // ==========================
        // Duplicate Active Token
        // ==========================

        const activeToken = await Patient.findOne({
            phone,
            visitDate: today,
            status: {
                $in: ["Waiting", "Current"],
            },
        });

        if (activeToken) {
            return res.status(400).json({
                success: false,
                message: "You already have an active token.",
                tokenNumber: activeToken.tokenNumber,
            });
        }

        // ==========================
        // Cancelled Within Last 24 Hours
        // ==========================

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const recentlyCancelled = await Patient.findOne({
            phone,
            status: "Cancelled",
            updatedAt: { $gte: twentyFourHoursAgo },
        }).sort({ updatedAt: -1 });

        if (recentlyCancelled) {
            return res.status(400).json({
                success: false,
                message: "You cancelled your last token recently. Please try again after 24 hours.",
            });
        }

        // ==========================
        // Generate Token
        // ==========================

        const tokenNumber = clinic.nextToken;

        const patient = await Patient.create({
            tokenNumber,
            patientName,
            phone,
            age,
            gender,
            emergency,
            emergencyFee: emergency ? clinic.emergencyFee : 0,
            estimatedTime: 0,
            peopleAhead: 0,
            status: "Waiting",
            visitDate: today,
            bookingTime: getCurrentTime(),
        });

        clinic.nextToken += 1;

        await clinic.save();

        // Recalculate so emergency patients correctly jump ahead of
        // already-waiting regular patients, then re-read this patient's
        // real position for the response.

        await recalculateQueue(clinic);

        const updatedPatient = await Patient.findById(patient._id);

        // ==========================
        // Socket
        // ==========================

        const io = getIO();

        io.emit("queueUpdated");

        // ==========================
        // Response
        // ==========================

        if (emergency) {
            return res.status(201).json({
                success: true,
                message: "Please reach the clinic immediately.",
                patientName: updatedPatient.patientName,
                tokenNumber: updatedPatient.tokenNumber,
                currentToken: clinic.currentToken,
                peopleAhead: updatedPatient.peopleAhead,
                estimatedTime: updatedPatient.estimatedTime,
                emergency: true,
                emergencyFee: clinic.emergencyFee,
                status: updatedPatient.status,
            });
        }

        return res.status(201).json({
            success: true,
            message: "Token Reserved Successfully",
            patientName: updatedPatient.patientName,
            tokenNumber: updatedPatient.tokenNumber,
            estimatedTime: updatedPatient.estimatedTime,
            peopleAhead: updatedPatient.peopleAhead,
            currentToken: clinic.currentToken,
            emergency: updatedPatient.emergency,
            status: updatedPatient.status,
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }
};

// ===============================
// Current Queue
// ===============================

export const getCurrentQueue = async (req, res) => {
    try {
        const clinic = await Clinic.findOne();

        if (!clinic) {
            return res.status(404).json({
                success: false,
                message: "Clinic not found.",
            });
        }

        const waitingPatients = await Patient.countDocuments({
            visitDate: getToday(),
            status: "Waiting",
        });

        const emergencyPatients = await Patient.countDocuments({
            visitDate: getToday(),
            status: "Waiting",
            emergency: true,
        });

        const currentPatient = await Patient.findOne({
            visitDate: getToday(),
            status: "Current",
        });

        return res.status(200).json({
            success: true,

            currentToken: clinic.currentToken,

            nextToken: clinic.nextToken,

            paused: clinic.paused,

            clinicStatus: clinic.clinicStatus,

            waitingPatients,

            emergencyPatients,

            currentPatient,
        });
    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
// ===============================
// Next Token
// ===============================

export const nextToken = async (req, res) => {
    try {

        const clinic = await Clinic.findOne();

        if (!clinic) {
            return res.status(404).json({
                success: false,
                message: "Clinic not found."
            });
        }

        if (clinic.paused) {
            return res.status(400).json({
                success: false,
                message: "Queue is paused."
            });
        }

        const today = getToday();

        // Complete Current Patient

        const currentPatient = await Patient.findOne({
            visitDate: today,
            status: "Current"
        });

        if (currentPatient) {

            currentPatient.status = "Completed";
            currentPatient.completedAt = getCurrentTime();

            await currentPatient.save();
        }

        // Get Next Waiting Patient

        const nextPatient = await Patient.findOne({
            visitDate: today,
            status: "Waiting"
        }).sort({
            emergency: -1,
            tokenNumber: 1
        });

        if (!nextPatient) {

            return res.status(200).json({
                success: true,
                message: "No patient remaining."
            });

        }

        nextPatient.status = "Current";
        nextPatient.calledAt = getCurrentTime();

        await nextPatient.save();

        clinic.currentToken = nextPatient.tokenNumber;

        await clinic.save();

        // ============================
        // Recalculate Waiting Queue
        // ============================

        await recalculateQueue(clinic);

        // Socket

        const io = getIO();

        io.emit("queueUpdated");

        return res.status(200).json({

            success: true,

            message: "Next patient called.",

            patient: nextPatient

        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }
};
// ===============================
// Skip Token (patient did not show up)
// ===============================

export const skipToken = async (req, res) => {
    try {

        const clinic = await Clinic.findOne();

        if (!clinic) {
            return res.status(404).json({
                success: false,
                message: "Clinic not found.",
            });
        }

        const today = getToday();

        const currentPatient = await Patient.findOne({
            visitDate: today,
            status: "Current",
        });

        if (!currentPatient) {
            return res.status(400).json({
                success: false,
                message: "No patient is currently being attended.",
            });
        }

        currentPatient.status = "Skipped";

        await currentPatient.save();

        const nextPatient = await Patient.findOne({
            visitDate: today,
            status: "Waiting",
        }).sort({
            emergency: -1,
            tokenNumber: 1,
        });

        if (!nextPatient) {

            const io = getIO();

            io.emit("queueUpdated");

            return res.status(200).json({
                success: true,
                message: "Patient skipped. No patient remaining.",
            });
        }

        nextPatient.status = "Current";
        nextPatient.calledAt = getCurrentTime();

        await nextPatient.save();

        clinic.currentToken = nextPatient.tokenNumber;

        await clinic.save();

        await recalculateQueue(clinic);

        const io = getIO();

        io.emit("queueUpdated");

        return res.status(200).json({
            success: true,
            message: "Patient skipped, next patient called.",
            patient: nextPatient,
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }
};

// ===============================
// Cancel Token
// ===============================

export const cancelToken = async (req, res) => {

    try {

        const { id } = req.params;

        const clinic = await Clinic.findOne();

        if (!clinic) {

            return res.status(404).json({
                success: false,
                message: "Clinic not found.",
            });

        }

        const patient = await Patient.findById(id);

        if (!patient) {

            return res.status(404).json({
                success: false,
                message: "Patient not found.",
            });

        }

        // Sirf Waiting token cancel ho sakta hai

        if (patient.status !== "Waiting") {

            return res.status(400).json({
                success: false,
                message: "Only waiting token can be cancelled.",
            });

        }

        patient.status = "Cancelled";

        await patient.save();

        // Queue dobara calculate

        await recalculateQueue(clinic);

        // Socket

        const io = getIO();

        io.emit("queueUpdated");

        return res.status(200).json({

            success: true,

            message: "Token cancelled successfully."

        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};
// ===============================
// Pause Queue
// ===============================

export const pauseQueue = async (req, res) => {

    try {

        const clinic = await Clinic.findOne();

        if (!clinic) {

            return res.status(404).json({
                success: false,
                message: "Clinic not found.",
            });

        }

        clinic.paused = true;

        await clinic.save();

        // 🟢 REAL-TIME SOCKET EMIT (Queue pause hone par real-time update)
        try {
            const io = getIO();
            io.emit("queueUpdated");
        } catch (socketError) {
            console.log("Socket emit error:", socketError.message);
        }

        return res.status(200).json({
            success: true,
            message: "Queue paused.",
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }

};

// ===============================
// Resume Queue
// ===============================

export const resumeQueue = async (req, res) => {

    try {

        const clinic = await Clinic.findOne();

        if (!clinic) {

            return res.status(404).json({
                success: false,
                message: "Clinic not found.",
            });

        }

        clinic.paused = false;

        await clinic.save();

        // 🟢 REAL-TIME SOCKET EMIT (Queue resume hone par real-time update)
        try {
            const io = getIO();
            io.emit("queueUpdated");
        } catch (socketError) {
            console.log("Socket emit error:", socketError.message);
        }

        return res.status(200).json({
            success: true,
            message: "Queue resumed.",
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }

};
// ===============================
// Dashboard Stats
// ===============================

export const dashboardStats = async (req, res) => {
    try {
        const today = getToday();

        const clinic = await Clinic.findOne();

        if (!clinic) {

            return res.status(404).json({
                success: false,
                message: "Clinic not found.",
            });

        }

        const totalPatients = await Patient.countDocuments({
            visitDate: today,
        });

        const waitingPatients = await Patient.countDocuments({
            visitDate: today,
            status: "Waiting",
        });

        const completedPatients = await Patient.countDocuments({
            visitDate: today,
            status: "Completed",
        });

        const currentPatient = await Patient.findOne({
            visitDate: today,
            status: "Current",
        });

        const emergencyPatients = await Patient.countDocuments({
            visitDate: today,
            emergency: true,
            status: "Waiting",
        });

        return res.status(200).json({
            success: true,
            currentToken: clinic.currentToken,
            nextToken: clinic.nextToken,
            paused: clinic.paused,
            clinicStatus: clinic.clinicStatus,
            totalPatients,
            waitingPatients,
            completedPatients,
            emergencyPatients,
            currentPatient,
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }
};

// ===============================
// Waiting Patients
// ===============================

export const getWaitingPatients = async (req, res) => {
    try {

        const patients = await Patient.find({
            visitDate: getToday(),
            status: "Waiting",
        }).sort({
            emergency: -1,
            tokenNumber: 1,
        });

        return res.status(200).json({
            success: true,
            patients,
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }
};

// ===============================
// Completed Patients
// ===============================

export const getCompletedPatients = async (req, res) => {
    try {

        const patients = await Patient.find({
            visitDate: getToday(),
            status: "Completed",
        }).sort({
            tokenNumber: 1,
        });

        return res.status(200).json({
            success: true,
            patients,
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }
};

// ===============================
// Emergency Patients
// ===============================

export const getEmergencyPatients = async (req, res) => {
    try {

        const patients = await Patient.find({
            visitDate: getToday(),
            emergency: true,
            status: "Waiting",
        }).sort({
            createdAt: 1,
        });

        return res.status(200).json({
            success: true,
            patients,
        });

    } catch (error) {

        return res.status(500).json({
            success: false,
            message: error.message,
        });

    }
};
// ===============================
// Search My Token
// ===============================

export const searchMyToken = async (req, res) => {

    try {

        const { phone } = req.body;

        if (!phone) {

            return res.status(400).json({
                success: false,
                message: "Phone number is required."
            });

        }

        const clinic = await Clinic.findOne();

        const patient = await Patient.findOne({
            phone,
            visitDate: getToday(),
            status: {
                $in: ["Waiting", "Current"]
            }
        }).sort({
            tokenNumber: 1
        });

        if (!patient) {

            return res.status(404).json({
                success: false,
                message: "No active token found."
            });

        }

        return res.status(200).json({

            success: true,

            patientName: patient.patientName,

            tokenNumber: patient.tokenNumber,

            currentToken: clinic.currentToken,

            peopleAhead: patient.peopleAhead,

            estimatedTime: patient.estimatedTime,

            emergency: patient.emergency,

            status: patient.status

        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({

            success: false,

            message: error.message

        });

    }

};