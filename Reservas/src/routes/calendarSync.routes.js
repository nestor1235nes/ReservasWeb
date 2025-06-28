import { Router } from "express";
import { getCalendarSync, setCalendarSync } from "../controllers/calendarSync.controller.js";

const router = Router();

router.get("/:userId", getCalendarSync);
router.post("/:userId", setCalendarSync);

export default router;