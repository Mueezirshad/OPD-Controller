import jwt from "jsonwebtoken";

const generateToken = (doctorId) => {
    return jwt.sign(
        { id: doctorId },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d",
        }
    );
};

export default generateToken;