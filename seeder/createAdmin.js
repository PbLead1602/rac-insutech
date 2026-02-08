const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const { sequelize } = require("../config/db");

async function createAdmin(){

  await sequelize.sync();

  const password1 = await bcrypt.hash("rac@123",10);
  const password2 = await bcrypt.hash("rac@456",10);

  await Admin.create({
    username:"admin1",
    password: password1
  });

  await Admin.create({
    username:"admin2",
    password: password2
  });

  console.log("Admins Created Successfully");

  process.exit();
}

createAdmin();
{/*  raguflvajtonwcso   # from Google App Password email pass 
  > admin1 hash: $2b$10$lRucvNipywW8O3nsm//hG.6GTOg4J7vMa1PY.pgIQNEJgkCSc.tgC
admin2 hash: $2b$10$c/RmJtUDZouMUz9lHtAq4.EG2Hsu0G04dArSB1Erch74XUSOL8a4a
  
  */}