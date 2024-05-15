var createError = require("http-errors");
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
const bodyParser = require("body-parser");
const http = require("http");
const WebSocket = require("ws");
const Token = require("./models/Token");
const RevokedToken = require("./models/RevokedToken");
require("dotenv").config();

mongoose.Promise = global.Promise;

const URI = process.env.URI_MONGO;

mongoose
  .connect(`${URI}`)
  .then(() => {
    console.log("Connection successfully");
  })
  .catch((err) => {
    console.error(err);
  });

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");

var app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

// เก็บข้อมูลการเชื่อมต่อ WebSocket
const clients = new Map();

wss.on("connection", (ws, req) => {
  const userId = req.url.split("?userId=")[1];
  if (!clients.has(userId)) {
    clients.set(userId, []);
  }
  clients.get(userId).push(ws);

  ws.on("close", () => {
    const userConnections = clients.get(userId);
    if (userConnections) {
      const index = userConnections.indexOf(ws);
      if (index !== -1) {
        userConnections.splice(index, 1);
      }
      if (userConnections.length === 0) {
        clients.delete(userId);
      }
    }
  });
});

// ทำให้ clients สามารถถูกใช้งานใน routes ได้
app.set("clients", clients);

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

// ฟังก์ชันสำหรับตรวจสอบและแจ้งเตือนโทเคนหมดอายุ
const checkTokenExpiry = async (clients) => {
  const now = Date.now();
  const tokens = await Token.find({ expiresAt: { $lte: now } });

  tokens.forEach(async (token) => {
    const ws = clients.get(token.user);
    if (ws) {
      ws.send(
        JSON.stringify({ type: "TOKEN_EXPIRED", message: "Token หมดอายุ" })
      );
    }

    // ลบ token เก่าและเพิ่มลงใน blacklist พร้อมตั้งเวลาหมดอายุ
    await RevokedToken.create({
      token: token.token,
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 ชั่วโมงจากตอนนี้
    });
  });
};

// ตั้งเวลาให้ตรวจสอบโทเคนหมดอายุทุกนาที
setInterval(() => checkTokenExpiry(clients), 60 * 1000);

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

module.exports = app;
