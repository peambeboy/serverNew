const express = require("express");
const router = express.Router();
const multer = require("multer");
const Order = require("../models/Order");
const axios = require("axios");

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

//Delete post by ID
router.delete("/:id", async (req, res) => {
  try {
    const postId = req.params.id;

    // ใช้ findByIdAndDelete ด้วย ID โดยตรง
    const deletedPost = await Order.findByIdAndDelete(postId);

    if (deletedPost) {
      res.json({ message: "ลบคำสั่งซื้อสำเร็๗" });
    } else {
      res.status(404).json({ error: "ไม่พบรายการคำสั่งซื้อ" });
    }
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบคำสั่งซื้อ" });
  }
});

// router.post("/", async (req, res) => {
//   try {
//     const order = req.body;
//     const newOrder = await Order.create(order);
//     res.json(newOrder);
//   } catch (error) {
//     console.error("เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ:", error);
//     res.status(500).json({ error: "เกิดข้อผิดพลาดในการสร้างคำสั่งซื้อ" });
//   }
// });

router.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { status } = req.body;

    // ตรวจสอบว่าข้อมูล successtime และ canceltime ถูกส่งมาหรือไม่
    if (!status) {
      return res.status(400).json({ message: "กรุณาระบุ status" });
    }

    let updateFields;

    if (status === "สำเร็จ") {
      updateFields = {
        successtime: new Date(),
        canceltime: null,
      };
    } else if (status === "ปฏิเสธ") {
      updateFields = {
        canceltime: new Date(),
        successtime: null,
      };
    }

    // อัปเดตข้อมูลใน MongoDB
    const updatedOrder = await Order.findByIdAndUpdate(id, updateFields, {
      new: true,
    });

    res.json({ message: "อัปเดตข้อมูลเรียบร้อย", updatedOrder });
  } catch (error) {
    console.error("เกิดข้อผิดพลาด:", error);
    res.status(500).json({ message: "ไม่สามารถอัปเดตข้อมูลได้" });
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
        productid,
        productname,
        category,
        detail,
        price,
        amount,
        email,
        name,
        tel,
        address,
        payment,
      } = req.body;

      if (
        !productid ||
        !productname ||
        !category ||
        !detail ||
        !price ||
        !amount ||
        !email ||
        !name ||
        !tel ||
        !address ||
        !payment
      ) {
        return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
      }

      if (!req.files["image"]) {
        return res.status(400).json({ message: "กรุณาอัพโหลดไฟล์รูปภาพ" });
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

      let image;
      let slip;

      if (payment === "ชำระเงินปลายทาง") {
        image = req.files["image"][0].buffer;
      } else if (payment === "โอนเงิน") {
        image = req.files["image"][0].buffer;
        slip = req.files["slip"][0].buffer;
      }
      axios
        .get(`http://localhost:3001/posts/${productid}`)
        .then((response) => {
          const res = response.data;
          console.log(res);

          const body = {
            amount: res.amount - amount,
          };

          axios
            .put(`http://localhost:3001/posts/${productid}`, body)
            .then((response) => {
              console.log(response.data);
            })
            .catch((error) => {
              console.error("Error updating data:", error);
            });
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
        });

      // const dateTimeString = new Date();
      // const momentObj = moment(dateTimeString);
      // const bangkokTime = momentObj.tz("Asia/Bangkok");
      // console.log("🚀 ~ bangkokTime:", bangkokTime)
      // const bangkokTimeformat = bangkokTime.format("YYYY-MM-DD HH:mm:ss");
      // console.log("🚀 ~ bangkokTimeformat:", bangkokTimeformat);

      const newPost = new Order({
        productid,
        productname,
        category,
        detail,
        price: formattedPrice,
        amount: formattedAmount,
        totalprice: formattedTotalPrice,
        image: image,
        email,
        name,
        tel,
        address,
        slip: slip,
        payment,
        ordertime: new Date(),
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
