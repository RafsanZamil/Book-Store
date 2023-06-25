const ejs = require('ejs')
const express = require("express");
const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');


const User = require("../models/user.model");



module.exports = {
 
};
