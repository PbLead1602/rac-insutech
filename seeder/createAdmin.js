const bcrypt = require("bcryptjs");
const Admin = require("../backend/models/Admin");
const { sequelize } = require("../backend/config/db");

async function createAdmin(){

  await sequelize.sync();

  const adminpass1=process.env.ADMIN_PASSWORD_1;
  const adminpass2=process.env.ADMIN_PASSWORD_2;

  const password1 = await bcrypt.hash(adminpass1,10);
  const password2 = await bcrypt.hash(adminpass2,10);

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
