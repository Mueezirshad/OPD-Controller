import { Server } from "socket.io";

let io;

export const initializeSocket = (server) => {

    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT", "DELETE"]
        }
    });

    io.on("connection", (socket) => {

        console.log("Socket Connected :", socket.id);

        socket.on("disconnect", () => {
            console.log("Socket Disconnected :", socket.id);
        });

    });

};

export const getIO = () => {

    if (!io) {
        throw new Error("Socket.IO not initialized.");
    }

    return io;

};