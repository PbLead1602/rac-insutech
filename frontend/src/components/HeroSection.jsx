import React from "react";
import { Link as ScrollLink } from "react-scroll";
import "../styles/style.css";

function HeroSection() {
  return (
    <section id="home" className="hero d-flex align-items-center justify-content-center">
      <div className="container text-center fade-in glass-hero">
        <h1>
          Welcome to <span className="brand">RAC Insutech</span>
        </h1>
        <p className="mt-3">
          Your trusted partner in <strong>Air Conditioning </strong> and <strong>Thermal Insulation</strong> 
        </p>
        <br/>
        <p>
          <strong> "Integrity towards Quality."</strong>
        </p>

        <br/>
        <div className="mt-4">
          <ScrollLink
            to="about"
            smooth={true}
            duration={700}
            offset={-70}
            className="btn btn-light hero-btn me-3"
          >
            Learn More
          </ScrollLink>

          <ScrollLink
            to="contact"
            smooth={true}
            duration={700}
            offset={-70}
            className="btn btn-warning hero-btn"
          >
            Get in Touch
          </ScrollLink>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
