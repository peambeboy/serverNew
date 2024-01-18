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

    // บันทึกรูปภาพลงใน MongoDB
    const newPost = new Posts({
      name: req.body.name,
      category: req.body.category,
      detail: req.body.detail,
      price: req.body.price,
      amount: req.body.amount,
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
router.put("/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const updatedData = req.body;

    // ตรวจสอบว่า updatedData ไม่มีค่าว่างหรือ null
    for (const key in updatedData) {
      if (updatedData[key] === null || updatedData[key] === undefined) {
        return res
          .status(400)
          .json({ error: `ค่า ${key} ต้องไม่เป็นค่าว่างหรือ null` });
      }
    }

    // ค้นหาและอัปเดตข้อมูลสินค้าโดยใช้ ID
    const updatedPost = await Posts.findByIdAndUpdate(postId, updatedData, {
      new: true, // เพื่อให้คืนค่าข้อมูลหลังจากการอัปเดต
    });

    if (updatedPost) {
      res.json({ message: "อัปเดตข้อมูลสินค้าสำเร็จ", post: updatedPost });
    } else {
      res.status(404).json({ error: "ไม่พบสินค้าที่ต้องการอัปเดต" });
    }
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตสินค้า" });
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
