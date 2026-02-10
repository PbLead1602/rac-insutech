const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { sequelize } = require("./config/db");
const contactRoutes = require("./routes/contactRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adminLeadRoutes = require("./routes/adminLeadRoutes");


dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "https://racinsutech.com",
    "https://www.racinsutech.com",
    "https://<your-netlify-site>.netlify.app"
  ],
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.error("Invalid JSON received");
    return res.status(400).json({ error: "Invalid JSON format" });
  }
  next();
});


app.use("/api/contact", contactRoutes);
app.use("/api/auth", adminRoutes);
app.use("/api/admin", adminLeadRoutes);


app.get("/", (req, res) => {
  
  res.send("RAC Insutech Backend Running 🚀");
});

const PORT = process.env.PORT;

sequelize
  .sync()
  .then(() => {
    
    app.listen(PORT,"0.0.0.0", () => {
      
      console.log(`Server running on port ${PORT}`);
    });
  })
.catch((err) => console.error("Database connection error:", err));
