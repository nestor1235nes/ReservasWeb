import jwt from "jsonwebtoken";
import { TOKEN_SECRET } from "../config.js";

export const auth = (req, res, next) => {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers?.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.toLowerCase().startsWith('bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token)
      return res
        .status(401)
        .json({ message: "No token, authorization denied" });

    jwt.verify(token, TOKEN_SECRET, (error, user) => {
      if (error) {
        return res.status(401).json({ message: "Token is not valid" });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
