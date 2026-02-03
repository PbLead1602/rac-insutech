import React from "react";
import axios from "axios";
import "../styles/style.css";

function WhatsappButton() {

  const whatsappNumber = "919130958594";

  const handleWhatsappClick = async () => {

    try {

      await axios.post("http://localhost:5000/api/admin/whatsapp-lead", {
        sourcePage: window.location.pathname
      });

    } catch (err) {
      console.log("WhatsApp tracking failed");
    }

    window.open(
      `https://wa.me/${whatsappNumber}?text=Hi%20RAC%20Insutech,%20I%20need%20insulation%20service`,
      "_blank"
    );
  };

  return (
    <button onClick={handleWhatsappClick} className="whatsapp-float">
      <i className="bi bi-whatsapp"></i>
    </button>
  );
}

export default WhatsappButton;
