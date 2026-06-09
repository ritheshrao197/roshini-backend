const orderModel = require("../models/orders");
const productModel = require("../models/products");
const userModel = require("../models/users");
const EmailService = require("../services/emailService");

class Order {
  async getAllOrders(req, res) {
    try {
      let Orders = await orderModel
        .find({})
        .populate("allProduct.id", "pName pImages pPrice")
        .populate("user", "name email")
        .sort({ _id: -1 });
      if (Orders) {
        return res.json({ Orders });
      }
    } catch (err) {
      console.error("[OrderController] getAllOrders error:", err);
    }
  }

  async getOrderByUser(req, res) {
    let { uId } = req.body;
    if (!uId) {
      return res.json({ message: "All filled must be required" });
    } else {
      try {
        let Order = await orderModel
          .find({ user: uId })
          .populate("allProduct.id", "pName pImages pPrice")
          .populate("user", "name email")
          .sort({ _id: -1 });
        if (Order) {
          return res.json({ Order });
        }
      } catch (err) {
        console.error("[OrderController] getOrderByUser error:", err);
      }
    }
  }

  async postCreateOrder(req, res) {
    let { allProduct, user, amount, transactionId, address, phone } = req.body;
    if (
      !allProduct ||
      !user ||
      !amount ||
      !transactionId ||
      !address ||
      !phone
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    try {
      // 1. Prevent duplicate order creations (Idempotency check)
      const existingOrder = await orderModel.findOne({ transactionId });
      if (existingOrder) {
        return res.status(409).json({ error: "Order with this transaction ID already processed" });
      }

      // 2. Lock & Validate inventory stock
      for (const item of allProduct) {
        const product = await productModel.findById(item.id);
        if (!product) {
          return res.status(404).json({ error: `Product not found` });
        }
        if (product.pQuantity < item.quantitiy) {
          return res.status(400).json({
            error: `Insufficient stock for product ${product.pName}. Available: ${product.pQuantity}`,
          });
        }
      }

      // 3. Atomically decrement stock
      for (const item of allProduct) {
        await productModel.findByIdAndUpdate(item.id, {
          $inc: {
            pQuantity: -item.quantitiy,
            pSold: item.quantitiy,
          },
        });
      }

      // 4. Create and save order
      const newOrder = new orderModel({
        allProduct,
        user,
        amount,
        transactionId,
        address,
        phone,
      });
      const save = await newOrder.save();
      if (save) {
        // Fetch user email for notifications
        const userObj = await userModel.findById(user);
        if (userObj && userObj.email) {
          EmailService.sendOrderConfirmation(userObj.email, save._id, amount);
        }
        EmailService.sendAdminNewOrderAlert("admin@roshinishomeproducts.com", save._id, amount);
        return res.json({ success: "Order created successfully", orderId: save._id });
      }
    } catch (err) {
      console.error("Order processing error:", err);
      return res.status(500).json({ error: "Failed to process order" });
    }
  }

  async postUpdateOrder(req, res) {
    let { oId, status } = req.body;
    if (!oId || !status) {
      return res.json({ message: "All filled must be required" });
    } else {
      let currentOrder = orderModel.findByIdAndUpdate(oId, {
        status: status,
        updatedAt: Date.now(),
      }, { new: true });
      currentOrder.exec(async (err, result) => {
        if (err) console.error("[OrderController] postUpdateOrder exec error:", err);
        
        if (status === "Shipped" && result) {
          const userObj = await userModel.findById(result.user);
          if (userObj && userObj.email) {
            EmailService.sendOrderShipped(userObj.email, result._id);
          }
        }
        
        return res.json({ success: "Order updated successfully" });
      });
    }
  }

  async postDeleteOrder(req, res) {
    let { oId } = req.body;
    if (!oId) {
      return res.json({ error: "All filled must be required" });
    } else {
      try {
        let deleteOrder = await orderModel.findByIdAndDelete(oId);
        if (deleteOrder) {
          return res.json({ success: "Order deleted successfully" });
        }
      } catch (error) {
        console.error("[OrderController] postDeleteOrder error:", error);
      }
    }
  }

  // Get single order by ID (admin detail drawer + invoice)
  async getOrderById(req, res) {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Order ID required" });
    try {
      const order = await orderModel
        .findById(id)
        .populate("allProduct.id", "pName pImages pPrice")
        .populate("user", "name email");
      if (!order) return res.status(404).json({ error: "Order not found" });
      return res.json({ order });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch order" });
    }
  }

  // Admin: update status, payment status, tracking ID, refund status
  async updateOrderAdmin(req, res) {
    const { oId, status, paymentStatus, shipmentTrackingId, refundStatus } = req.body;
    if (!oId) return res.status(400).json({ error: "Order ID required" });
    try {
      const updateFields = {};
      if (status) updateFields.status = status;
      if (paymentStatus) updateFields.paymentStatus = paymentStatus;
      if (shipmentTrackingId !== undefined) updateFields.shipmentTrackingId = shipmentTrackingId;
      if (refundStatus) updateFields.refundStatus = refundStatus;

      const updated = await orderModel.findByIdAndUpdate(
        oId,
        { $set: updateFields },
        { new: true }
      ).populate("user", "name email");

      if (!updated) return res.status(404).json({ error: "Order not found" });
      return res.json({ success: "Order updated", order: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to update order" });
    }
  }

  // Generate invoice data for an order
  async generateInvoice(req, res) {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Order ID required" });
    try {
      const order = await orderModel
        .findById(id)
        .populate("allProduct.id", "pName pImages pPrice")
        .populate("user", "name email");
      if (!order) return res.status(404).json({ error: "Order not found" });

      const invoiceData = {
        invoiceNumber: `INV-${order._id.toString().slice(-8).toUpperCase()}`,
        orderId: order._id,
        issuedDate: new Date().toISOString(),
        orderDate: order.createdAt,
        customer: {
          name: order.user ? order.user.name : "N/A",
          email: order.user ? order.user.email : "N/A",
          phone: order.phone,
          address: order.address,
        },
        items: order.allProduct.map((item) => ({
          name: item.id ? item.id.pName : "Product",
          quantity: item.quantitiy,
          unitPrice: item.id ? item.id.pPrice : 0,
          total: item.id ? item.id.pPrice * item.quantitiy : 0,
        })),
        subtotal: order.amount,
        shipping: order.amount >= 1000 ? 0 : 99,
        total: order.amount,
        paymentStatus: order.paymentStatus,
        paymentGateway: order.paymentGateway,
        transactionId: order.transactionId,
        fulfillmentStatus: order.status,
        trackingId: order.shipmentTrackingId || null,
        storeName: "Roshini's Home Products",
        storeEmail: "support@roshinishomeproducts.com",
      };
      return res.json({ invoice: invoiceData });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to generate invoice" });
    }
  }
}

const ordersController = new Order();
module.exports = ordersController;
