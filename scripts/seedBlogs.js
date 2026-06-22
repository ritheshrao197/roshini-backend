const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const vlogCategoryModel = require("../models/vlogCategories");
const vlogModel = require("../models/vlogs");

const DATABASE = process.env.DATABASE || "mongodb://127.0.0.1:27017/roshinis_ecommerce";

const blogsData = [
  {
    title: "8 Health Benefits of Ragi: Nutrition, Uses & Who Should Avoid It",
    publishDate: "2026-03-10",
    categoryName: "Health & Nutrition",
    excerpt: "Ragi, a traditional Indian millet, is gaining renewed popularity due to its nutritional value and health benefits.",
    content: `<h2>8 Health Benefits of Ragi: Nutrition, Uses & Who Should Avoid It</h2>
<p>Ragi, a traditional Indian millet, is gaining renewed popularity due to its nutritional value and health benefits. As a superfood staple, it has been a cornerstone of traditional Indian wellness for generations.</p>
<h3>Key Health Benefits & Topics</h3>
<ul>
  <li><strong>Calcium-rich grain for bone health:</strong> Ragi is one of the best plant sources of calcium, supporting strong bones and teeth.</li>
  <li><strong>Iron content and anaemia prevention:</strong> High iron content helps in hemoglobin production, preventing anemia naturally.</li>
  <li><strong>High fiber for digestion:</strong> Packed with dietary fiber, ragi promotes healthy digestion and keeps bowel movements regular.</li>
  <li><strong>Blood sugar management:</strong> Its low glycemic index helps regulate blood sugar levels, making it ideal for diabetics.</li>
  <li><strong>Weight management:</strong> Slow digestion of complex carbs keeps you full longer, reducing unnecessary cravings.</li>
  <li><strong>Gluten-free nutrition:</strong> Naturally gluten-free, it is a perfect alternative for those with gluten sensitivities or celiac disease.</li>
</ul>
<h3>Common Traditional Uses</h3>
<ul>
  <li>Ragi malt (Health drink)</li>
  <li>Ragi dosa</li>
  <li>Ragi roti</li>
  <li>Porridge</li>
  <li>Healthy snacks</li>
</ul>
<h3>Who Should Be Cautious</h3>
<p>While ragi is highly nutritious, certain individuals should be cautious or consult a healthcare professional before consuming it in large quantities:</p>
<ul>
  <li>People with kidney stone risk due to oxalates.</li>
  <li>Individuals with certain thyroid conditions.</li>
  <li>Those advised by healthcare professionals to limit high-oxalate foods.</li>
</ul>`
  },
  {
    title: "How to Use Nutrimix: Multigrain Health Drink for Modern Families (Benefits & Preparation Guide)",
    publishDate: "2026-03-10",
    categoryName: "Health Drinks",
    excerpt: "A guide for families looking to include a nutritious multigrain drink in their daily routine.",
    content: `<h2>How to Use Nutrimix: Multigrain Health Drink for Modern Families</h2>
<p>A guide for families looking to include a nutritious multigrain drink in their daily routine. Nutrimix combines the power of millets, nuts, and seeds to deliver a convenient daily health boost.</p>
<h3>Focus Areas</h3>
<ul>
  <li>Family nutrition</li>
  <li>Convenient meal supplementation</li>
  <li>Balanced multigrain nutrition</li>
  <li>Daily wellness habits</li>
</ul>
<h3>Benefits Discussed</h3>
<ul>
  <li><strong>Nutrient density:</strong> Rich in essential vitamins, minerals, and micro-nutrients.</li>
  <li><strong>Convenience:</strong> Quick and easy to prepare, perfect for busy mornings.</li>
  <li><strong>Dietary diversity:</strong> Provides the goodness of over 15 grains and nuts in a single serving.</li>
  <li><strong>Whole-grain nutrition:</strong> Utilizes whole grains for long-lasting energy and stamina.</li>
</ul>
<h3>Preparation & Serving Guide</h3>
<ul>
  <li><strong>Basic preparation method:</strong> Mix 2 tablespoons of Nutrimix with milk or water, cook on low heat for 5-8 minutes while stirring constantly to avoid lumps. Add jaggery or a pinch of salt to taste.</li>
  <li><strong>Serving suggestions:</strong> Serve hot as porridge. Can also be blended into smoothies or added to pancake batter.</li>
  <li><strong>Usage for children and adults:</strong> Suitable for kids aged 1+ and adults of all ages. Adjust quantity based on age and activity levels.</li>
  <li><strong>Storage recommendations:</strong> Store in an airtight container in a cool, dry place. Best consumed within 3 months of opening.</li>
</ul>`
  },
  {
    title: "How to Use Seed Mix in Everyday Indian Meals (Easy & Practical Ways)",
    publishDate: "2026-03-10",
    categoryName: "Healthy Eating",
    excerpt: "Practical ideas for adding seed mixes to everyday Indian cooking without significantly changing flavor.",
    content: `<h2>How to Use Seed Mix in Everyday Indian Meals</h2>
<p>Practical ideas for adding seed mixes to everyday Indian cooking without significantly changing flavor. Incorporating seeds is a simple way to boost your daily nutrient intake.</p>
<h3>Nutritional Focus</h3>
<ul>
  <li><strong>Healthy fats:</strong> Abundant in Omega-3 and Omega-6 fatty acids.</li>
  <li><strong>Fiber:</strong> Promotes heart health and digestion.</li>
  <li><strong>Plant protein:</strong> High-quality vegan protein source.</li>
  <li><strong>Micronutrients:</strong> Rich in zinc, magnesium, and vitamin E.</li>
</ul>
<h3>Seeds Discussed</h3>
<ul>
  <li>Flax seeds</li>
  <li>Pumpkin seeds</li>
  <li>Sunflower seeds</li>
  <li>Sesame seeds</li>
</ul>
<h3>Easy Meal Applications</h3>
<ul>
  <li><strong>Rotis:</strong> Knead powdered seed mix directly into the wheat dough.</li>
  <li><strong>Rice dishes:</strong> Sprinkle whole toasted seeds over pulao or biryani.</li>
  <li><strong>Salads:</strong> Add a crunchy handful to fresh cucumber, tomato, and carrot salads.</li>
  <li><strong>Breakfast bowls:</strong> Stir into your morning oatmeal, poha, or upma.</li>
  <li><strong>Smoothies:</strong> Blend seed mix into banana or mango smoothies.</li>
  <li><strong>Chutneys:</strong> Grind sesame and flax seeds along with coconut and spices for traditional chutneys.</li>
</ul>`
  },
  {
    title: "What is Sprouted Flour and Why Do People Prefer It?",
    publishDate: "2026-03-10",
    categoryName: "Nutrition Education",
    excerpt: "Explains the traditional process of soaking, sprouting, drying and milling grains into flour.",
    content: `<h2>What is Sprouted Flour and Why Do People Prefer It?</h2>
<p>Explains the traditional process of soaking, sprouting, drying and milling grains into flour. Sprouting transforms simple grains into nutritional powerhouses.</p>
<h3>The Traditional Process</h3>
<ol>
  <li><strong>Soaking grains:</strong> Grains are soaked in water to initiate the germination process.</li>
  <li><strong>Controlled sprouting:</strong> Grains are allowed to sprout under precise moisture and temperature conditions until tiny sprouts emerge.</li>
  <li><strong>Drying:</strong> Sprouted grains are dehydrated slowly at low temperatures to lock in nutrients.</li>
  <li><strong>Grinding into flour:</strong> The dry sprouted grains are stone-ground into a fine flour.</li>
</ol>
<h3>Reasons for Popularity & Preference</h3>
<ul>
  <li><strong>Improved digestibility:</strong> Sprouting breaks down complex starches and proteins, making them much easier for the body to digest.</li>
  <li><strong>Traditional preparation methods:</strong> Mimics age-old kitchen wisdom that maximizes food bio-availability.</li>
  <li><strong>Enhanced nutrient availability:</strong> Sprouting reduces anti-nutrients (like phytic acid), unlocking minerals like iron, zinc, and calcium.</li>
  <li><strong>Natural food processing:</strong> Zero additives or chemical processing involved.</li>
</ul>
<h3>Everyday Applications</h3>
<ul>
  <li>Rotis and flatbreads</li>
  <li>Porridge and health malts</li>
  <li>Baking healthier breads and cookies</li>
  <li>Traditional dishes like idli and dosa batter reinforcement</li>
</ul>`
  },
  {
    title: "Why Am I Still Hungry After Eating? 7 Real Reasons (Backed by Science) and What to Do",
    publishDate: "2026-02-24",
    categoryName: "Health & Wellness",
    excerpt: "Explores reasons why people may feel hungry shortly after meals and practical strategies to improve satiety.",
    content: `<h2>Why Am I Still Hungry After Eating? 7 Real Reasons</h2>
<p>Explores reasons why people may feel hungry shortly after meals and practical strategies to improve satiety. Understanding your body's signals is key to healthy eating habits.</p>
<h3>7 Possible Causes</h3>
<ol>
  <li><strong>Insufficient protein intake:</strong> Protein is the most satiating macronutrient; missing it leads to quick hunger.</li>
  <li><strong>Low fiber consumption:</strong> Fiber adds bulk and slows down stomach emptying.</li>
  <li><strong>High refined carbohydrate intake:</strong> Refined sugars cause blood spikes followed by rapid crashes, triggering hunger.</li>
  <li><strong>Poor hydration:</strong> Dehydration is often mistaken for hunger by the brain.</li>
  <li><strong>Stress:</strong> High cortisol levels can stimulate appetite and sugar cravings.</li>
  <li><strong>Sleep deprivation:</strong> Lack of sleep increases ghrelin (hunger hormone) and decreases leptin (fullness hormone).</li>
  <li><strong>Distracted eating habits:</strong> Eating while looking at screens prevents the brain from registering fullness.</li>
</ol>
<h3>Suggested Solutions</h3>
<ul>
  <li><strong>Balanced meals:</strong> Combine complex carbs, healthy fats, and protein.</li>
  <li><strong>More protein:</strong> Add lentils, paneer, eggs, or lean protein to every meal.</li>
  <li><strong>Higher fiber foods:</strong> Eat plenty of vegetables, fruits, and whole grains.</li>
  <li><strong>Adequate water intake:</strong> Drink water throughout the day, especially before meals.</li>
  <li><strong>Better sleep:</strong> Target 7-8 hours of quality sleep nightly.</li>
  <li><strong>Mindful eating:</strong> Eat slowly, chew well, and eliminate distractions.</li>
</ul>`
  }
];

