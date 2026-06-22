const express = require("express");
const router = express.Router();
const sliderController = require("../controller/sliders");
const { loginCheck } = require("../middleware/auth");
const multer = require("multer");

// Image Upload setting
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads/sliders");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage: storage });
const cpUpload = upload.fields([
  { name: 'desktopImage', maxCount: 1 },
  { name: 'mobileImage', maxCount: 1 }
]);

const imageValidator = require("../middleware/imageValidator");

// Admin endpoints for Sliders
router.get("/admin/sliders", loginCheck, sliderController.getAllAdminSliders);
router.post("/admin/sliders", loginCheck, cpUpload, imageValidator, sliderController.postAddSlider);
router.put("/admin/sliders/:id", loginCheck, cpUpload, imageValidator, sliderController.putUpdateSlider);
router.delete("/admin/sliders/:id", loginCheck, sliderController.deleteSlider);

module.exports = router;
