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
          <div className="col-md-4 mb-4 mb-md-0">
            <h6 className="fw-bold mb-3">Quick Links</h6>
            <ul className="list-unstyled">
              <li><Link to="/" className="footer-link">Home</Link></li>
              <li><Link to="/about" className="footer-link">About Us</Link></li>
              <li><Link to="/services" className="footer-link">Services</Link></li>
              <li><Link to="/contact" className="footer-link">Contact</Link></li>
            </ul>
          </div>

          {/* Social Media */}
          <div className="col-md-4">
            <h6 className="fw-bold mb-3">Connect with Us</h6>
            <div className="social-icons">
              <a href="# " className="me-3"><i className="bi bi-facebook"></i></a>
              <a href="# " className="me-3"><i className="bi bi-linkedin"></i></a>
              <a href="# " className="me-3"><i className="bi bi-instagram"></i></a>
              <a href="# "><i className="bi bi-envelope-fill"></i></a>
            </div>
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
