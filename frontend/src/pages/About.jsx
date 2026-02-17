// src/pages/About.js
import React from "react";
import { Link } from "react-router-dom";
import "../styles/style.css";
import aboutimg from "../images/aboutimage.jpg";

function About() {
  return (
    <div className="about-page py-5 mt-5">
      <div className="container text-center">
        <br/><br/><br/><br/>
        <h2 className="section-title mb-4">About RAC Insutech</h2>
        <p className="lead mx-auto" style={{ maxWidth: "850px" }}>
          At <strong>RAC Insutech</strong>, we’re redefining industrial insulation and
          engineering excellence. From advanced HVAC systems to energy-efficient
          solutions, we combine innovation with deep industry expertise to deliver 
          reliability and performance.
        </p>

        <div className="my-5">
          <img
            src={aboutimg}
            alt="RAC Insutech Facility"
            className="img-fluid rounded shadow-sm"
          />
        </div>

        <div className="row mt-5">
          <div className="col-md-4 mb-4">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <h5 className="fw-bold">Our Mission</h5>
                <p>
                  To deliver high-performance, sustainable insulation solutions that 
                  exceed industry standards and empower our clients to operate efficiently.
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-4">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <h5 className="fw-bold">Our Vision</h5>
                <p>
                  To be the global leader in industrial insulation by fostering innovation,
                  technical expertise, and customer satisfaction.
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-4">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <h5 className="fw-bold">Our Values</h5>
                <p>
                  Integrity, Quality, Sustainability, and Continuous Improvement 
                  define how we work and who we are.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <Link to="/contact" className="btn btn-primary px-4 py-2">
            Get in Touch
          </Link>
        </div>
      </div>
    </div>
  );
}

export default About;
