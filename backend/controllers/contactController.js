const Contact = require("../models/Contact");
const apiInstance = require("../config/email"); // Import the pre-configured Brevo instance

exports.submitForm = async (req, res) => {
  try {
    const { name, email, phone, message, product } = req.body;

    // 1️⃣ Validation - Matches your original logic
    if (!name || !email || !message) {
      return res.status(400).json({ error: "Please fill all required fields" });
    }

    // 2️⃣ Save lead in database - Matches your Sequelize Model + NEW fields
    const contact = await Contact.create({
      name,
      email,
      phone,
      message,
      product: product || "General Inquiry", // Handles the product field from your schema
      status: "NEW", // Default value from your ENUM
      source: "FORM", // Default value from your ENUM
    });

    // 3️⃣ Prepare Email Data for Brevo API
    // Admin Notification
    const adminEmail = {
      sender: { name: "RAC Website", email: process.env.FROM_EMAIL },
      to: [{ email: process.env.ADMIN_EMAIL }],
      subject: "🚀 New Lead Received - RAC Insutech",
      htmlContent: `
        <h2>New Lead Received</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Product:</b> ${product || "Not Specified"}</p>
        <p><b>Message:</b> ${message}</p>
        <hr/>
        <p>RAC Insutech Website Contact Form</p>
      `,
    };

    // Customer Auto-Reply
    const customerEmail = {
      sender: { name: "RAC Insutech", email: process.env.FROM_EMAIL },
      to: [{ email: email }],
      subject: "✅ We Received Your Enquiry - RAC Insutech",
      htmlContent: `
        <h3>Hello ${name},</h3>
        <p>Thank you for contacting <b>RAC Insutech</b>.</p>
        <p>Our team has received your enquiry and will contact you shortly.</p>
        <br/>
        <p><b>Regards,</b></p>
        <p>RAC Insutech Team</p>
        <p>📞 +91 9130958594</p>
        <p>📧 racinsutech@gmail.com</p>
      `,
    };

    // 4️⃣ Send both emails (Parallel)
    // Using a separate try/catch so database success isn't ruined by email hiccups
    try {
      await Promise.all([
        apiInstance.sendTransacEmail(adminEmail),
        apiInstance.sendTransacEmail(customerEmail),
      ]);
    } catch (emailError) {
      // Log the error but don't fail the request (the lead is already in the DB!)
      console.error("BREVO API ERROR:", emailError.response ? emailError.response.body : emailError);
    }

    // 5️⃣ Final success response
    res.status(200).json({
      success: true,
      message: "Form submitted successfully",
      contact,
    });

  } catch (error) {
    console.error("CONTACT FORM ERROR:", error);

    res.status(500).json({
      success: false,
      error: "Server error. Please try again later.",
    });
  }
};