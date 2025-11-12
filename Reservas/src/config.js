export const PORT = process.env.PORT || 4000;
export const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/mern-tasks";
export const TOKEN_SECRET = process.env.TOKEN_SECRET || "secret";

export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// OAuth client used by frontend; backend uses this only to validate Google ID tokens
export const CLIENT_ID = process.env.CLIENT_ID || "738093538653-biv296rpnonvgfgpsg5033ediogqg5nd.apps.googleusercontent.com";

// Daily.co API key (store in env for production). Do NOT commit secrets to source control.
export const DAILY_API_KEY = process.env.DAILY_API_KEY || "";