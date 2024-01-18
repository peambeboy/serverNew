const express = require("express");
const router = express.Router();
const Email = require("../models/Email");

//Check Admin
router.post("/", async (req, res) => {
  try {
    const { email } = req.body;

    // ค้นหาอีเมล์ในฐานข้อมูล
    const result = await Email.findOne({ email: email });

    if (result) {
      res.json({ isAdmin: true });
    } else {
      res.json({ isAdmin: false });
    }
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการค้นหาในฐานข้อมูล:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการตรวจสอบอีเมล์" });
  }
});

//Add Admin
router.post("/email", async (req, res) => {
  try {
    const post = req.body;

    // ตรวจสอบว่าอีเมลซ้ำกันหรือไม่
    const existingEmail = await Email.findOne({ email: post.email });

    if (existingEmail) {
      return res.status(400).json({ message: "อีเมลนี้มีอยู่แล้วในระบบ" });
    }

    const createdEmail = await Email.create(post);
    res.json(createdEmail);
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการสร้างอีเมล์:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการสร้างอีเมล์" });
  }
});

//Delete email admin
router.delete("/delete-email/:id", async (req, res) => {
  try {
    const emailId = req.params.id;

    // ค้นหาและลบอีเมล์โดยใช้ ID ด้วย Mongoose
    const deletedEmail = await Email.findOneAndDelete({ _id: emailId });

    if (deletedEmail) {
      res.json({ message: "ลบอีเมลสำเร็จ" });
    } else {
      res.status(404).json({ error: "ไม่พบอีเมลที่ต้องการลบ" });
    }
  } catch (error) {
    console.error("Error deleting email:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบอีเมล" });
  }
});

router.get("/check-email", async (req, res) => {
    const listOfPosts = await Email.find();
    res.json(listOfPosts);
  });

module.exports = router;