async function seed() {
  try {
    console.log("[seedBlogs.js] Connecting to database...");
    await mongoose.connect(DATABASE, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    });
    console.log("[seedBlogs.js] Connected successfully!");

    // 1. Resolve and create categories
    const categoryMap = {};
    const categoriesToCreate = [...new Set(blogsData.map(b => b.categoryName))];

    for (const catName of categoriesToCreate) {
      let existing = await vlogCategoryModel.findOne({ cName: catName });
      if (!existing) {
        const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
        existing = new vlogCategoryModel({
          cName: catName,
          cDescription: `Blogs related to ${catName}`,
          slug: slug,
          cStatus: "Active"
        });
        await existing.save();
        console.log(`[seedBlogs.js] Created Category: ${catName}`);
      } else {
        console.log(`[seedBlogs.js] Category already exists: ${catName}`);
      }
      categoryMap[catName] = existing._id;
    }

    // 2. Create blogs
    for (const blog of blogsData) {
      let existing = await vlogModel.findOne({ title: blog.title });
      if (!existing) {
        const catId = categoryMap[blog.categoryName];
        const slug = blog.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
        const newBlog = new vlogModel({
          title: blog.title,
          slug: slug,
          excerpt: blog.excerpt,
          content: blog.content,
          vCategory: catId,
          isPublished: true,
          publishDate: new Date(blog.publishDate),
          viewCount: Math.floor(Math.random() * 100) + 10,
          seoTitle: `${blog.title} | Roshini's Home Products`,
          seoDescription: blog.excerpt,
          featured: false
        });
        await newBlog.save();
        console.log(`[seedBlogs.js] Created Blog: ${blog.title}`);
      } else {
        console.log(`[seedBlogs.js] Blog already exists: ${blog.title}`);
      }
    }

    console.log("[seedBlogs.js] Seeding completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("[seedBlogs.js] Error seeding database:", err);
    process.exit(1);
  }
}

seed();
