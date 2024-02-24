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
  const listOfPosts = await Cart.find();
  res.json(listOfPosts);
});

router.post(
  "/upload-image",
  upload.fields([{ name: "image", maxCount: 1 }]),
  async (req, res) => {
    try {
      const { productid, productname, category, detail, price, amount } =
        req.body;

      if (
        !productid ||
        !productname ||
        !category ||
        !detail ||
        !price ||
        !amount
      ) {
        return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
      }

      if (!req.files["image"]) {
        return res.status(400).json({ message: "กรุณาอัพโหลดไฟล์รูปภาพ" });
      }

      let formattedPrice = parseInt(price).toLocaleString();
      let formattedAmount = parseInt(amount).toLocaleString();

      let image;

      image = req.files["image"][0].buffer;

      const newPost = new Cart({
        productid,
        productname,
        category,
        detail,
        price: formattedPrice,
        amount: formattedAmount,
        image: image,
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

router.delete

module.exports = router;