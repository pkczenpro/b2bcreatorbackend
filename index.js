import express from "express";
import http from "http";
import dotenv from "dotenv";
import { Server as SocketIo } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import passport from "passport";
import session from "express-session";
import path from "path";
import fs from "fs";
import routes from "./src/routes/index.js";

// Load environment variables
dotenv.config();
const PORT = process.env.PORT || 8000;
const __dirname = path.resolve();

// Initialize Express app
const app = express();


// SOCKET IO CONFIG FOR SERVER ACTIVATE ONCE DEPLOYING
const pathToCert = "/etc/letsencrypt/live/b2b-api.peakalign.app/";
const options = {
  cert: fs.readFileSync(`${pathToCert}fullchain.pem`),
  key: fs.readFileSync(`${pathToCert}privkey.pem`),
};
const server = http.createServer(options, app);

// const server = http.createServer(app);

// Socket.IO setup
const io = new SocketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Middleware
app.use(express.json());
app.use(cors({ origin: "*", credentials: true }));
app.use(helmet());
app.use(morgan("dev"));
app.use(session({ secret: process.env.JWT_SECRET, resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Static file serving
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res) => res.set("Cross-Origin-Resource-Policy", "cross-origin")
}));

// static public folder
app.use(express.static(path.join(__dirname, "public"), {
    setHeaders: (res) => res.set("Cross-Origin-Resource-Policy", "cross-origin")
}));

// Routes
app.use("/api", routes);
app.get("/", (req, res) => res.send("Hello World"));

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join", (userId) => {
        console.log(`User ${userId} joined the chat`);
        socket.join(userId); // Join user-specific room
    });

    socket.on("send_message", ({ sender, receiver, message }) => {
        console.log(`Message from ${sender} to ${receiver}: ${message}`);

        // Emit the message to the receiver's room
        io.to(receiver).emit("message", { from: sender, text: message, isSender: false });
    });

    socket.on("disconnect", () => {
        console.log("A user disconnected:", socket.id);
    });
});

app.set('io', io);
// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected: ", new Date()))
    .catch((err) => console.error("MongoDB Connection Failed:", err));

// Start Server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));


