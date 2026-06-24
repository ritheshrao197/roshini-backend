const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const couponModel = require("./models/coupon");

const coupons = [
{
    code: "WELCOME10",
    description: "10% off on first order",
    type: "percentage",
    value: 10,
    maxDiscount: 200,
    minOrderAmount: 299,
    firstOrderOnly: true,
    usageLimit: 10000,
    perUserLimit: 1,
    isActive: true,
    startDate: new Date(),
    endDate: new Date("2027-12-31")
},

{
    code: "NUTRIMIX50",
    description: "₹50 off above ₹499",
    type: "fixed",
    value: 50,
    minOrderAmount: 499,
    usageLimit: 5000,
    perUserLimit: 3,
    isActive: true,
    startDate: new Date(),
    endDate: new Date("2027-12-31")
},

{
    code: "HEALTHY15",
    description: "15% off above ₹999",
    type: "percentage",
    value: 15,
    maxDiscount: 300,
    minOrderAmount: 999,
    usageLimit: 3000,
    perUserLimit: 2,
    isActive: true,
    startDate: new Date(),
    endDate: new Date("2027-12-31")
},

{
    code: "FREESHIP",
    description: "Free shipping on any order",
    type: "shipping",
    value: 0,
    minOrderAmount: 0,
    usageLimit: 10000,
    perUserLimit: 5,
    isActive: true,
    startDate: new Date(),
    endDate: new Date("2027-12-31")
},

{
    code: "FAMILY20",
    description: "20% off above ₹1499",
    type: "percentage",
    value: 20,
    maxDiscount: 500,
    minOrderAmount: 1499,
    usageLimit: 2000,
    perUserLimit: 2,
    isActive: true,
    startDate: new Date(),
    endDate: new Date("2027-12-31")
},

{
    code: "MILLET10",
    description: "10% off millet products",
    type: "percentage",
    value: 10,
    maxDiscount: 250,
    minOrderAmount: 299,
    applicableCategories: ["Millets"],
    usageLimit: 5000,
    perUserLimit: 3,
    isActive: true,
    startDate: new Date(),
    endDate: new Date("2027-12-31")
},

{
    code: "HEALTHFIRST",
    description: "Flat ₹100 off above ₹799",
    type: "fixed",
    value: 100,
    minOrderAmount: 799,
    usageLimit: 3000,
    perUserLimit: 2,
    isActive: true,
    startDate: new Date(),
    endDate: new Date("2027-12-31")
},

{
    code: "COMEBACK10",
    description: "10% off for returning customers",
    type: "percentage",
    value: 10,
    maxDiscount: 150,
    minOrderAmount: 499,
    usageLimit: 10000,
    perUserLimit: 2,
    isActive: true,
    startDate: new Date(),
    endDate: new Date("2027-12-31")
}
];

async function seed() {
    try {
        await mongoose.connect(process.env.DATABASE, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true,
        });
        console.log("Database Connected");

        // Clear existing coupons if needed (optional)
        // await couponModel.deleteMany({});
        
        for (const coupon of coupons) {
            await couponModel.updateOne({ code: coupon.code }, { $set: coupon }, { upsert: true });
            console.log(`Seeded coupon: ${coupon.code}`);
        }
        
        console.log("Coupons seeded successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Failed to seed coupons:", err);
        process.exit(1);
    }
}

seed();
