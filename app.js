const express = require("express");
const cors = require("cors");
const ejs = require("ejs");
const multer = require("multer");
const path = require("path");

const bodyParser = require("body-parser");
const User = require("./models/user.model");
const Product = require("./models/product.model");
const Cart = require("./models/cart.model");
const Order = require("./models/order.model");
require("./config/db");
const config = require("./config/config");
const userSchema = require("./models/user.model");

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const bookRouter = require("./routes/books");

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "/public")));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use("/books", bookRouter);

app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user._id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: config.client_id.client_id,
      clientSecret: config.client_secret.client_secret,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      console.log(profile);

      User.findOrCreate(
        { googleId: profile.id },
        { email: profile.displayName },
        function (err, user) {
          return cb(err, user);
        }
      );
    }
  )
);

app.get("/", function (req, res) {
  res.render("home");
});
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/user");
  }
);

//user Routes
app.get("/login", function (req, res) {
  res.render("login");
});
app.get("/register", function (req, res) {
  res.render("register");
});
app.get("/user", function (req, res) {
  Product.find().then(function (products) {
    res.render("user/products/all-products", { products });
  });
});
app.post("/register", function (req, res) {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/");
        });
      }
    }
  );
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        if (req.user.isAdmin) {
          res.redirect("/admin");
        } else {
          res.redirect("/user");
        }
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

//midlewares

// Protected route that only admin can access
//is admin middleware
function isAdmin(req, res, next) {
  if (req.user && req.user.isAdmin) {
    // User is an admin, allow access to the route
    next();
  } else {
    // User is not an admin, redirect to an error page or display an error message
    res.status(500).json({
      message: "you are not admin",
    });
  }
}
//image-upload middleware
// Storage configuration for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/product-data/images"); // Specify the destination folder
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = file.originalname.split(".").pop();
    cb(null, file.fieldname + "-" + uniqueSuffix + "." + extension);
  },
});

// Multer middleware setup
const upload = multer({ storage: storage });

// Example route for handling image upload
app.post("/upload", upload.single("image"), (req, res) => {
  // The uploaded image file is available in req.file
  res.send("Image uploaded successfully!");
});

//protected routes
// app.get("/admin", isAdmin, function(req, res) {
//   // Render admin panel view
//   res.render("partials/admin-navbar");
// });

app.get("/secrets", function (req, res) {
  User.find({ secret: { $ne: null } }, function (err, foundUsers) {
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secret", { usersWithSecrets: foundUsers });
      }
    }
  });
});

app.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

//product routes

const createNewProduct = async (req, res) => {
  try {
    const { title, summary, price, genre } = req.body;
    const { data, contentType } = req.file; // Assuming you are using Multer middleware to handle file uploads

    const newProduct = new Product({
      title,
      summary,
      price,
      genre,

      image: {
        data,
        contentType,
        path: req.file.path,
      },
    });

    const savedProduct = await newProduct.save();

    res.redirect("/admin/products"); // Redirect to the product list page after successful creation
  } catch (error) {
    res.status(500).json({ error: "Failed to create a new product" });
  }
};

app.post("/admin/products/new", upload.single("image"), createNewProduct);

//user view product details
app.get("/user/products/:id", function (req, res) {
  Product.findById(req.params.id).then(function (product) {
    res.render("user/products/product-details", { product });
  });
});

//user routes

//app.get('/user/products',userGetAllProduct);

//admin routes (protected)

app.get("/admin", isAdmin, function (req, res) {
  Product.find().then(function (products) {
    res.render("admin/products/all-products", { products });
  });
});

//admin product  function
app.get("/admin/products", isAdmin, function (req, res) {
  Product.find().then(function (products) {
    res.render("admin/products/manage-products", { products });
  });
});
//admin add product
app.get("/admin/products/new", isAdmin, function (req, res) {
  res.render("admin/products/new-product"); // Render the "add-product.ejs" template
});

