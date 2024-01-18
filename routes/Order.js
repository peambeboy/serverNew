const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

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

router.get("/get-image/:id", async (req, res) => {
  try {
    const imageId = req.params.id;
    const image = await Order.findByPk(imageId);

    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    // ส่งข้อมูลรูปภาพกลับไปยังไคลเอนต์พร้อม Content-Type
    res.setHeader("Content-Type", image.ImageMimeType);
    res.send(image.ImageData);
  } catch (error) {
    console.error("Error fetching image:", error);
    res.status(500).json({ error: "Internal server error" });
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