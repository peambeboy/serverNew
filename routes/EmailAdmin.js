const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs"); // Import bcryptjs library
const Email = require("../models/Email");

//Check Admin
router.post("/", async (req, res) => {
  try {
    const { user, pass } = req.body;

    const result = await Email.findOne({ user: user });

    if (result) {
      // ตรวจสอบรหัสผ่าน
      const isPasswordValid = await bcrypt.compare(pass, result.pass);
      if (isPasswordValid) {
        res.json({ isAdmin: true });
      } else {
        res.json({ isAdmin: false });
      }
    } else {
      res.json({ isAdmin: false });
    }
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการค้นหาในฐานข้อมูล:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการตรวจสอบ" });
  }
});

//Add Admin
router.post("/user", async (req, res) => {
  try {
    const { user, pass } = req.body;

    // ตรวจสอบว่าอีเมลซ้ำกันหรือไม่
    const existingEmail = await Email.findOne({ user: user });

    if (existingEmail) {
      return res.status(400).json({ message: "user นี้มีอยู่แล้วในระบบ" });
    }

    // Hash รหัสผ่านก่อนเก็บลงในฐานข้อมูล
    const hashedPassword = await bcrypt.hash(pass, 10); // 10 เป็นค่า salt rounds

    const createdEmail = await Email.create({ user, pass: hashedPassword });
    res.json(createdEmail);
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการสร้าง user:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการสร้าง user" });
  }
});

//Delete email admin
router.delete("/delete-user/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const { _id } = req.body;
    const user = await Email.findById(_id);
    const userDel = await Email.findById(userId);
    if (!userDel) {
      return res.status(404).json({ error: "ไม่พบผู้ใช้ที่ต้องการลบ" });
    }
    if (user.userstatus !== "admin") {
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์ในการลบผู้ใช้" });
    }
    await Email.findByIdAndDelete(userId);
    res.json({ message: "ลบผู้ใช้สำเร็จ" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบผู้ใช้" });
  }
});

//Update Admin
router.put("/update-user/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const _id = req.body._id;
    const updateform = {
      user: req.body.user,
      pass: req.body.pass,
      userstatus: req.body.userstatus,
      updatetime: new Date(),
    };
    const userUpdater = await Email.findById(_id);

    const existingUser = await Email.findOne({ user: updateform.user });
    if (existingUser && existingUser._id.toString() !== userId) {
      return res
        .status(400)
        .json({ error: "ชื่อผู้ใช้ซ้ำกับผู้ใช้ที่มีอยู่แล้ว" });
    }

    if (userUpdater.userstatus !== "admin") {
      return res.status(403).json({ error: "ไม่อนุญาตให้อัพเดตผู้ใช้" });
    }

    const userUpdate = await Email.findByIdAndUpdate(userId, updateform, {
      new: true,
    });
    
    res.status(200).json(userUpdate);
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการอัพเดตผู้ใช้" });
  }
});

router.get("/check-user", async (req, res) => {
  const listOfPosts = await Email.find();
  res.json(listOfPosts);
});

module.exports = router;
