import express from "express";
import http from "http";
import https from "https";
import dotenv from "dotenv";
import { Server as SocketIo } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import passport from "passport";
import session from "express-session";
import path from "path";
import fs from "fs";
import routes from "./src/routes/index.js";
import mongoose from "mongoose";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;
const __dirname = path.resolve();

const isProduction = process.env.DOMAIN === "https://b2b-api.peakalign.app";

// Create HTTP or HTTPS server
const server = isProduction
    ? http.createServer({
        cert: fs.readFileSync("/etc/letsencrypt/live/b2b-api.peakalign.app/fullchain.pem"),
        key: fs.readFileSync("/etc/letsencrypt/live/b2b-api.peakalign.app/privkey.pem"),
    }, app)
    : http.createServer(app);

// Socket.IO setup
const io = new SocketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

import './src/utils/cronScheduler.js';

// Global Middlewares
app.use(express.json());
app.use(cors({ origin: "*", credentials: true }));
app.use(helmet());
app.use(morgan("dev"));
app.use(session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true,
}));
app.use(passport.initialize());
app.use(passport.session());

// Static Files
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
    setHeaders: res => res.set("Cross-Origin-Resource-Policy", "cross-origin"),
}));

app.use(express.static(path.join(__dirname, "public"), {
    setHeaders: res => res.set("Cross-Origin-Resource-Policy", "cross-origin"),
}));

// API Routes
app.use("/api", routes);

// Default Route
app.get("/", (req, res) => res.send("🚀"));

const activeUsers = new Map(); // Map<socketId, { userId, connectedAt }>
const lastSeen = new Map(); // Map<userId, timestamp>

// Socket.IO Events
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    socket.on("join", (userId) => {
        console.log(`User ${userId} joined the chat`);
        activeUsers.set(socket.id, {
            userId,
            connectedAt: new Date(),
        });

        // Send updated active users with timestamps
        const usersWithTimes = [...activeUsers.values()].map(user => ({
            userId: user.userId,
            connectedAt: user.connectedAt,
        }));

        io.emit("activeUsers", usersWithTimes);
        socket.join(userId);
    });
    socket.on("disconnect", () => {
        const user = activeUsers.get(socket.id);
        if (user) {
            lastSeen.set(user.userId, new Date());
            activeUsers.delete(socket.id);
        }

        const usersWithTimes = [...activeUsers.values()].map(user => ({
            userId: user.userId,
            connectedAt: user.connectedAt,
        }));

        io.emit("activeUsers", usersWithTimes);

        console.log("A user disconnected:", socket.id);
    });

});

app.set("lastSeen", lastSeen);

app.set("io", io);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected: ", new Date()))
    .catch((err) => console.error("MongoDB Connection Failed:", err));

// Start Server
server.listen(PORT, () => {
    console.log(`Server running on ${isProduction ? 'HTTPS' : 'HTTP'}://localhost:${PORT}`);
});
