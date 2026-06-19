import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {

    const { NODE_ENV } = process.env;
    if (!NODE_ENV) throw new Error("NODE_ENV is not set")
      
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true, //prevents XSS attacks: cross site scripting
    sameSite: "strict", //CSRF attacks
    secure: NODE_ENV === "production" ? true : false,
  });

  return token;
};
