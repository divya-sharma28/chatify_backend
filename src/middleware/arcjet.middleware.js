import aj from "../lib/arcjet.js";
import { isSpoofedBot } from "@arcjet/inspect";

export const arcjetProtection = async (req, res, next) => {
  try {
    const decision = await aj.protect(req);


    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return res.status(429).json({ message: "Too many requests" });
      } else if (decision.reason.isBot()) {
        return res.status(403).json({ message: "Bot access denied" });
      } else {
        return res.status(403).json({
          message: "Access denied by security policy",
        });
      }
    }

    // check spoof bots
    if (decision.results.some(isSpoofedBot)) {
      return res.status(403).json({
        error: "Spoof bot detected",
        message: "Malicious bot activity detected",
      });
    }
    next();
  } catch (error) {
    console.error("Arcjet middleware error:", error);
  }
};
