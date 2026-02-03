const Contact = require("../models/Contact");
const { Sequelize } = require("sequelize");


// ===========================
// GET ALL LEADS (PAGINATION)
// ===========================
exports.getAllLeads = async (req, res) => {

  try {

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Contact.findAndCountAll({
      order: [["createdAt", "DESC"]],
      limit,
      offset
    });

    res.json({
      leads: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });

  } catch (error) {
    res.status(500).json({ message: "Failed to fetch leads" });
  }
};


// ===========================
// UPDATE STATUS
// ===========================
exports.updateLeadStatus = async (req, res) => {

  try {

    const { status } = req.body;
    const { id } = req.params;

    await Contact.update(
      { status },
      { where: { id } }
    );

    res.json({ message: "Status Updated" });

  } catch (error) {
    res.status(500).json({ message: "Status update failed" });
  }

};


// ===========================
// DELETE LEAD
// ===========================
exports.deleteLead = async (req, res) => {

  try {

    const { id } = req.params;

    await Contact.destroy({ where: { id } });

    res.json({ message: "Lead Deleted" });

  } catch (error) {
    res.status(500).json({ message: "Delete failed" });
  }

};


// ===========================
// DASHBOARD STATS (CHART)
// ===========================
exports.getLeadStats = async (req, res) => {

  try {

    const stats = await Contact.findAll({
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    const formattedStats = stats.reduce((acc, curr) => {
      acc[curr.status] = curr.get('count');
      return acc;
    }, {});

    res.json(formattedStats);

  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ message: "Error fetching statistics" });
  }
};


// ===========================
// SAVE WHATSAPP LEAD
// ===========================
exports.saveWhatsappLead = async (req, res) => {

  try {

    const { sourcePage } = req.body;

    await Contact.create({
      name: "WhatsApp User",
      email: "N/A",
      phone: "N/A",
      message: `Clicked WhatsApp from ${sourcePage}`,
      product: "N/A",
      source: "WHATSAPP",
      status: "NEW"
    });

    res.json({ success: true });

  } catch (error) {

    console.error("WhatsApp Lead Error:", error);
    res.status(500).json({ message: "WhatsApp lead save failed" });

  }
};
