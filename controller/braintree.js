var braintree = require("braintree");
require("dotenv").config();

var gateway = new braintree.BraintreeGateway({
  environment:
    process.env.BRAINTREE_ENV === "production"
      ? braintree.Environment.Production
      : braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});

class brainTree {
  ganerateToken(req, res) {
    gateway.clientToken.generate({}, (err, response) => {
      if (err) {
        console.error("[BraintreeController] Token generation error:", err.message);
        return res.json(err);
      }
      return res.json(response);
    });
  }

  paymentProcess(req, res) {
    let { amountTotal, paymentMethod } = req.body;
    gateway.transaction.sale(
      {
        amount: amountTotal,
        paymentMethodNonce: paymentMethod,
        options: {
          submitForSettlement: true,
        },
      },
      (err, result) => {
        if (err) {
          console.error("[BraintreeController] Transaction error:", err.message);
          return res.json(err);
        }

        if (result.success) {
          return res.json(result);
        } else {
          console.error("[BraintreeController] Transaction failed:", result.message);
          return res.json({ error: result.message });
        }
      }
    );
  }
}

const brainTreeController = new brainTree();
module.exports = brainTreeController;
