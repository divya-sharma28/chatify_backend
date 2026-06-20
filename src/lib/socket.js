import { Server } from "socket.io";
import http from "http";
import express from "express";
import { socketAuthMiddleware } from "../middleware/socket.auth.middleware.js";
import MessageModel from "../models/message.model.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});
// apply authentication middleware to all socket connections
io.use(socketAuthMiddleware);

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// this is for storing online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
  console.log("A user connected", socket.user.fullname);
  const userId = socket.userId;
  userSocketMap[userId] = socket.id;

  // used to send events to all connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Handle real-time message sending via socket.io
  socket.on("sendMessage", async (messageData) => {
    try {
      const { text, image, receiverID } = messageData;
      const senderID = socket.userId;

      if (!text && !image) {
        socket.emit("messageError", { message: "Message content is empty" });
        return;
      }

      // Save message to database
      const newMessage = new MessageModel({
        senderID,
        receiverID,
        text,
        image,
      });
      await newMessage.save();

      // Emit to receiver in real-time
      const receiverSocketId = userSocketMap[receiverID];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", newMessage);
      }

      // Confirm to sender
      socket.emit("messageSent", newMessage);
    } catch (error) {
      console.error("Error in sendMessage:", error);
      socket.emit("messageError", { message: "Failed to send message" });
    }
  });

  // with socket.on we listen events from clients
  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.user.fullname);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
