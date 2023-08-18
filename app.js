const express = require("express");
const cors = require("cors");
const ejs = require("ejs");
const multer = require("multer");
const path = require("path");
const axios = require("axios");

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

// app.get("/", function (req, res) {
//   res.render("home");
// });
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
app.get("/", async (req, res) => {
  try {
    const response = await axios.get("https://zenquotes.io/api/random");
  
    const quote = {
      text: response.data[0].q,
      author: response.data[0].a,
    };

    // Find featured products
    const newArrivals = await Product.find({ newArrival: true }).exec();
    const featuredProducts = await Product.find({ featured: true }).exec();

    // Find top-selling products
    const topSellingProducts = await Product.find({ topSelling: true }).exec();

    // Render the home page and pass the data to the template
    res.render("home", { quote,newArrivals, featuredProducts, topSellingProducts });
  } catch (err) {
    console.error("Error retrieving products:", err);
    res.status(500).send("Error retrieving products.");
  }
});
app.get("/login", function (req, res) {
  res.render("login");
});
app.get("/register", function (req, res) {
  res.render("register");
});
// app.get("/user", function (req, res) {
//   Product.find().then(function (products) {
//     res.render("user/products/all-products", { products });
//   });
// });

app.get("/user", function (req, res) {
  // Fetch all products
  const allProductsPromise = Product.find().exec();

  // Fetch featured products
  const featuredProductsPromise = Product.find({ featured: true }).exec();
  const newArrivalsPromise = Product.find({ newArrival: true }).exec();


  // Fetch top-selling products
  const topSellingProductsPromise = Product.find({ topSelling: true }).exec();

  // Execute all promises
  Promise.all([
    allProductsPromise,
    newArrivalsPromise,
    featuredProductsPromise,
    topSellingProductsPromise,

  ])
    .then(([products, newArrivals ,featuredProducts, topSellingProducts]) => {
      res.render("user/products/all-products", {
        products,
        newArrivals,
        featuredProducts,
        topSellingProducts,
      });
    })
    .catch((err) => {
      console.error("Error fetching products:", err);
      res.status(500).send("Server Error");
    });
});
app.post("/register", function (req, res) {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        if (err.name === "UserExistsError") {
          return res.render("register", {
            errorMessage:
              "A user with the given username is already registered.",
          });
        }
        console.log(err);
        return res.redirect("/register");
      }
      passport.authenticate("local")(req, res, function () {
        res.redirect("/");
      });
    }
  );
});
app.post("/login", function (req, res, next) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  // Authenticate user
  passport.authenticate("local", function (err, user, info) {
    if (err) {
      console.log(err);
      return res.render("login", {
        errorMessage: "Error logging in. Please try again.",
      });
    }

    if (!user) {
      // Authentication failed, render the login page with an error message
      return res.render("login", {
        errorMessage: "Invalid username or password. Please try again.",
      });
    }

    req.logIn(user, function (err) {
      if (err) {
        console.log(err);
        return next(err);
      }

      if (user.isAdmin) {
        res.redirect("/admin");
      } else {
        res.redirect("/user");
      }
    });
  })(req, res, next);
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
    return res.render("error", {
      error: "User not authenticated or missing _id property",
    });
  }
  // User is not an admin, redirect to an error page or display an error message
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
app.get("/user/products/:id", isLoggedIn, function (req, res) {
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

app.get("/manage", isAdmin, async (req, res) => {
  try {
    const products = await Product.find();
    res.render("product-table", { products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.render("error");
  }
});

//admin add product
app.get("/admin/products/new", isAdmin, function (req, res) {
  res.render("admin/products/new-product"); // Render the "add-product.ejs" template
});

//admin view and edit product details
app.get("/admin/products/:id", isAdmin, function (req, res) {
  Product.findById(req.params.id).then(function (product) {
    res.render("user/products/product-details", { product });
  });
});
//admin update product

app.post("/update", async (req, res) => {
  const { productId, action } = req.body;

  try {
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).send("Product not found");
    }

    if (action === "newArrival") {
      product.newArrival = !product.newArrival;
    } else if (action === "featured") {
      product.featured = !product.featured;
    } else if (action === "topSelling") {
      product.topSelling = !product.topSelling;
    }

    await product.save();
    res.redirect("/manage"); // Redirect back to the product table
  } catch (error) {
    console.error("Error updating product:", error);
    res.redirect("/error");
  }
});
// app.get("/admin/products/:id/update", function (req, res) {
//   Product.findById(req.params.id).then(function (product) {
//     res.render("admin/products/update-product", { product });
//   });
// });

//delete product
app.post("/delete-product", async (req, res) => {
  const productId = req.body.productId;

  try {
    await Product.findByIdAndDelete(productId);
    res.redirect("/manage"); // Redirect back to the product table
  } catch (error) {
    console.error("Error deleting product:", error);
    res.redirect("/error");
  }
});

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

app.delete("/admin/category/delete/:genre", isAdmin, async (req, res) => {
  try {
    const genreToDelete = req.params.genre;

    // Find all products with the specified genre
    const productsToUpdate = await Product.find({ genre: genreToDelete });

    if (productsToUpdate.length === 0) {
      return res
        .status(404)
        .json({ message: "No products found for the specified genre." });
    }

    // Update the genre of the found products to "Uncategorized"
    await Product.updateMany(
      { genre: genreToDelete },
      { genre: "Uncategorized" }
    );

    // Now delete the genre
    await genre.deleteOne({ name: genreToDelete });

    res.json({
      message: `Genre "${genreToDelete}" has been deleted, and its products have been moved to "Uncategorized".`,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "An error occurred while deleting the genre." });
  }
});

// featured and topselling
app.put("/admin/products/update", async (req, res) => {
  const { productIds, updateType } = req.body;

  try {
    // Update the products to set the corresponding category flag (e.g., featured, topSelling)
    await Product.updateMany(
      { _id: { $in: productIds } },
      { [updateType]: true }
    );

    res.json({
      message: `Products updated to ${updateType} category successfully.`,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update products." });
  }
});
//cart routes

app.get("/cart", function (req, res) {
  if (!req.user || !req.user._id) {
    // Redirect to an error page or any other appropriate action
    return res.render("error", {
      error: "User not authenticated or missing _id property",
    });
  }

  // Assuming you have a Cart model defined somewhere to interact with the cart data.
  Cart.find({ userEmail: req.user._id })
    .then(function (cartItems) {
      // Calculate the total price of all items in the cart.
      let totalPrice = 0;
      for (const cartItem of cartItems) {
        totalPrice += cartItem.totalPrice;
      }

      res.render("user/cart/cart", {
        cartItems: cartItems,
        totalPrice: totalPrice,
      });
    })
    .catch(function (error) {
      // Handle the error here. You can redirect to an error page or render an error view.
      res.render("error", { error: error.message }); // Assuming you have an error.ejs view for displaying errors.
    });
});

app.post("/cart/add/:id", function (req, res) {
  Product.findById(req.params.id)
    .then(function (product) {
      if (!product) {
        throw new Error("Product not found"); // Throw an error if the product is not found.
      }

      Cart.findOneAndUpdate(
        { userEmail: req.user._id, item: product.title },
        { $inc: { quantity: 1, totalPrice: product.price } },
        { upsert: true, new: true }
      )
        .then(function () {
          res.redirect("/cart");
          console.log("added");
        })
        .catch(function (error) {
          // Handle the error here. You can redirect to an error page or render an error view.
          res.render("error", { error: error.message });
        });
    })
    .catch(function (error) {
      // Handle the error here. You can redirect to an error page or render an error view.
      res.render("error", { error: error.message });
    });
});

// Update quantity of a cart item
app.post("/cart/update/:id", function (req, res) {
  const itemId = req.params.id;
  const newQuantity = parseInt(req.body.quantity);

  Cart.findById(itemId)
    .then(function (cartItem) {
      if (!cartItem) {
        throw new Error("Cart item not found");
      }

      // Update the cart item's quantity and total price based on the new quantity
      const oldQuantity = cartItem.totalQuantity;
      cartItem.totalQuantity = newQuantity;
      cartItem.totalPrice = (cartItem.totalPrice / oldQuantity) * newQuantity;

      return cartItem.save(); // Save the updated cart item
    })
    .then(function () {
      res.redirect("/cart");
    })
    .catch(function (error) {
      // Handle the error here
      res.render("error", { error: error.message });
    });
});

// Add the route for removing items from the cart
app.post("/cart/remove/:id", function (req, res) {
  // Find the cart item with the given ID and the user's email.
  Cart.findOneAndRemove({ _id: req.params.id, userEmail: req.user._id })
    .then(function (removedCartItem) {
      if (!removedCartItem) {
        // If the cart item is not found, return an error or handle the situation accordingly.
        return res.status(404).json({ error: "Cart item not found" });
      }

      // Redirect back to the cart page after successful removal.
      res.redirect("/cart");
      console.log("removed");
    })
    .catch(function (err) {
      // Handle any potential errors during the removal process.
      console.error("Error removing cart item:", err);
      res.status(500).json({ error: "Internal server error" });
    });
});

//checkout routes

app.get("/checkout", function (req, res) {
  // Assuming you have a User model defined somewhere to retrieve the user's details.
  User.findById(req.user._id).then(function (user) {
    // Assuming you have a Cart model defined somewhere to interact with the cart data.
    Cart.find({ userEmail: req.user._id }).then(function (cartItems) {
      // Calculate the total price of all items in the cart.
      let totalPrice = 0;
      for (const cartItem of cartItems) {
        totalPrice += cartItem.totalPrice;
      }

      // Render the checkout page (checkout.ejs) and pass the user's details, cart items, and total price.
      res.render("user/cart/checkout", {
        user: user,
        cartItems: cartItems,
        totalPrice: totalPrice,
      });
    });
  });
});

// Handle the checkout process
app.post("/checkout", async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch the user to ensure it exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    // Assuming you have an Order model defined somewhere to interact with the order data.
    const order = new Order({
      user: userId,
      name: req.body.name,
      email: req.body.email,
      address: req.body.address,
      items: req.body.cartItems, // Assuming you have a proper field to store the cart items in the Order model.
      totalPrice: req.body.totalPrice,
      createdAt: req.body.createdAt, // Assuming you have a proper field to store the total price in the Order model.
    });

    // Save the order in the database
    order.save().then(function () {
      // Clear the cart items for the current user after successful checkout.
      Cart.deleteMany({ userEmail: req.user._id }).then(function () {
        res.redirect("/orders"); // Redirect to the orders page after successful checkout.
        console.log("checkout complete");
      });
    });
  } catch (err) {
    // Handle any potential errors during the checkout process.
    console.error("Error during checkout:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

//order routes
app.get("/admin/orders", isAdmin, async (req, res) => {
  try {
    const orders = await Order.find().populate("items");
    res.render("admin/orders/admin-orders", { orders });
  } catch (err) {
    res.status(500).send("Error retrieving orders");
  }
});

// Route to update the status of an order
app.post("/admin/orders/:orderId/update", isAdmin, async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  try {
    await Order.findByIdAndUpdate(orderId, { status });
    res.redirect("/admin/orders");
  } catch (err) {
    res.status(500).send("Error updating order status");
  }
});
app.get("/orders", async (req, res) => {
  res.render("orders");
});

app.post("/admin/orders/:orderId/delete", isAdmin, async (req, res) => {
  const orderId = req.params.orderId;

  try {
    // Find the order by its ID and delete it
    const deletedOrder = await Order.findByIdAndRemove(orderId);

    if (deletedOrder) {
      console.log("Deleted order:", deletedOrder);
      res.redirect("/admin/orders"); // Redirect back to the orders page after deletion
    } else {
      res.status(404).send("Order not found");
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Route to get user-specific orders
app.get("/user/orders", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login"); // Redirect to login page if not logged in
  }

  try {
    const userId = req.user._id;
    const orders = await Order.find({ user: userId }).populate("items");
    res.render("user/orders/user-order", { orders });
  } catch (err) {
    res.status(500).send("Error retrieving orders");
  }
});

//category routes

app.get("/category", isLoggedIn, async (req, res) => {
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