//admin view and edit product details
app.get("/admin/products/:id", function (req, res) {
  Product.findById(req.params.id).then(function (product) {
    res.render("user/products/product-details", { product });
  });
});
//admin update product
app.get("/admin/products/:id/update", function (req, res) {
  Product.findById(req.params.id).then(function (product) {
    res.render("admin/products/update-product", { product });
  });
});

//delete product
// DELETE /admin/products/:id
async function postDeleteProduct(req, res, next) {
  let product;
  try {
    product = await Product.findById(req.params.id);
    await product.remove();
  } catch (error) {
    return next(error);
  }
  res.redirect("/admin/products");
}

app.post("/admin/products/:id", postDeleteProduct);

//delete product by genre


app.delete('/admin/category/delete/:genre', async (req, res) => {
  try {
    const genreToDelete = req.params.genre;

    // Find all products with the specified genre
    const productsToUpdate = await Product.find({ genre: genreToDelete });

    if (productsToUpdate.length === 0) {
      return res.status(404).json({ message: 'No products found for the specified genre.' });
    }

    // Update the genre of the found products to "Uncategorized"
    await Product.updateMany({ genre: genreToDelete }, { genre: 'Uncategorized' });

    // Now delete the genre
    await genre.deleteOne({ name: genreToDelete });

    res.json({ message: `Genre "${genreToDelete}" has been deleted, and its products have been moved to "Uncategorized".` });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while deleting the genre.' });
  }
});
// app.delete('/admin/category/delete/:genre', async (req, res) => {
//   try {
//     const genreToDelete = req.params.genre;

//     // Find all products with the specified genre
//     const productsToUpdate = await Product.find({ genre: genreToDelete });

//     if (productsToUpdate.length === 0) {
//       return res.status(404).json({ message: 'No products found for the specified genre.' });
//     }

//     // Update the genre of the found products to "Uncategorized"
//     await Product.updateMany({ genre: genreToDelete }, { genre: 'Uncategorized' });

//     // Now delete the genre
//     await Genre.deleteOne({ name: genreToDelete });

//     res.json({ message: `Genre "${genreToDelete}" has been deleted, and its products have been moved to "Uncategorized".` });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Failed to delete genre books.', error: error.message });
//   }
// });







//cart routes

app.get("/cart", function (req, res) {
  // Assuming you have a Cart model defined somewhere to interact with the cart data.
  Cart.find({ userEmail: req.user._id }).then(function (cartItems) {
    // Calculate the total price of all items in the cart.
    let totalPrice = 0;
    for (const cartItem of cartItems) {
      totalPrice += cartItem.totalPrice;
    }

    res.render("user/cart/cart", {
      cartItems: cartItems,
      totalPrice: totalPrice,
    });
  });
});

app.post("/cart/add/:id", function (req, res) {
  Product.findById(req.params.id).then(function (product) {
    const cart = new Cart({
      userEmail: req.user._id,
      item: product.title,
      totalPrice: product.price,
    });
    cart.save().then(function () {
      res.redirect("/cart");
      console.log("added");
    });
  });
});

app.get("/checkout", async (req, res) => {
  res.render("checkout");
});
//category routes

app.get("/category", async (req, res) => {
  res.redirect("/user");
});

app.get("/category/:genre", async (req, res) => {
  const genre = req.params.genre;
  try {
    // Assuming you have a method to fetch products by genre in your model
    const products = await Product.find({ genre });
    res.render("category", { genre, products });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});
//order

// Route to save orders by user ID

// Route to handle the order placement after checkout
app.post("/add/orders/:id", function (req, res) {
  Cart.findById(req.params._id).then(function (cart) {
    const order = new Order({
      user: req.user._id,
      status: "Pending",
      cart: req.cart._id,
    });
    cart.save().then(function () {
      res.redirect("/user");
      console.log("added");
    });
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
