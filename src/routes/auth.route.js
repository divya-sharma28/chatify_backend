import express from "express";
import {
  userLogin,
  userLogout,
  userProfile,
  userSignup,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { arcjetProtection } from "../middleware/arcjet.middleware.js";

const router = express.Router();

router.use(arcjetProtection); // apply Arcjet protection to all auth routes. if this is successful only then proceed to next routes
router.post("/login", userLogin);
router.post("/logout", userLogout);
router.post("/signup", userSignup);
router.put("/profile", protectRoute, userProfile);
router.get("/check", protectRoute, (req, res) =>
  res.status(200).json(req.user)
);

export default router;
