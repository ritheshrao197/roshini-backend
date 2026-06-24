const express = require("express");
const router = express.Router();
const ordersController = require("../controller/orders");

router.get("/get-all-orders", ordersController.getAllOrders);
router.post("/order-by-user", ordersController.getOrderByUser);
router.get("/get-order/:id", ordersController.getOrderById);
router.get("/status/:orderNumber", ordersController.getOrderStatus);
const { checkoutLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const { createOrderSchema, updateOrderSchema } = require("../validators/order.validator");

router.post("/create-order", checkoutLimiter, validate(createOrderSchema), ordersController.postCreateOrder);
router.post("/update-order", ordersController.postUpdateOrder);
router.post("/admin-update-order", validate(updateOrderSchema), ordersController.updateOrderAdmin);
router.post("/delete-order", ordersController.postDeleteOrder);
router.get("/invoice/:id", ordersController.generateInvoice);

module.exports = router;
