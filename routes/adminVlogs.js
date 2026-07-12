const express = require("express");
const router = express.Router();
const vlogController = require("../controller/vlogs");
const vlogCategoryController = require("../controller/vlogCategories");
const { loginCheck, isAuth, isAdmin } = require("../middleware/auth");
const multer = require("multer");

// Image Upload setting
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads/vlogs");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage: storage });

const uploadFields = upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "gallery", maxCount: 10 }
]);

const imageValidator = require("../middleware/imageValidator");

// Admin endpoints for Vlogs
router.get("/admin/vlogs", loginCheck, vlogController.getAllAdminVlogs);
router.post("/admin/vlogs", loginCheck, uploadFields, imageValidator, vlogController.postAddVlog);
router.put("/admin/vlogs/:id", loginCheck, uploadFields, imageValidator, vlogController.putUpdateVlog);
router.delete("/admin/vlogs/:id", loginCheck, vlogController.deleteVlog);
router.patch("/admin/vlogs/:id/publish", loginCheck, vlogController.patchPublishStatus);
router.patch("/admin/vlogs/:id/status", loginCheck, vlogController.patchVlogStatus);

// Admin endpoints for Vlog Categories
router.post("/admin/vlog-categories", loginCheck, vlogCategoryController.postAddCategory);
router.put("/admin/vlog-categories", loginCheck, vlogCategoryController.postEditCategory);
router.delete("/admin/vlog-categories", loginCheck, vlogCategoryController.getDeleteCategory);

module.exports = router;
