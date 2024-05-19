const express = require("express");
const router = express.Router();
const multer = require("multer");
const Order = require("../models/Order");
const Posts = require("../models/Posts");
const axios = require("axios");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const Token = require("../models/Token");

require("dotenv").config();

const {
  verifyToken,
  generateNewToken,
  generateToken,
  hashPassword,
} = require("../utilities/token");

const secretKey = process.env.JWT_SECRET;
const URL = process.env.URL_FIREBASE;

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
  limits: { fileSize: 1024 * 1024 * 10 },
  fileFilter: imageFilter,
});

//Delete post by ID
router.delete("/:id", async (req, res) => {
  try {
    const postId = req.params.id;

    // ใช้ findByIdAndDelete ด้วย ID โดยตรง
    const deletedPost = await Order.findByIdAndDelete(postId);

    if (deletedPost) {
      res.json({ message: "ลบคำสั่งซื้อสำเร็จ" });
    } else {
      res.status(404).json({ error: "ไม่พบรายการคำสั่งซื้อ" });
    }
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบคำสั่งซื้อ" });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, parcel, provider } = req.body;

    if (!status) {
      return res.status(400).json({ message: "กรุณาระบุ status" });
    }

    const updateFields = generateUpdateFields(status, parcel, provider);

    const updatedOrder = await updateOrderInDatabase(id, updateFields);

    res.json({ message: "อัปเดตข้อมูลเรียบร้อย", updatedOrder });
  } catch (error) {
    console.error("เกิดข้อผิดพลาด:", error);
    res.status(500).json({ message: "ไม่สามารถอัปเดตข้อมูลได้" });
  }
});

function generateUpdateFields(status, parcel, provider) {
  switch (status) {
    case "สำเร็จ":
      return {
        status,
        successtime: new Date(),
        canceltime: null,
        provider,
        parcel,
      };
    case "ปฏิเสธ":
      return {
        status,
        canceltime: new Date(),
        successtime: null,
        provider: "คำสั่งซื้อถูกปฏิเสธ",
        parcel: "คำสั่งซื้อถูกปฏิเสธ",
      };
    case "กำลังดำเนินการ":
      return {
        status,
        canceltime: null,
        successtime: null,
        provider: "อยู่ระหว่างดำเนินการตรวจสอบ",
        parcel: "อยู่ระหว่างดำเนินการตรวจสอบ",
      };
    default:
      throw new Error("Status ไม่ถูกต้อง");
  }
}

async function updateOrderInDatabase(id, updateFields) {
  return await Order.findByIdAndUpdate(id, updateFields, { new: true });
}

router.post("/upload-image", upload.single("slip"), async (req, res) => {
  try {
    const { items, email, name, tel, address, payment } = req.body;

    if (!isDataValid(items, email, name, tel, address, payment)) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
    }

    if (!areProductIdsValid(items)) {
      return res
        .status(400)
        .json({ message: "กรุณากรอก productid ให้ครบถ้วน" });
    }

    const totalPrice = calculateTotalPrice(items);

    let slip;
    if (payment === "โอนเงิน") {
      slip = validateAndRetrieveSlip(req.file);
      if (!slip) {
        return res.status(400).json({ message: "กรุณาแนบหลักฐานการโอนเงิน" });
      }
    }

    const processOrder = await processOrderItems(items);

    if (processOrder === 400) {
      return res.status(400).json({ message: "สินค้าไม่เพียงพอ" });
    } else if (processOrder === 404) {
      return res.status(404).json({ message: "ไม่พบสินค้า" });
    }

    const savedPost = await saveOrderToDatabase(
      items,
      totalPrice,
      email,
      name,
      tel,
      address,
      slip,
      payment
    );

    res.json({
      message: "บันทึกข้อมูลสำเร็จ",
      newPost: savedPost,
    });
  } catch (error) {
    console.error("เกิดข้อผิดพลาด:", error);
    res
      .status(500)
      .json({ message: `เกิดข้อผิดพลาดในการบันทึกข้อมูล: ${error}` });
  }
});

