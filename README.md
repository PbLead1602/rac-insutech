# 🚀 RAC Insutech – Lead Management System (Full Stack Web Application)

A **production-ready Lead Management & Business Website Platform** built using **React, Node.js, Express, MySQL, Sequelize ORM, and JWT Authentication**. The system enables businesses to capture, track, and manage leads from contact forms and WhatsApp inquiries through a **secure admin dashboard with analytics**.

This project is fully **deployed to production** and follows real-world software engineering practices.

---

## 🌐 Live Project Overview

* **Live Website:** [https://racinsutech.com](https://racinsutech.com)
* **Backend API:** [https://rac-insutech-production.up.railway.app](https://rac-insutech-production.up.railway.app)

This application is designed with **scalable backend architecture**, **secure authentication**, and **data-driven dashboards**, simulating an industry-level production system.

---

## 🛠 Tech Stack

### Frontend

* React (Vite)
* React Router
* Axios
* Recharts (Dashboard Charts)
* Responsive UI Design

### Backend

* Node.js
* Express.js
* REST API Architecture
* JWT Authentication
* Nodemailer (Email Service)

### Database

* MySQL (Railway Cloud)
* Sequelize ORM
* Relational Schema Design
* Automatic Timestamps

### Security

* Bcrypt Password Hashing
* JWT Token-Based Authentication
* Protected Routes & Middleware Authorization

---

## 📦 Key Features

### 🔐 Admin Authentication

* Secure Admin Login
* JWT Token Authorization
* Protected Dashboard Routes
* Session Persistence

### 📊 Lead Management System

* Auto capture leads from contact form
* WhatsApp lead tracking
* Lead status workflow:

  * NEW
  * FOLLOW-UP
  * CLOSED
* Lead filtering & pagination
* Export lead data (Excel)

### 📈 Admin Dashboard Analytics

* Real-time lead statistics
* Graph-based visualization
* Monthly & daily tracking
* Performance overview dashboard

### 📧 Email Integration

* Contact form email notifications
* SMTP email service (Nodemailer / Brevo)
* Automated email handling

### 📱 Responsive UI

* Fully responsive landing pages
* Mobile-friendly admin dashboard
* Responsive tables & charts

---

## 📁 Project Folder Structure

```
project RAC/
 ├── backend/
 │    ├── .env
 │    ├── server.js
 │    ├── config/
 │    │     ├── db.js
 │    │     └── email.js
 │    ├── controllers/
 │    ├── middleware/
 │    ├── models/
 │    └── routes/
 │
 ├── frontend/
 │    ├── src/
 │    │     ├── admin/
 │    │     ├── components/
 │    │     ├── App.jsx
 │    │     └── main.jsx
 │
 └── seeder/
      └── adminSeeder.js
```

---

## 🧩 API Highlights

| Method | Endpoint          | Description             |
| ------ | ----------------- | ----------------------- |
| POST   | /api/admin/login  | Admin Login             |
| GET    | /api/admin/leads  | Fetch All Leads         |
| POST   | /api/contact      | Contact Form Submission |
| PUT    | /api/admin/status | Update Lead Status      |

---

## 🎯 Real-World Practices Used

✔ MVC Architecture
✔ RESTful API Design
✔ Environment Variables Management
✔ Production Folder Structure
✔ Secure Authentication Flow
✔ Pagination & Filtering
✔ Excel Export Reports
✔ Cloud Deployment (Railway & Netlify)

---

## 📸 Project Screenshots

(Add screenshots of homepage, contact form, admin login, dashboard, lead table, and analytics charts here)

---

## 📌 Project Status

✅ Production Deployed
✅ Fully Functional
✅ Portfolio Ready

---

## 👩‍💻 Developer

**Priya Bodade**
Full Stack Developer (Java Full Stack / Node.js / MERN)

* GitHub: [https://github.com/PbLead1602](https://github.com/PbLead1602)
* LinkedIn: (add your LinkedIn profile link)

---

⭐ If you find this project useful, feel free to star the repository and connect!
