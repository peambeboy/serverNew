var createError = require("http-errors");
const functions = require("firebase-functions");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const mongoose = require("mongoose");
const Posts = require("./routes/posts");
const Email = require("./routes/EmailAdmin");
const Order = require("./routes/Order");
const Usersinfo = require("./routes/Usersinfo");
const Cart = require("./routes/Cart");
const cors = require("cors");

mongoose.Promise = global.Promise;

mongoose
  .connect(
    "mongodb+srv://peambeboy:1234@cluster0.sy2alpl.mongodb.net/?retryWrites=true&w=majority"
  )
  .then(() => {
    console.log("Connection successfully");
  })
  .catch((err) => {
    console.error(err);
  });

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");

var app = express();
app.use(cors());

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/posts", Posts);
app.use("/email", Email);
app.use("/order", Order);
app.use("/usersinfo", Usersinfo);
app.use("/cart", Cart);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

app.listen(() => {
  console.log(`Server is running on port 3001`);
});

exports.app = functions.region('asia-east2').https.onRequest(app);
