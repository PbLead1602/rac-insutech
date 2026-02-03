import React from "react";
import { Link } from 'react-router-dom';
import HeroSection from "../components/HeroSection";
import ContactForm from "../components/ContactForm";
import products from "../data/products";
import "../styles/style.css"; // ✅ ensure CSS styles are applied
import racLogo from "../images/hero image.jpeg";// this is for about section

function Home() {
  return (
    <>
      {/* 🌟 Hero Section */}
      <HeroSection />

     
      {/* 🏢 About Section */}
      <section id="about" className="about-section">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6 mb-4 mb-md-0">
              <img
                src={racLogo}
                alt="About RAC Insutech"
                className="img-fluid"
              />
            </div>
            <div className="col-md-6 text-center text-md-start">
              <h2 className="section-title mb-4">About Us</h2>
              <p className="lead">
                "RAC InsuTech” Is an Organization in the field of Heat, Ventilation and Air-conditioning with operations spanning across INDIA. Today, RAC InsuTech the most reliable trusted HVAC Company in INDIA.  RAC InsuTech has capability to study the different type of complex Heat Load, Ventilation System, Human Comfort and design and deliver tailor made HVAC solutions. Our vast experience had make us capable to takes care of the entire gamut of activities involved in HVAC Design & Solutions, leaving customer free to concentrate on their core activities. You can depend on RAC InsuTech for fast, reliable and accurate solutions, which results in most efficient and optimized operation of all the Human. We have the systems, services and expertise to meet and exceed your expectations.
              </p>
              
              <Link to="/about" className="btn btn-primary mt-3">
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>


      {/* 🧰 Products Section */}
      <section id="products" className="page-section bg-light">
        <div className="container">
          <h2 className="section-title text-center mb-5">Our Products</h2>

          <div className="row">
            {products.map((product) => (
              <div className="col-md-4 mb-4" key={product.id}>
                <div className="card h-100 shadow-sm">
                  <img
                    src={product.image}
                    className="card-img-top"
                    alt={product.name}
                  />
                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title">{product.name}</h5>
                    <p className="card-text">{product.shortDesc}</p>

                    <Link
                      to={`/products#${product.id}`}
                      className="btn btn-primary mt-auto"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-4">
            <Link to="/products" className="btn btn-outline-primary">
              View All Products
            </Link>
          </div>
        </div>
      </section>


      {/* ⚙️ Services Preview Section */}
      <section id="services" className="services-preview-section">
        <div className="container">
          <div className="row align-items-center">
            
            {/* Visual Side */}
            <div className="col-lg-6 mb-5 mb-lg-0">
              <div className="preview-image-wrapper">
                <img 
                  src={racLogo} 
                  alt="Underdeck Insulation" 
                  className="img-fluid" 
                />
              </div>
            </div>

            {/* Content Side */}
            <div className="col-lg-6">
              <div className="ps-lg-5">
                <span className="preview-tag text-uppercase">Industrial Expertise</span>
                <h2 className="fw-bold text-dark mb-4" style={{ fontSize: '2.5rem' }}>
                  High-Performance <br />
                  <span className="text-primary">Underdeck Insulation</span>
                </h2>
                
                <div className="services-glass-card">
                  <p className="text-muted mb-4">
                    We specialize in advanced thermal barriers for PEB structures, factories, and warehouses. 
                    Our solutions focus on long-term durability and immediate energy savings.
                  </p>
                  
                  <ul className="preview-list">
                    <li><span className="bullet">✓</span> Reduces Heat Gain by up to 85%</li>
                    <li><span className="bullet">✓</span> Maintenance-Free & Fire Retardant</li>
                    <li><span className="bullet">✓</span> Prevents Roof Condensation & Rusting</li>
                    <li><span className="bullet">✓</span> Enhances Employee Productivity</li>
                  </ul>

                  <div className="mt-4">
                    <Link to="/services" className="btn btn-primary px-4 py-2 fw-bold rounded-pill shadow-sm">
                      Explore Full Service Benefits →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>


      {/* 🖼️ Gallery Section */}
      <section id="gallery" className="page-section">
        <div className="container text-center glass-section">
          <h2 className="section-title mb-4">Gallery</h2>
          <p>Gallery images will appear here...</p>
        </div>
      </section>

      {/* ✉️ Contact Section */}
      <section id="contact" className="page-section contact-glass">
        <div className="container">
          {/* We pass true here because the background is dark */}
          <ContactForm darkBackground={true} />
        </div>
      </section>
    </>
  );
}

export default Home;
