import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.route.js";
import msgRoutes from "./routes/msg.route.js";
import { connectDB } from "./lib/db.js";
import path from "path";
import cors from "cors";
import { app , server} from "./lib/socket.js";
dotenv.config();

const port = process.env.PORT || 4000;
// const app = express();
const __dirname = path.resolve();

app.use(express.json({ limit: "5mb" })); // to parse json body in requests content-type: application/json
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true, // to allow cookies to be sent from frontend to backend
  })
);
app.use(cookieParser());

app.set("trust proxy", true);

app.use("/api/auth", authRoutes);
app.use("/api/messages", msgRoutes);

// make ready for deployment
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  // in express 4 its app.get('*', ...)
  app.use((_, res) => {
    res.sendFile(path.resolve(__dirname, "../frontend/dist/index.html"));
  });
}
const startServer = async () => {
  try {
    await connectDB();

    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (err) {
    console.error(err);
  }
};

startServer();
// app.listen(port, () => {
//   console.log(`Server is running on http://localhost:${port}`);
//   connectDB();
// });
