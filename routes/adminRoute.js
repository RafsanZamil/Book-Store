const express = require('express')
const admin_route = express();

const session= require("express-session")
admin_route.use(session({secret:"Our little secret"}))

const config = require("../config/config")
const bodyParser = require('body-parser')
admin_route.use(bodyParser.json());
admin_route.use (bodyParser.urlencoded({extended:true}));

admin_route.set('view engine', 'ejs');
admin_route.set('views', './views/admin');


const adminController= require("../controllers/adminController")
admin_route.get('/', adminController.loadLogin);

admin_route.post('/', adminController.verifylogin);

module.exports = admin_route;



