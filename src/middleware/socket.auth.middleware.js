import jwt from "jsonwebtoken";
import UserModel from "../models/user.model.js";

export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.headers.cookie
      ?.split("; ")
      .find((d) => d.startsWith("jwt="))
      ?.split("=")[1];

    if (!token) {
      console.log("Socket connection rejected: token not found");
      return next(new Error("Unauthorized - token not found"));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      console.log("Socket connection rejected: Invalid token");
      return next(new Error("Unauthorized - Invalid token"));
    }
    // find the user from db
    const user = await UserModel.findById(decoded.userId).select("-password");

    if (!user) {
      console.log("Socket connection rejected: user not found");
      return next(new Error("Unauthorized - user not found"));
    }

    // attach user info to socket
    socket.user = user;
    socket.userId = user._id.toString();

    console.log(
      `Socket authentication successful for user: ${user.fullname} ${user._id}`
    );
    next();
  } catch (error) {
    console.log("Error in socket authentication", error.message);
    next(new Error("Unauthorized - authentication failed"));
  }
};
