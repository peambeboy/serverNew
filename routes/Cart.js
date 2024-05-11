const express = require("express");
const router = express.Router();
const multer = require("multer");
const Cart = require("../models/Cart");

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

router.get("/", async (req, res) => {
  const userEmail = req.query.email; // สมมติว่า email ถูกส่งผ่าน query string
  try {
    const cartItems = await Cart.find({ email: userEmail });
    res.json(cartItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/upload-image", async (req, res) => {
  try {
    const {
      productid,
      email,
      productname,
      category,
      size,
      detail,
      price,
      amount,
    } = req.body;

    if (
      !productid ||
      !email ||
      !productname ||
      !category ||
      !size ||
      !detail ||
      !price ||
      !amount
    ) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    const newPrice = price * amount;

    const existingProduct = await Cart.findOne({
      productid: productid,
      email: email,
      size: size,
    });
    console.log(
      "🚀 ~ file: Cart.js:62 ~ router.post ~ existingProduct:",
      existingProduct
    );

    if (existingProduct) {
      // หากพบสินค้าที่ตรงกัน

      // ทำการคำนวณราคาและจำนวนใหม่
      const updatedPrice = existingProduct.price + newPrice;
      const updatedAmount = existingProduct.amount + amount;

      // อัปเดตข้อมูลในเอกสาร
      const updatedProduct = await Cart.findOneAndUpdate(
        {
          productid: productid,
          email: email,
          size: size,
        },
        {
          price: updatedPrice,
          amount: updatedAmount,
        },
        {
          new: true, // เพื่อให้คืนค่าข้อมูลที่ถูกอัปเดตกลับมา
        }
      );

      // ตรวจสอบว่าอัปเดตสำเร็จหรือไม่
      if (updatedProduct) {
        // สามารถทำตามกระบวนการที่ต้องการได้
        res.json({
          message: "อัปเดตข้อมูลสำเร็จ",
          updatedProduct: updatedProduct,
        });
      } else {
        // กรณีที่ไม่สามารถอัปเดตข้อมูลได้
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล" });
      }
    } else {
      // หากไม่พบสินค้าที่ตรงกัน

      // หากไม่มีสินค้าที่มี _id เดียวกัน สร้างสินค้าใหม่
      const newPost = new Cart({
        productid,
        email,
        productname,
        category,
        size,
        detail,
        price: newPrice,
        amount,
      });

      const savedPost = await newPost.save();

      res.json({
        message: "บันทึกข้อมูลสำเร็จ",
        newPost: savedPost,
      });
    }
  } catch (error) {
    console.error("เกิดข้อผิดพลาด:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const postId = req.params.id;

    // ใช้ findByIdAndDelete ด้วย ID โดยตรง
    const deletedPost = await Cart.findByIdAndDelete(postId);

    if (deletedPost) {
      res.json({ message: "ลบสินค้าเรียบร้อย" });
    } else {
      res.status(404).json({ error: "ไม่พบสินค้า" });
    }
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบคำสั่งซื้อ" });
  }
});

router.delete;

module.exports = router;
