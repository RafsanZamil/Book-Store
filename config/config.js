require("dotenv").config();


const dev = {
  app: {
    port: process.env.PORT || 3000,
  },
  db: {
    url: process.env.DB_URL ,
  },
  SECRET: {
  secret: process.env.SECRET,
  }, 
  client_id:{
  client_id : process.env.CLIENT_ID,
  },
  client_secret:{
  client_secret : process.env.CLIENT_SECRET,
  }
};

module.exports = dev;
