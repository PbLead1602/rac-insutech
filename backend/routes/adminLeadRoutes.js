const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const {
  getAllLeads,
  updateLeadStatus,
  deleteLead,
  getLeadStats,
  saveWhatsappLead // NEW
} = require("../controllers/adminLeadController");

// ADMIN PROTECTED ROUTES
router.get("/leads", authMiddleware, getAllLeads);
router.put("/lead/:id", authMiddleware, updateLeadStatus);
router.delete("/lead/:id", authMiddleware, deleteLead);
router.get("/stats", authMiddleware, getLeadStats);

// PUBLIC WHATSAPP TRACKING ROUTE (NO AUTH)
router.post("/whatsapp-lead", saveWhatsappLead);

module.exports = router;
