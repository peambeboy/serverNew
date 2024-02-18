const express = require("express");
const router = express.Router();
const multer = require("multer");
const Order = require("../models/Order");

const storage = multer.memoryStorage();
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("ไม่ใช่ไฟล์รูปภาพ!"), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 },
  fileFilter: imageFilter,
});

router.post("/", async (req, res) => {
  try {
    const order = req.body;
    const newOrder = await Order.create(order);
    res.json(newOrder);
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ" });
  }
});

router.post(
  "/upload-image",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "slip", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        productname,
        category,
        detail,
        price,
        amount,
        email,
        name,
        tel,
        address,
      } = req.body;

      if (
        !productname ||
        !category ||
        !detail ||
        !price ||
        !amount ||
        !email ||
        !name ||
        !tel ||
        !address
      ) {
        return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
      }

      if (!req.files["image"] || !req.files["slip"]) {
        return res
          .status(400)
          .json({ message: "กรุณาอัพโหลดไฟล์รูปภาพและหลักฐานการชำระเงิน" });
      }

      let cleanedPrice = price.replace(",", "");
      let parsedPrice = parseInt(cleanedPrice);
      let totalPrice = parsedPrice * parseInt(amount);
      let formattedPrice = parsedPrice;
      // console.log("🚀 ~ parsedPrice:", parsedPrice)
      let formattedAmount = amount;
      let formattedTotalPrice = totalPrice;

      if (totalPrice > 1000) {
        formattedPrice = parseInt(parsedPrice).toLocaleString();
        formattedAmount = parseInt(amount).toLocaleString();
        formattedTotalPrice = totalPrice.toLocaleString();
      }

      const image = req.files["image"][0].buffer;
      const slip = req.files["slip"][0].buffer;

      const newPost = new Order({
        productname,
        category,
        detail,
        price: formattedPrice,
        amount: formattedAmount,
        totalprice: formattedTotalPrice,
        image,
        email,
        name,
        tel,
        address,
        slip,
      });

      const savedPost = await newPost.save();

      res.json({
        message: "บันทึกข้อมูลสำเร็จ",
        newPost: savedPost,
      });
    } catch (error) {
      console.error("เกิดข้อผิดพลาด:", error);
      res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
    }
  }
);

//Show image
router.get("/images/:postId", async (req, res) => {
  try {
    const postId = req.params.postId;
    const post = await Order.findById(postId);

    if (!post || !post.image) {
      return res.status(404).json({ message: "ไม่พบรูปภาพ" });
    }

    // ส่งรูปภาพกลับไปให้ผู้ใช้
    res.set("Content-Type", "image/jpeg"); // กำหนด Content-Type ตามประเภทของรูปภาพ (JPEG, ในที่นี้)
    res.send(post.image);
  } catch (error) {
    console.error("เกิดข้อผิดพลาด:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงรูปภาพ" });
  }
});

//Show slip
router.get("/slip/:postId", async (req, res) => {
  try {
    const postId = req.params.postId;
    const post = await Order.findById(postId);

    if (!post || !post.slip) {
      return res.status(404).json({ message: "ไม่พบรูปภาพ" });
    }

    // ส่งรูปภาพกลับไปให้ผู้ใช้
    res.set("Content-Type", "image/jpeg"); // กำหนด Content-Type ตามประเภทของรูปภาพ (JPEG, ในที่นี้)
    res.send(post.slip);
  } catch (error) {
    console.error("เกิดข้อผิดพลาด:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงรูปภาพ" });
  }
});

router.post("/get-user-orders", async (req, res) => {
  try {
    const userEmail = req.body.email;
    if (!userEmail) {
      return res
        .status(400)
        .json({ error: "อีเมล์จำเป็นสำหรับการดึงรายการคำสั่งซื้อ" });
    }

    const userOrders = await Order.findAll({
      where: {
        email: userEmail,
      },
    });

    res.json(userOrders);
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการดึงรายการคำสั่งซื้อ:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการดึงรายการคำสั่งซื้อ" });
  }
});

//Get all Orders
router.get("/", async (req, res) => {
  const listOfPosts = await Order.find();
  res.json(listOfPosts);
});

module.exports = router;
