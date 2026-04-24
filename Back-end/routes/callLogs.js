const express = require("express");
const router = express.Router();
const CallLog = require("../models/CallLog");
const authenticate = require("../middleware/authentication");

// Get call history for current user
router.get("/history", authenticate, async (req, res) => {
  try {
    const logs = await CallLog.find({
      $or: [{ from: req.user._id }, { to: req.user._id }],
    })
      .populate("from", "username image")
      .populate("to", "username image")
      .sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching call logs" });
  }
});

// Delete a specific call log
router.delete("/:logId", authenticate, async (req, res) => {
  try {
    const log = await CallLog.findById(req.params.logId);
    if (!log) return res.status(404).json({ message: "Log not found" });
    if (
      log.from.toString() !== req.user._id.toString() &&
      log.to.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await log.deleteOne();
    res.json({ message: "Log deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting log" });
  }
});

module.exports = router;
