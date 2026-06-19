import MessageModel from "../models/message.model.js";
import UserModel from "../models/user.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId } from "../lib/socket.js";
import { io } from "../lib/socket.js";

export const getAllContacts = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUser = await UserModel.find({
      _id: { $ne: loggedInUserId },
    }).select("-password");
    res.status(200).json(filteredUser);
  } catch (error) {
    console.error("Error in getAllContacts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getChatPartners = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const messages = await MessageModel.find({
      $or: [{ senderID: loggedInUserId }, { receiverID: loggedInUserId }],
    });
    const partnerIds = new Set();
    messages.forEach((msg) => {
      if (msg.senderID.toString() !== loggedInUserId.toString()) {
        partnerIds.add(msg.senderID.toString());
      }
      if (msg.receiverID.toString() !== loggedInUserId.toString()) {
        partnerIds.add(msg.receiverID.toString());
      }
    });
    const chatPartners = await UserModel.find({
      _id: { $in: Array.from(partnerIds) },
    }).select("-password");
    res.status(200).json(chatPartners);
  } catch (error) {
    console.error("Error in getChatPartners:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMessagesByUserId = async (req, res) => {
  try {
    const myID = req.user._id;
    const otherUserID = req.params.id;

    const messages = await MessageModel.find({
      $or: [
        { senderID: myID, receiverID: otherUserID },
        { senderID: otherUserID, receiverID: myID },
      ],
    });
    res.status(200).json(messages);
  } catch (error) {
    console.error("Error in getMessagesByUserId:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const sendMessageToUserId = async (req, res) => {
  try {
    const { text, image } = req.body;
    const senderID = req.user._id;
    const receiverID = req.params.id;

    if (!text && !image) {
      return res.status(400).json({ message: "Message content is empty" });
    }
    if (senderID.equals(receiverID)) {
      return res
        .status(400)
        .json({ message: "Cannot send message to yourself" });
    }

    const receiverExists = await UserModel.findById(receiverID);
    if (!receiverExists) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    let imageURL;
    if (image) {
      const uploadedImage = await cloudinary.uploader.upload(image);
      imageURL = uploadedImage.secure_url;
    }

    const newMessage = new MessageModel({
      senderID,
      receiverID,
      text,
      image: imageURL,
    });
    await newMessage.save();

    const receiverSocektId = getReceiverSocketId(receiverID);
    if (receiverSocektId) {
      io.to(receiverSocektId).emit("newMessage", newMessage);
    }
    // todo: send message via socket.io real-time
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error in getAllContacts:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
