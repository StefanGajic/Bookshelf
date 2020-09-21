const express = require("express");
const router = express.Router();
const Author = require("../models/author");
const Book = require("../models/book");
const flash = require("express-flash");
router.use(flash());

router.get("/", async (req, res) => {
  let searchOptions = {};
  if (req.query.name != null && req.query.name !== "") {
    searchOptions.name = new RegExp(req.query.name, "i");
  }
  try {
    const authors = await Author.find(searchOptions);
    res.render("authors/index", {
      authors: authors,
      searchOptions: req.query,
    });
  } catch {
    res.redirect("/");
  }
});

router.get("/new", checkAuthenticated, (req, res) => {
  res.render("authors/new", { author: new Author() });
});

router.post("/", async (req, res) => {
  const user = req.user;
  const author = new Author({
    name: req.body.name,
    user: user,
  });
  try {
    const newAuthor = await author.save();
    res.redirect(`/authors/${newAuthor.id}`);
  } catch {
    res.render("authors/new", {
      author: author,
      errorMessage:
        "Error creating author. Check if author name is blank or already exists.",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const author = await Author.findById(req.params.id).populate("user").exec();
    const books = await Book.find({ author: author.id }).limit(5).exec();
    res.render("authors/show", {
      author: author,
      booksByAuthor: books,
    });
  } catch {
    res.redirect("/");
  }
});

router.get("/:id/edit", checkAuthenticated, checkIfAuthorOwner, async (req, res) => {
    try {
      const author = await Author.findById(req.params.id);
      res.render("authors/edit", { author: author });
    } catch {
      res.redirect("/authors");
    }
  }
);

router.put("/:id", checkAuthenticated, checkIfAuthorOwner, async (req, res) => {
  let author;
  try {
    author = await Author.findById(req.params.id);
    author.name = req.body.name;
    await author.save();
    res.redirect(`/authors/${author.id}`);
  } catch {
    if (author == null) {
      res.redirect("/");
    } else {
      res.render("authors/edit", {
        author: author,
        errorMessage:
          "Error updating author. Check if author name is blank already exists",
      });
    }
  }
});

router.delete( "/:id", checkAuthenticated, checkIfAuthorOwner, async (req, res) => {
    let author;
    try {
      author = await Author.findById(req.params.id);
      await author.remove();
      res.redirect("/authors");
    } catch {
      if (author == null) {
        res.redirect("/");
      } else {
        req.errorMessage;
        ("Error deleting!!!");
        req.flash("success", "Error deleting");
        res.redirect(`/authors/${author.id}`);
      }
    }
  }
);

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

async function checkIfAuthorOwner(req, res, next) {
  let author;
  author = await Author.findById(req.params.id);
  if (author.user != req.user.id) {
    res.redirect("/");
    return;
  } else {
    return next();
  }
}

module.exports = router;
