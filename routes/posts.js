const express = require("express");
const router = express.Router();
const multer = require("multer"); // ใช้ Multer สำหรับการอัปโหลดไฟล์
const Posts = require("../models/Posts");
const Token = require("../models/Token");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const {
  verifyToken,
  generateNewToken,
  generateToken,
  hashPassword,
} = require("../utilities/token");

// Load environment variables
dotenv.config();

// Use environment variable for secret key
const secretKey = process.env.JWT_SECRET;

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
  try {
    let query = {};
    if (req.query.search) {
      query = {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { category: { $regex: req.query.search, $options: "i" } },
          // สามารถเพิ่มเงื่อนไขค้นหาเพิ่มเติมได้ตามความต้องการ
        ],
      };
    }
    const listOfPosts = await Posts.find(query);
    res.json(listOfPosts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Error fetching posts" });
  }
});

router.post("/upload-image",verifyToken, upload.single("image"), async (req, res) => {
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

    const token = req.headers["authorization"];
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    const decoded = jwt.verify(token, secretKey);

    const findAdmin = await Token.findOne({ user: decoded.user });

    // รับรูปภาพจากคำขอ
    const image = req.file.buffer;

    // บันทึกรูปภาพลงใน MongoDB
    const newPost = new Posts({
      name: req.body.name,
      category: req.body.category,
      detail: req.body.detail,
      price: req.body.price,
      amount: req.body.amount,
      sale: req.body.sale,
      image: image, // เก็บข้อมูลรูปภาพในฐานข้อมูล
    });

    const newToken = await generateNewToken(decoded.user,findAdmin);

    const savedPost = await newPost.save();

    res.json({
      message: "บันทึกข้อมูลสำเร็จ",
      newPost: savedPost,
      newToken: newToken
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

    if (req.body.amount <= 0) {
      req.body.amount = "สินค้าหมด";
    }

    const post = await Posts.findById(postId);

    if (
      updatedData["sale"] &&
      updatedData["sale"]["saleornot"] === "true" &&
      updatedData["sale"]["salepercent"] !== 0
    ) {
      try {
        if (!post) {
          return res.status(404).json({ error: "ไม่พบโพสต์ที่ต้องการอัปเดต" });
        }

        // หาจำนวนเงินที่ลดลงจากเปอร์เซ็นต์ส่วนลด
        const discountAmount = post.price * (req.body.sale.salepercent / 100);

        // หาราคาสินค้าหลังหักเปอร์เซ็นต์ส่วนลด
        const discountedPrice = post.price - discountAmount;

        updatedData.pricesale = discountedPrice;
        if (post.sale.salestart == undefined) {
          updatedData.sale.salestart = new Date();
          updatedData.sale.saleend = post.sale.saleend;
        } else {
          updatedData.sale.salestart = post.sale.salestart;
          updatedData.sale.saleend = post.sale.saleend;
        }
      } catch (error) {
        console.error("Error updating post:", error);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตโพสต์" });
      }
    } else if (
      updatedData["sale"] &&
      updatedData["sale"]["saleornot"] === "false"
    ) {
      updatedData.sale.saleend = new Date();
      updatedData.sale.salestart = post.sale.salestart;
      updatedData.sale.salepercent = 0;
      updatedData.pricesale = 0;
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

//Update By ID Admin
router.put("update_product_admin/:id",verifyToken, upload.single("image"), async (req, res) => {
  try {
    const postId = req.params.id;
    const updatedData = req.body;
    const updatedImageData = req.file ? req.file.buffer : null; // นี่คือข้อมูลของไฟล์รูปภาพที่อัปโหลด (หากมีการอัปโหลด)

    const token = req.headers["authorization"];
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    const decoded = jwt.verify(token, secretKey);

    const findAdmin = await Token.findOne({ user: decoded.user });

    // ถ้ามีการอัปโหลดภาพ หรือมีข้อมูลของภาพที่ถูกส่งมา
    if (updatedImageData) {
      updatedData.image = updatedImageData; // เพิ่มข้อมูลรูปภาพใน updatedData
    }

    if (req.body.amount <= 0) {
      req.body.amount = "สินค้าหมด";
    }

    const post = await Posts.findById(postId);

    if (
      updatedData["sale"] &&
      updatedData["sale"]["saleornot"] === "true" &&
      updatedData["sale"]["salepercent"] !== 0
    ) {
      try {
        if (!post) {
          return res.status(404).json({ error: "ไม่พบโพสต์ที่ต้องการอัปเดต" });
        }

        // หาจำนวนเงินที่ลดลงจากเปอร์เซ็นต์ส่วนลด
        const discountAmount = post.price * (req.body.sale.salepercent / 100);

        // หาราคาสินค้าหลังหักเปอร์เซ็นต์ส่วนลด
        const discountedPrice = post.price - discountAmount;

        updatedData.pricesale = discountedPrice;
        if (post.sale.salestart == undefined) {
          updatedData.sale.salestart = new Date();
          updatedData.sale.saleend = post.sale.saleend;
        } else {
          updatedData.sale.salestart = post.sale.salestart;
          updatedData.sale.saleend = post.sale.saleend;
        }
      } catch (error) {
        console.error("Error updating post:", error);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัปเดตโพสต์" });
      }
    } else if (
      updatedData["sale"] &&
      updatedData["sale"]["saleornot"] === "false"
    ) {
      updatedData.sale.saleend = new Date();
      updatedData.sale.salestart = post.sale.salestart;
      updatedData.sale.salepercent = 0;
      updatedData.pricesale = 0;
    }

    // ค้นหาและอัปเดตข้อมูลโพสต์โดยใช้ ID
    const updatedPost = await Posts.findByIdAndUpdate(postId, updatedData, {
      new: true,
    });

    const newToken = await generateNewToken(decoded.user,findAdmin);

    if (updatedPost) {
      res.json({ message: "อัปเดตข้อมูลสำเร็จ", post: updatedPost ,newToken});
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
router.delete("/:id",verifyToken, async (req, res) => {
  try {
    const postId = req.params.id;

    const token = req.headers["authorization"];
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    const decoded = jwt.verify(token, secretKey);

    const findAdmin = await Token.findOne({ user: decoded.user });

    // ใช้ findByIdAndDelete ด้วย ID โดยตรง
    const deletedPost = await Posts.findByIdAndDelete(postId);

    const newToken = await generateNewToken(decoded.user,findAdmin);

    if (deletedPost) {
      res.json({ message: "ลบสินค้าสำเร็จ" ,newToken});
    } else {
      res.status(404).json({ error: "ไม่พบสินค้าที่ต้องการลบ" });
    }
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบสินค้่า" });
  }
});

module.exports = router;
