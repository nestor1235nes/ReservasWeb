import mongoose from "mongoose";

const CalendarSyncSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  google: { type: String, default: null },
  ical: { type: String, default: null }
});

const CalendarSync = mongoose.model("CalendarSync", CalendarSyncSchema);
export default CalendarSync;