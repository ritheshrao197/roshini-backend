const express = require("express");
const router = express.Router();
const ordersController = require("../controller/orders");

router.get("/get-all-orders", ordersController.getAllOrders);
router.post("/order-by-user", ordersController.getOrderByUser);
router.get("/get-order/:id", ordersController.getOrderById);
const { checkoutLimiter } = require("../middleware/rateLimiter");

router.post("/create-order", checkoutLimiter, ordersController.postCreateOrder);
router.post("/update-order", ordersController.postUpdateOrder);
router.post("/admin-update-order", ordersController.updateOrderAdmin);
router.post("/delete-order", ordersController.postDeleteOrder);
router.get("/invoice/:id", ordersController.generateInvoice);

module.exports = router;
