const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const couponModel = require("./models/coupon");

async function check() {
    try {
        await mongoose.connect(process.env.DATABASE, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
        });
        
        const coupons = await couponModel.find({});
        console.log("Coupons:", coupons.length);
        if (coupons.length > 0) {
            console.log("First coupon ID:", coupons[0]._id.toString());
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
