if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const Book = require("./models/book");
const UserDB = require("./models/user");
const expressLayouts = require("express-ejs-layouts");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const passport = require("passport");
const flash = require("express-flash");
const session = require("express-session");
const methodOverride = require("method-override");
const initializePassport = require("./passport-config");
initializePassport(
  passport,
  (email) => UserDB.findOne({ email: email }).exec(),
  (id) => UserDB.findById(id).exec()
);
const fetch = require('node-fetch');
const authorRouter = require("./routes/authors");
const bookRouter = require("./routes/books");

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.set("layout", "layouts/layout");
app.use(expressLayouts);
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: false }));
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride("_method"));

const mongoose = require("mongoose");
mongoose.connect(process.env.DATABASE_URL, {
  useCreateIndex: true,
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", (error) => console.error(error));
db.once("open", () => console.log("Connected to Mongoose"));

app.use("/authors", authorRouter);
app.use("/books", bookRouter);
app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.post("/register", async (req, res) => {
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const user = new UserDB({
    name: req.body.name,
    email: req.body.email,
    password: hashedPassword,
  });
  try {
    await user.save();
    res.redirect("/login");
  } catch {
    res.redirect("/register");
  }
});

app.delete("/logout", (req, res) => {
  req.logOut();
  res.redirect("/login");
});

app.get("/", async (req, res) => {
  let successfullyCalledAws = false

  try {
    let data = await callAWS();
    console.log(data)

    async function callAWS() {
      let response = await fetch('https://5jc8u4oh39.execute-api.us-east-2.amazonaws.com/production/', { timeout: 1000 })
      console.log(response.text())
      successfullyCalledAws = true
      return response.text()
  }
  } catch (e) {
      console.log(e)
  }
 
  try {
    books = await Book.find().sort({ createdAt: "desc" }).limit(10).exec();
  } catch {
    books = [];
  }
  res.render("index", { books: books, user: req.user, successfullyCalledAws: successfullyCalledAws });
});

app.listen(process.env.PORT || 3000);
