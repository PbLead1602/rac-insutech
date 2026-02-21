import React from "react";
import { Link } from "react-router-dom";
import "../styles/style.css";

function Footer() {
  return (
    <footer className="footer-section text-white py-5 mt-5">
      <div className="container">
        <div className="row text-center text-md-start">
          {/* Brand Info */}
          <div className="col-md-4 mb-4 mb-md-0">
            <h5 className="fw-bold">RAC Insutech</h5>
            <p>
              Delivering trusted industrial solutions with innovation, precision, 
              and reliability.
            </p>
            
          </div>

          {/* Quick Links */}
          <div className="col-md-3 mb-4 mb-md-0">
            <h6 className="fw-bold mb-3">Quick Links</h6>
            <ul className="list-unstyled">
              <li><Link to="/" className="footer-link">Home</Link></li>
              <li><Link to="/about" className="footer-link">About Us</Link></li>
              <li><Link to="/services" className="footer-link">Services</Link></li>
              <li><Link to="/contact" className="footer-link">Contact</Link></li>
            </ul>
          </div>

          {/* Contact & Address Details */}
          <div className="col-md-5">
            <h6 className="fw-bold mb-3">Contact Details</h6>
            <p className="mb-1">
              <i className="bi bi-geo-alt-fill me-2"></i>
              Rukhmini Niwas, Near Vrundavan Garden Appt. 
              Behind Tulshan Bungalow, Geeta Nagar, Akola
            </p>
            <p className="mb-1">
              <i className="bi bi-telephone-fill me-2"></i>
              +91 9130958594
            </p>
            <p className="mb-0">
              <i className="bi bi-envelope-fill me-2"></i>
              racinsutech@gmail.com
            </p>
          </div>
        </div>

        <hr className="my-4 border-light opacity-50" />

        <div className="text-center small">
          © {new Date().getFullYear()} <b>RAC Insutech</b> | All Rights Reserved
        </div>
      </div>
    </footer>
  );
}

export default Footer;