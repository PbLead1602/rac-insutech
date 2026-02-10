import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import WhatsappButton from "./components/WhatsappButton";

import Home from "./pages/Home";
import About from "./pages/About";
import Products from "./pages/Products";
import Contact from "./pages/Contact";
import Services from "./pages/Services";


import AdminLogin from "./admin/adminLogin";
import AdminDashboard from "./admin/adminDashboard";
import AdminProtectedRoute from "./admin/adminprotectedRoute";

function LayoutWrapper() {

  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith("/admin");
  const isLoginPage = location.pathname === "/admin/login";

  return (
    <>
      {/* Hide Navbar only on Admin Login */}
      {!isLoginPage && <Navbar />}

      <Routes>

        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/products" element={<Products />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/services" element={<Services />} />



        {/* Admin Routes */}
        <Route path="/auth/login" element={<AdminLogin />} />

        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          }
        />

      </Routes>

      
      {/* 2. Show WhatsApp Button only on public pages */}
      {!isAdminRoute && <WhatsappButton />}
      {/* Footer only for public pages */}
      {!isAdminRoute && <Footer />}
    </>
  );
}

function App() {
  return (
    <Router>
      <LayoutWrapper />
    </Router>
  );
}

export default App;
