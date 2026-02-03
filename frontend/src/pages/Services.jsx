import React from "react";
import "../styles/style.css";

const benefits = [
  { icon: "🌡️", title: "Temperature Control", desc: "Reduces excessive heat in summers and cold in winters while maintaining stable indoor temperature." },
  { icon: "⚡", title: "Energy Efficiency", desc: "Minimizes HVAC usage and electricity consumption resulting in long-term operational savings." },
  { icon: "🏭", title: "Asset Protection", desc: "Protects machinery, equipment and stored goods from heat damage and fluctuations." },
  { icon: "💧", title: "Condensation Control", desc: "Prevents moisture buildup, corrosion, rusting and mold formation inside metal structures." },
  { icon: "👷", title: "Workplace Safety", desc: "Creates a comfortable environment reducing fatigue and heat stress for workers." },
  { icon: "🔊", title: "Noise Reduction", desc: "Provides acoustic insulation to reduce rain noise and machinery vibrations." },
];

function Services() {
  return (
    <div className="services-page pb-5">
      {/* Spacer for Fixed Navbar */}
      <div className="py-5"></div>

      <div className="container mt-5">
        {/* Header Section */}
        <div className="text-center mb-5 fade-in">
          <h2 className="section-title mb-2">Our Services</h2>
          <div className="bg-primary mx-auto mb-3" style={{ height: '3px', width: '60px' }}></div>
          <p className="lead text-dark mx-auto" style={{ maxWidth: '700px' }}>
            Professional Industrial Insulation Solutions Designed For Performance, Safety & Energy Efficiency
          </p>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-11">
            <div className="service-main-card">
              <div className="row">
                <div className="col-12">
                  <h3 className="fw-bold mb-4 text-primary">
                    Underdeck Insulation For Industrial & Commercial Structures
                  </h3>
                  <p className="text-secondary fs-5">
                    Underdeck insulation plays a critical role in Pre-Engineered Buildings (PEB) and metal roof structures such as 
                    factories, warehouses, poultry farms and industrial sheds.
                  </p>
                  
                  <div className="service-highlight-text">
                    Metal sheets transfer heat rapidly. Our high-grade insulation is essential to control indoor temperatures, 
                    improve workplace comfort, and dramatically reduce operational costs.
                  </div>
                </div>
              </div>

              {/* Benefits Grid */}
              <h4 className="fw-bold mt-5 mb-4 text-center text-dark">Why Choose Our Insulation?</h4>
              <div className="row g-4">
                {benefits.map((item, index) => (
                  <div className="col-md-4 col-sm-6" key={index}>
                    <div className="benefit-card">
                      <span className="benefit-icon">{item.icon}</span>
                      <h6>{item.title}</h6>
                      <p className="text-muted small">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA Section */}
              <div className="text-center mt-5 pt-4 border-top">
                <h5 className="mb-4 fw-bold text-dark">Optimize your facility with RAC InsuTech</h5>
                <a
                  href="https://wa.me/8208575410?text=Hi%20RAC%20Insutech,%20I%20want%20quotation%20for%20Underdeck%20Insulation%20service."
                  target="_blank"
                  rel="noreferrer"
                  className="quote-btn-lg"
                >
                  📞 Get Free Quotation On WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Services;