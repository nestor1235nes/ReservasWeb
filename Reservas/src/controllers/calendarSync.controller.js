import CalendarSync from "../models/calendarSync.model.js";

export const getCalendarSync = async (req, res) => {
  try {
    const { userId } = req.params;
    let sync = await CalendarSync.findOne({ user: userId });
    if (!sync) sync = await CalendarSync.create({ user: userId });
    res.json({ google: sync.google, ical: sync.ical });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const setCalendarSync = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, email } = req.body;
    if (!["google", "ical"].includes(type)) return res.status(400).json({ error: "Tipo inválido" });
    let sync = await CalendarSync.findOne({ user: userId });
    if (!sync) sync = await CalendarSync.create({ user: userId });
    sync[type] = email;
    await sync.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};