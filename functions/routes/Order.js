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
      res.json({ message: "ลบคำสั่งซื้อสำเร็จ" });
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

    const { status, parcel, provider } = req.body;

    // ตรวจสอบว่าข้อมูล successtime และ canceltime ถูกส่งมาหรือไม่
    if (!status) {
      return res.status(400).json({ message: "กรุณาระบุ status" });
    }

    let updateFields;

    if (status === "สำเร็จ") {
      updateFields = {
        status: status,
        successtime: new Date(),
        canceltime: null,
        provider: provider,
        parcel: parcel,
      };
    } else if (status === "ปฏิเสธ") {
      updateFields = {
        status: status,
        canceltime: new Date(),
        successtime: null,
        provider: "คำสั่งซื้อถูกปฏิเสธ",
        parcel: "คำสั่งซื้อถูกปฏิเสธ",
      };
    } else if (status === "กำลังดำเนินการ") {
      updateFields = {
        status: req.body.status,
        canceltime: null,
        successtime: null,
        provider: "อยู่ระหว่างดำเนินการตรวจสอบ",
        parcel: "อยู่ระหว่างดำเนินการตรวจสอบ",
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

      if (payment === "โอนเงิน") {
        slip = req.files["slip"][0].buffer;
      }
      axios
        .get(`${process.env.URL_FIREBASE}/posts/${productid}`)
        .then((response) => {
          const res = response.data;
          console.log(res);

          const body = {
            amount: res.amount - amount,
          };

          axios
            .put(`${process.env.URL_FIREBASE}/posts/${productid}`, body)
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
        // image: image,
        email,
        name,
        tel,
        address,
        parcel: "อยู่ระหว่างดำเนินการตรวจสอบ",
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
router.get("/dashboard", async (req, res) => {
  try {
    const listOfOrdersSuccess = await Order.find({ status: "สำเร็จ" });
    const listOfOrdersWait = await Order.find({ status: "กำลังดำเนินการ" });
    const listOfOrdersCancel = await Order.find({ status: "ปฏิเสธ" });
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    let totalAmountWait = 0;
    let totalPriceWait = 0;
    let totalAmountMontlyWait = 0;
    let totalPriceMontlyWait = 0;

    let totalAmountSuccess = 0;
    let totalPriceSuccess = 0;
    let totalAmountSuccessMontly = 0;
    let totalPriceSuccessMontly = 0;

    let totalAmountCancel = 0;
    let totalPriceCancel = 0;
    let totalAmountMontlyCancel = 0;
    let totalPriceMontlyCancel = 0;

    let ProductCountSuccess = 0;
    let ProductCountCancel = 0;
    let ProductCountWait = 0;

    listOfOrdersCancel.forEach((order) => {
      const orderDate = new Date(order.canceltime);
      if (
        orderDate.getMonth() + 1 === currentMonth &&
        orderDate.getFullYear() === currentYear
      ) {
        const price = parseInt(order.totalprice.replace(/,/g, ""));
        const amount = parseInt(order.amount.replace(/,/g, ""));
        totalAmountMontlyCancel += amount;
        totalPriceMontlyCancel += price;
        ProductCountCancel++;
      }
      const price = parseInt(order.totalprice.replace(/,/g, ""));
      const amount = parseInt(order.amount.replace(/,/g, ""));
      totalAmountCancel += amount;
      totalPriceCancel += price;
    });

    listOfOrdersWait.forEach((order) => {
      const orderDate = new Date(order.ordertime);
      if (
        orderDate.getMonth() + 1 === currentMonth &&
        orderDate.getFullYear() === currentYear
      ) {
        const price = parseInt(order.totalprice.replace(/,/g, ""));
        const amount = parseInt(order.amount.replace(/,/g, ""));
        totalAmountMontlyWait += amount;
        totalPriceMontlyWait += price;
        ProductCountWait++;
      }
      const price = parseInt(order.totalprice.replace(/,/g, ""));
      const amount = parseInt(order.amount.replace(/,/g, ""));
      totalAmountWait += amount;
      totalPriceWait += price;
    });

    listOfOrdersSuccess.forEach((order) => {
      const orderDate = new Date(order.successtime);
      if (
        orderDate.getMonth() + 1 === currentMonth &&
        orderDate.getFullYear() === currentYear
      ) {
        const price = parseInt(order.totalprice.replace(/,/g, ""));
        const amount = parseInt(order.amount.replace(/,/g, ""));
        totalAmountSuccessMontly += amount;
        totalPriceSuccessMontly += price;
        ProductCountSuccess++;
      }
      const price = parseInt(order.totalprice.replace(/,/g, ""));
      const amount = parseInt(order.amount.replace(/,/g, ""));
      totalAmountSuccess += amount;
      totalPriceSuccess += price;
    });

    // all Success only
    const totalpriceSuccess = totalPriceSuccess;
    const totalamountSuccess = totalAmountSuccess;
    //เดือนปัจจุบัน success only
    const totalpriceMontlySuccess = totalPriceSuccessMontly;
    const totalamountMontlySuccess = totalAmountSuccessMontly;
    //all in progess
    const totalpriceWait = totalPriceWait;
    const totalamountWait = totalAmountWait;
    // เดือนปัจุบัน in progess
    const totalpriceMontlyWait = totalPriceMontlyWait;
    const totalamountMontlyWait = totalAmountMontlyWait;
    //all cancel
    const totalpriceCancel = totalPriceCancel;
    const totalamountCancel = totalAmountCancel;
    //เดือนปัจจุบัน cancel
    const totalpriceMontlyCancel = totalPriceMontlyCancel;
    const totalamountMontlyCancel = totalAmountMontlyCancel;
    axios
      .get(`${process.env.URL_FIREBASE}/posts`)
      .then((response) => {
        const ProductCount = response.data.length;
        res.json({
          totalamountMontlyWait,
          totalpriceMontlyWait,
          totalamountWait,
          totalpriceWait,
          totalamountMontlyCancel,
          totalpriceMontlyCancel,
          totalamountCancel,
          totalpriceCancel,
          totalamountMontlySuccess,
          totalpriceMontlySuccess,
          totalamountSuccess,
          totalpriceSuccess,
          ProductCount,
          ProductCountSuccess,
          ProductCountCancel,
          ProductCountWait,
        });
      })
      .catch((error) => {
        console.error("Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
      });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
