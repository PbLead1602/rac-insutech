const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Contact = sequelize.define("Contact", {

  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false
  },

  phone: {
    type: DataTypes.STRING
  },

  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },

  product: {
    type: DataTypes.STRING
  },

  status: {
    type: DataTypes.ENUM("NEW","CONTACTED","FOLLOW-UP","CLOSED"),
    defaultValue: "NEW"
  },

  // ✅ NEW FIELD
  source: {
    type: DataTypes.STRING,
    defaultValue: "FORM"
  }

}, {
  timestamps: true
});

module.exports = Contact;
