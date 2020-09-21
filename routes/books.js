const express = require("express");
const router = express.Router();
const Book = require("../models/book");
const Author = require("../models/author");
const imageMimeTypes = ["image/jpeg", "image/png", "images/gif"];

router.get("/", async (req, res) => {
  let query = Book.find();
  if (req.query.title != null && req.query.title !== "") {
    query = query.regex("title", new RegExp(req.query.title, "i"));
  }
  if (req.query.publishedBefore != null && req.query.publishedBefore !== "") {
    query = query.lte("publishDate", req.query.publishedBefore);
  }
  if (req.query.publishedAfter != null && req.query.publishedAfter !== "") {
    query = query.lte("publishDate", req.query.publishedAfter);
  }
  try {
    const books = await query.exec();
    res.render("books/index", {
      books: books,
      searchOptions: req.query,
    });
  } catch {
    res.redirect("/");
  }
});

router.get("/new", checkAuthenticated, async (req, res) => {
  renderNewPage(res, new Book());
});

router.post("/", checkAuthenticated, async (req, res) => {
  const user = req.user;
  const book = new Book({
    title: req.body.title,
    author: req.body.author,
    user: user,
    publishDate: new Date(req.body.publishDate),
    pageCount: req.body.pageCount,
    description: req.body.description,
  });
  saveCover(book, req.body.cover);
  try {
    const newBook = await book.save();
    res.redirect(`books/${newBook.id}`);
  } catch {
    renderNewPage(res, book, true);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id)
      .populate("author")
      .populate("user")
      .exec();
    res.render("books/show", { book: book });
  } catch {
    res.redirect("/");
  }
});

router.get("/:id/edit", checkAuthenticated, checkIfBookOwner, async (req, res) => {
    try {
      const book = await Book.findById(req.params.id);
      renderEditPage(res, book);
    } catch {
      res.redirect("/");
    }
  }
);

router.put("/:id", checkAuthenticated, checkIfBookOwner, async (req, res) => {
  let book;
  try {
    book = await Book.findById(req.params.id);
    book.title = req.body.title;
    book.author = req.body.author;
    book.publishDate = new Date(req.body.publishDate);
    book.pageCount = req.body.pageCount;
    book.description = req.body.description;
    if (req.body.cover != null && req.body.cover !== "") {
      saveCover(book, req.body.cover);
    }
    await book.save();
    res.redirect(`/books/${book.id}`);
  } catch {
    if (book != null) {
      renderEditPage(res, book, true);
    } else {
      res.redirect("/");
    }
  }
});

router.delete("/:id", checkAuthenticated, checkIfBookOwner, async (req, res) => {
    let book;
    try {
      book = await Book.findById(req.params.id);
      await book.remove();
      res.redirect("/books");
    } catch {
      if (book != null) {
        res.render("books/show", {
          book: book,
          errorMessage: "Could not remove book",
        });
      } else {
        res.redirect("/");
      }
    }
  }
);

async function renderNewPage(res, book, hasError = false) {
  renderFormPage(res, book, "new", hasError);
}

async function renderEditPage(res, book, hasError = false) {
  renderFormPage(res, book, "edit", hasError);
}

async function renderFormPage(res, book, form, hasError = false) {
  try {
    const authors = await Author.find({});
    const params = {
      authors: authors,
      book: book,
    };
    if (hasError) {
      if (form === "edit") {
        params.errorMessage =
          "Error updating book. Check if you enter all fields or if book title already exists";
      } else {
        params.errorMessage =
          "Error creating book. Check if you enter all fields or if book title already exists.";
      }
    }
    res.render(`books/${form}`, params);
  } catch {
    res.redirect("/books");
  }
}

function saveCover(book, coverEncoded) {
  try {
    if (coverEncoded == null) return;
    const cover = JSON.parse(coverEncoded);
    if (cover != null && imageMimeTypes.includes(cover.type)) {
      book.coverImage = new Buffer.from(cover.data, "base64");
      book.coverImageType = cover.type;
    }
  } catch (error) {
    console.log(error);
  }
}

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

async function checkIfBookOwner(req, res, next) {
  let book;
  book = await Book.findById(req.params.id);
  if (book.user != req.user.id) {
    res.redirect("/");
    return;
  } else {
    return next();
  }
}

module.exports = router;
