import dotenv from "dotenv";
dotenv.config();

import http from "http";

import app from "./app.js";
import connectDB from "./config/database.js";
import { initializeSocket } from "./socket.js";

const PORT = process.env.PORT || 5000 ;

const server = http.createServer(app);

initializeSocket(server);
connectDB();

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});