const express = require("express");
const router = express.Router();
const multer = require("multer"); // ใช้ Multer สำหรับการอัปโหลดไฟล์
const Posts = require("../models/Posts");

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

//Get all posts
router.get("/", async (req, res) => {
  const listOfPosts = await Posts.find(); // ใช้ Posts.find() แทน Sequelize Model ในการค้นหาข้อมูล
  res.json(listOfPosts);
});

router.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    // ตรวจสอบว่าทุกค่าไม่เป็นค่าว่างหรือ null
    if (
      !req.body.name ||
      !req.body.category ||
      !req.body.detail ||
      !req.body.price ||
      !req.body.amount ||
      !req.file.buffer
    ) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    // รับรูปภาพจากคำขอ
    const image = req.file.buffer;

    const Price = parseInt(req.body.price).toLocaleString();
    const Amount = parseInt(req.body.amount).toLocaleString();

    // บันทึกรูปภาพลงใน MongoDB
    const newPost = new Posts({
      name: req.body.name,
      category: req.body.category,
      detail: req.body.detail,
      price: Price,
      amount: Amount,
      image: image, // เก็บข้อมูลรูปภาพในฐานข้อมูล
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
});

//Update By ID
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const postId = req.params.id;
    const updatedData = req.body;
    const updatedImageData = req.file ? req.file.buffer : null; // นี่คือข้อมูลของไฟล์รูปภาพที่อัปโหลด (หากมีการอัปโหลด)

    // ถ้ามีการอัปโหลดภาพ หรือมีข้อมูลของภาพที่ถูกส่งมา
    if (updatedImageData) {
      updatedData.image = updatedImageData; // เพิ่มข้อมูลรูปภาพใน updatedData
    }

    // ค้นหาและอัปเดตข้อมูลโพสต์โดยใช้ ID
    const updatedPost = await Posts.findByIdAndUpdate(postId, updatedData, {
      new: true,
    });

    if (updatedPost) {
      res.json({ message: "อัปเดตข้อมูลสำเร็จ", post: updatedPost });
    } else {
      res.status(404).json({ error: "ไม่พบโพสต์ที่ต้องการอัปเดต" });
    }
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตโพสต์" });
  }
});

//Show Image By ID
router.get("/images/:postId", async (req, res) => {
  try {
    const postId = req.params.postId;
    const post = await Posts.findById(postId);

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

//Get By ID
router.get("/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Posts.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "ไม่พบโพสต์" });
    }

    // ส่งข้อมูลสินค้ากลับไปยังไคลเอนต์
    res.json(post);
  } catch (error) {
    console.error("Error fetching post data:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดบนเซิร์ฟเวอร์" });
  }
});

//Delete post by ID
router.delete("/:id", async (req, res) => {
  try {
    const postId = req.params.id;

    // ใช้ findByIdAndDelete ด้วย ID โดยตรง
    const deletedPost = await Posts.findByIdAndDelete(postId);

    if (deletedPost) {
      res.json({ message: "ลบสินค้าสำเร็จ" });
    } else {
      res.status(404).json({ error: "ไม่พบสินค้าที่ต้องการลบ" });
    }
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบสินค้่า" });
  }
});

module.exports = router;
