import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js"; // ✅ REQUIRED FOR TOGGLER
import "bootstrap-icons/font/bootstrap-icons.css";
import "./styles/style.css";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Navbar scroll effect
window.addEventListener("scroll", () => {
  const nav = document.querySelector(".navbar");
  if (nav) {
    nav.classList.toggle("scrolled", window.scrollY > 50);
    console.log(import.meta.env.MODE);

  }
});
