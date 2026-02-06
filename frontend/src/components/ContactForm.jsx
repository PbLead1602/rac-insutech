import React, { useState } from "react";
import API from "../services/api";
import "../styles/style.css";

function ContactForm({ darkBackground = false }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [status, setStatus] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setStatus("loading");

  try {
    const res = await API.post("/api/contact", formData);

    if (res.data.success) {
      setStatus("success");

      // WhatsApp message
      const whatsappNumber = "919130958594"; // <-- replace with your number

      const message = `
          New Lead - RAC Insutech
          Name: ${formData.name}
          Email: ${formData.email}
          Phone: ${formData.phone}
          Message: ${formData.message}
          `;

      const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        message
      )}`;

      // Open WhatsApp after submit
      window.open(whatsappURL, "_blank");

      setFormData({
        name: "",
        email: "",
        phone: "",
        message: "",
      });
    }
  } catch (err) {
    console.error(err);
    setStatus("error");
  }
};

  return (
    <div className="container my-4">
      <h3 className={`text-center mb-4 ${darkBackground ? 'text-white' : 'section-title'}`}>
        Get in Touch
      </h3>
      <form className="col-md-8 mx-auto" onSubmit={handleSubmit}>
        <div className="mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Full Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <input
            type="email"
            className="form-control"
            placeholder="Email Address"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Phone Number"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>
        <div className="mb-3">
          <textarea
            className="form-control"
            rows="4"
            placeholder="Your Message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
          ></textarea>
        </div>
        <div className="text-center">
          <button type="submit" className="btn btn-primary">
            {status === "loading" ? "Sending..." : "Send Message"}
          </button>
        </div>

        {status === "success" && (
          <div className="alert alert-success mt-3 text-center">
            ✅ Thank you! Our team will contact you shortly.
          </div>
        )}
        {status === "error" && (
          <div className="alert alert-danger mt-3 text-center">
            ❌ Something went wrong. Please try again.
          </div>
        )}
      </form>
    </div>
  );
}

export default ContactForm;
