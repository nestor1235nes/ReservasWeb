import { Router } from "express";
import { getCalendarSync, setCalendarSync, clearCalendarSync } from "../controllers/calendarSync.controller.js";

const router = Router();

router.get("/:userId", getCalendarSync);
router.post("/:userId", setCalendarSync);
router.delete("/:userId/:type", clearCalendarSync);

export default router;