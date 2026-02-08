const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME, 
  process.env.DB_USER, 
  process.env.DB_PASS, 
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT, // <--- ADD THIS LINE
    dialect: "mysql",
    dialectOptions: {
      connectTimeout: 60000 // Helpful for slow cloud connections
    }
  }
);

module.exports = { sequelize };