// ตรวจสอบข้อมูลที่จำเป็น
function isDataValid(items, email, name, tel, address, payment) {
  return (
    items &&
    Array.isArray(items) &&
    items.length > 0 &&
    email &&
    name &&
    tel &&
    address &&
    payment
  );
}

// ตรวจสอบค่า productid ในทุก items
function areProductIdsValid(items) {
  return items.every((item) => item.productid);
}

// คำนวณราคาสินค้า
function calculateTotalPrice(items) {
  return items.reduce((total, item) => {
    const parsedPrice = parseInt(item.price);
    return total + parsedPrice * parseInt(item.amount);
  }, 0);
}

// ตรวจสอบการชำระเงินและดึงข้อมูล slip จาก req.files
function validateAndRetrieveSlip(file) {
  return file && file.buffer ? file.buffer : null;
}

// ตรวจสอบและประมวลผลสินค้าที่สั่งซื้อ
async function processOrderItems(items) {
  for (const item of items) {
    const product = await findProductById(item.productid);
    if (!product) {
      return 404;
    }
    if (product.amount[item.size] < item.amount) {
      return 400;
    }
    product.amount[item.size] -= item.amount;
    await product.save();
  }
}

// ค้นหาสินค้าโดยใช้ productid
async function findProductById(productId) {
  try {
    return await Posts.findById(productId);
  } catch (error) {
    throw new Error(`เกิดข้อผิดพลาดในการค้นหาสินค้า: ${error.message}`);
  }
}

// บันทึกข้อมูลลงในฐานข้อมูล
async function saveOrderToDatabase(
  items,
  totalPrice,
  email,
  name,
  tel,
  address,
  slip,
  payment
) {
  const newPost = new Order({
    items,
    totalprice: totalPrice,
    email,
    name,
    tel,
    address,
    slip,
    payment,
    ordertime: new Date(),
  });
  return await newPost.save();
}

//Show image
// router.get("/images/:postId", async (req, res) => {
//   try {
//     const postId = req.params.postId;
//     const post = await Order.findById(postId);

//     if (!post || !post.image) {
//       return res.status(404).json({ message: "ไม่พบรูปภาพ" });
//     }

//     // ส่งรูปภาพกลับไปให้ผู้ใช้
//     res.set("Content-Type", "image/jpeg"); // กำหนด Content-Type ตามประเภทของรูปภาพ (JPEG, ในที่นี้)
//     res.send(post.image);
//   } catch (error) {
//     console.error("เกิดข้อผิดพลาด:", error);
//     res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงรูปภาพ" });
//   }
// });

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

//Get by Email
router.get("/email", async (req, res) => {
  const userEmail = req.query.email; // สมมติว่าต้องการใช้ query string สำหรับการส่ง email
  if (!userEmail) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const listOfPosts = await Order.find({ email: userEmail });
    res.json(listOfPosts);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Server error" });
  }
});

//Get for Dashboard
router.get("/dashboard", verifyToken, async (req, res) => {
  try {
    const tokenAdmin = req.headers["authorization"];
    const decoded = jwt.verify(tokenAdmin, secretKey);
    const findAdmin = await Token.findOne({ user: decoded.user });

    // ดึงข้อมูล order ที่มี status เป็น "สำเร็จ"
    const orders = await Order.aggregate([
      { $match: { status: "สำเร็จ" } },
      { $unwind: "$items" }, // แยกแต่ละรายการสินค้าในคำสั่งซื้อ
      {
        $group: {
          _id: {
            day: { $dayOfMonth: "$ordertime" },
            month: { $month: "$ordertime" },
            year: { $year: "$ordertime" },
            category: "$items.category", // เพิ่มการแยกตามหมวดหมู่
          },
          totalSales: { $sum: "$items.amount" }, // รวมจำนวนชิ้นที่ขายในแต่ละหมวดหมู่ต่อวัน
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
    ]);

    const newToken = await generateNewToken(decoded.user, findAdmin);

    // ส่งข้อมูลจำนวนยอดขายกลับไปยัง client
    res.status(200).json({orders,newToken});
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
