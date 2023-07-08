const express = require("express");
const cors = require("cors");
const ejs = require('ejs')

const bodyParser = require("body-parser")
const User = require("./models/user.model");
require("./config/db");
const config =require("./config/config");
const userSchema= require("./models/user.model")
//const encrypt= require("mongoose-encryption")
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
//const isAdmin = require("./middlewares/auth");
//const userRoute = require("./routes/user.route")
// const secret = config.SECRET.secret;



const userRouter = require("./routes/user.route");

const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
//app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());



passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: config.client_id.client_id,
  clientSecret: config.client_secret.client_secret,
  callbackURL: "http://localhost:3000/auth/google/secrets",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);

  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));




app.get("/", function(req, res) {
 res.render("home");
});
app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });


// //for admin route
// const adminRoute = require('./routes/adminRoute')
// app.use ('/admin',adminRoute)


//user Routes
app.get("/login",function(req,res){
  res.render("login");
})
app.get("/register",function(req,res){
  res.render("register");
})
app.get("/user",function(req,res){
  res.render("partials/user-navbar");
})
app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/");
      });
    }
  });

});

//loggedin middlewared
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    // User is logged in
    res.locals.loggedIn = true;
  } else {
    // User is not logged in
    res.locals.loggedIn = false;
  }
  next();
}

app.post("/login", function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        if (req.user.isAdmin) {
          res.redirect("/admin");
        } else {
          res.redirect("/user");
        }
      });
    }
  });
});

// Protected route that only admin can access
//is admin middleware
function isAdmin(req, res, next) {
  if (req.user && req.user.isAdmin) {
    // User is an admin, allow access to the route
    next();
  } else {
    // User is not an admin, redirect to an error page or display an error message
    res.status(500).json({
      message: "something broke",
    });
  }
}

//protected routes
app.get("/admin", isAdmin, function(req, res) {
  // Render admin panel view
  res.render("partials/admin-navbar");
});

app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if (err){
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secret", {usersWithSecrets: foundUsers});
      }
    }
  });
});


app.get('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});









// route not found error
app.use((req, res, next) => {
  res.status(404).json({
    message: "route not found",
  });
});

// //handling server error
// app.use((err, req, res, next) => {
//   res.status(500).json({
//     message: "something broke",
//   });
// });

module.exports = app;
