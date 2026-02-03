import React from "react";
import { Link as ScrollLink } from "react-scroll";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import logo from "../images/RAC LOGOO.jpg";
import "../styles/style.css"; 
import "../styles/admin.css"; 

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";
  const isAdminRoute = location.pathname.startsWith("/admin");

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    navigate("/admin/login");
  };

  const closeMenu = () => {
  const nav = document.getElementById("navbarNav");
  
  // 1. Check if the element exists and is currently shown
  if (nav && nav.classList.contains("show")) {
    
    // 2. Check if Bootstrap's JS is available globally
    if (window.bootstrap && window.bootstrap.Collapse) {
      try {
        const bsCollapse = new window.bootstrap.Collapse(nav);
        bsCollapse.hide();
      } catch (err) {
        console.error("Bootstrap Collapse error:", err);
        // Fallback: manually remove the class if Bootstrap JS fails
        nav.classList.remove("show");
      }
    } else {
      // 3. Fallback: If Bootstrap JS isn't loaded, use standard DOM manipulation
      nav.classList.remove("show");
      
      // Also update the button attribute for accessibility/sync
      const toggler = document.querySelector(".navbar-toggler");
      if (toggler) {
        toggler.classList.add("collapsed");
        toggler.setAttribute("aria-expanded", "false");
      }
    }
  }
};

  const publicNavItems = [
    { name: "Home", to: "home", path: "/" },
    { name: "About", to: "about", path: "/about" },
    { name: "Products", to: "products", path: "/products" },
    { name: "Services", to: "services", path: "/services" },
    { name: "Gallery", to: "gallery", path: "/gallery" },
    { name: "Contact", to: "contact", path: "/contact" },
  ];

  return (
    <nav className={`navbar navbar-expand-lg fixed-top shadow-sm ${isAdminRoute ? "admin-navbar-glass" : "navbar-light bg-light"}`}>
      <div className="container">
        <RouterLink className="navbar-brand d-flex align-items-center" to={isAdminRoute ? "/admin/dashboard" : "/"}>
          <img src={logo} alt="RAC Logo" className="logo-img me-2" />
          {isAdminRoute && <span className="ms-2 fw-bold admin-brand-text">ADMIN PANEL</span>}
        </RouterLink>

        {/* Updated Toggler: border color and icon color change based on route */}
        <button 
            className={`navbar-toggler ${isAdminRoute ? "border-light" : ""}`} 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >

          <span className={`navbar-toggler-icon ${isAdminRoute ? "admin-toggler-white" : ""}`}></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-center">
            {isAdminRoute ? (
              <>
                <li className="nav-item">
                  <RouterLink to="/admin/dashboard" className="nav-link text-white" onClick={closeMenu}>Dashboard</RouterLink>
                </li>
                <li className="nav-item">
                  <button onClick={handleLogout} className="admin-logout-btn ms-lg-3">Logout</button>
                </li>
              </>
            ) : (
              publicNavItems.map((item) => (
                <li className="nav-item" key={item.to}>
                  {isHome ? (
                    <ScrollLink to={item.to} spy={true} smooth={true} duration={600} offset={-70} className="nav-link" activeClass="active" onClick={closeMenu} style={{cursor:'pointer'}}>
                      {item.name}
                    </ScrollLink>
                  ) : (
                    <RouterLink to={item.path} className="nav-link" onClick={closeMenu}>{item.name}</RouterLink>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;