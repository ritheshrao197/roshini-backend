const request = require("supertest");
const mongoose = require("mongoose");

// Set environment to test
process.env.NODE_ENV = "test";
process.env.DATABASE = "mongodb://127.0.0.1:27017/roshinis_test_db";

const app = require("../app");
const vlogModel = require("../models/vlogs");
const vlogCategoryModel = require("../models/vlogCategories");
const vlogTagModel = require("../models/vlogTags");

describe("Public Blog Submission API Suite", () => {
  beforeAll(async () => {
    // Wait for mongoose connection if it isn't fully open yet
    if (mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => {
        mongoose.connection.once("open", resolve);
      });
    }
  });

  afterAll(async () => {
    // Clean up created test data
    await vlogModel.deleteMany({ title: /Test Blog/i });
    await vlogCategoryModel.deleteMany({ cName: /Test Category/i });
    await vlogTagModel.deleteMany({ name: /TestTag/i });
    
    // Close mongoose connection to avoid hanging Jest
    await mongoose.connection.close();
  });

  it("should successfully submit a blog with standard JSON fields", async () => {
    const res = await request(app)
      .post("/api/blogs/submit")
      .send({
        title: "Test Blog Submission 1",
        content: "<p>This is a test blog body content</p>",
        category: "Test Category 1",
        tags: ["TestTag1", "TestTag2"],
        excerpt: "This is a custom test excerpt."
      })
      .expect("Content-Type", /json/)
      .expect(201);

    expect(res.body).toHaveProperty("success");
    expect(res.body.blog).toHaveProperty("title", "Test Blog Submission 1");
    expect(res.body.blog).toHaveProperty("slug", "test-blog-submission-1");
    expect(res.body.blog).toHaveProperty("excerpt", "This is a custom test excerpt.");
    expect(res.body.blog).toHaveProperty("isPublished", false);
    expect(res.body.blog).toHaveProperty("publishDate", null);
    expect(res.body.blog).toHaveProperty("createdBy", null);
  });

  it("should auto-generate excerpt when not provided", async () => {
    const res = await request(app)
      .post("/api/vlogs/submit")
      .send({
        title: "Test Blog Submission 2",
        category: "Test Category 2",
        content: "<div>This is a test blog body with <b>some html tags</b>. It should be stripped.</div>"
      })
      .expect(201);

    expect(res.body.blog).toHaveProperty("title", "Test Blog Submission 2");
    expect(res.body.blog).toHaveProperty("slug", "test-blog-submission-2");
    // Verify html tag stripping in auto-generated excerpt
    expect(res.body.blog.excerpt).toContain("This is a test blog body with some html tags. It should be stripped.");
    
    // Category should map to Test Category 2
    const category = await vlogCategoryModel.findById(res.body.blog.vCategory);
    expect(category.cName).toBe("Test Category 2");
  });

  it("should handle slug collisions gracefully by appending numbers", async () => {
    // Send first submission
    await request(app)
      .post("/api/blogs/submit")
      .send({
        title: "Test Blog Collision",
        category: "Test Category 3",
        content: "First one content"
      })
      .expect(201);

    // Send duplicate submission
    const res = await request(app)
      .post("/api/blogs/submit")
      .send({
        title: "Test Blog Collision",
        category: "Test Category 3",
        content: "Second one content"
      })
      .expect(201);

    expect(res.body.blog.slug).toBe("test-blog-collision-1");
  });

  it("should reject submission if title, content, or category is missing", async () => {
    const resNoTitle = await request(app)
      .post("/api/blogs/submit")
      .send({
        category: "Test Category 4",
        content: "Missing Title"
      })
      .expect(400);

    expect(resNoTitle.body).toHaveProperty("error");

    const resNoContent = await request(app)
      .post("/api/blogs/submit")
      .send({
        title: "Missing Content",
        category: "Test Category 4"
      })
      .expect(400);

    expect(resNoContent.body).toHaveProperty("error");

    const resNoCategory = await request(app)
      .post("/api/blogs/submit")
      .send({
        title: "Missing Category",
        content: "Some content here"
      })
      .expect(400);

    expect(resNoCategory.body).toHaveProperty("error", "Title, category, and content are required fields.");
  });

  describe("Extended Blog Features Integration Tests", () => {
    let testBlogId = null;
    let testSlug = null;
    let testCatId = null;
    let deletedCategoryId = null;
    let deletedBlogId = null;
    let deletedBlogSlug = null;

    beforeAll(async () => {
      const deletedCategory = await vlogCategoryModel.create({
        cName: "Test Category Deleted",
        cDescription: "Deleted blog category",
        slug: "test-category-deleted",
        cStatus: "Active"
      });

      const deletedBlog = await vlogModel.create({
        title: "Test Blog Deleted",
        slug: "test-blog-deleted",
        content: "<p>Deleted blog body</p>",
        excerpt: "Deleted blog excerpt",
        vCategory: deletedCategory._id,
        status: "Published",
        isPublished: true,
        publishDate: new Date(),
        isDeleted: true
      });

      deletedCategoryId = deletedCategory._id;
      deletedBlogId = deletedBlog._id.toString();
      deletedBlogSlug = deletedBlog.slug;
    });

    afterAll(async () => {
      if (deletedBlogId) {
        await vlogModel.deleteMany({ _id: deletedBlogId });
      }
      if (deletedCategoryId) {
        await vlogCategoryModel.deleteMany({ _id: deletedCategoryId });
      }
    });

    it("should successfully import a single Markdown blog as a Draft", async () => {
      const res = await request(app)
        .post("/api/blogs/import")
        .send({
          title: "Test Blog Import Single",
          content: "# Healthy Millets\n\nMillets are extremely rich in **proteins**.",
          format: "markdown",
          category: "Health Tips",
          tags: ["Millets", "Protein"],
          seoTitle: "Imported Millet Post",
          seoDescription: "An article about healthy millets",
          seoKeywords: ["millet", "healthy"]
        });

      expect(res.status).toBe(201);

      expect(res.body.blog).toHaveProperty("title", "Test Blog Import Single");
      expect(res.body.blog).toHaveProperty("status", "Draft");
      expect(res.body.blog).toHaveProperty("isPublished", false);
      expect(res.body.blog.content).toContain("<h1>Healthy Millets</h1>");
      expect(res.body.blog.content).toContain("<strong>proteins</strong>");
      
      testBlogId = res.body.blog._id;
      testSlug = res.body.blog.slug;
      testCatId = res.body.blog.vCategory;
    });

    it("should successfully import multiple blogs in bulk", async () => {
      const res = await request(app)
        .post("/api/blogs/import/bulk")
        .send({
          blogs: [
            {
              title: "Test Bulk Blog 1",
              content: "<p>Bulk HTML blog 1</p>",
              category: "Recipes",
              tags: ["Kids Nutrition", "Recipes"]
            },
            {
              title: "Test Bulk Blog 2",
              content: "## Sugar Free Millet Laddu",
              format: "markdown",
              category: "Recipes",
              tags: ["Kids Nutrition", "Organic"]
            }
          ]
        })
        .expect(201);

      expect(res.body).toHaveProperty("importedCount", 2);
      expect(res.body.importedBlogs[0]).toHaveProperty("title", "Test Bulk Blog 1");
      expect(res.body.importedBlogs[1]).toHaveProperty("title", "Test Bulk Blog 2");
      expect(res.body.importedBlogs[1].content).toContain("<h2>Sugar Free Millet Laddu</h2>");
    });

    it("should allow a user to like a vlog", async () => {
      // First let's make the blog published so we can test other public features
      await vlogModel.findByIdAndUpdate(testBlogId, { isPublished: true, status: "Published", publishDate: new Date() });

      const res = await request(app)
        .post(`/api/vlogs/${testBlogId}/like`)
        .expect(200);

      expect(res.body).toHaveProperty("success", "Vlog liked successfully");
      expect(res.body).toHaveProperty("likesCount", 1);
    });

    it("should fetch related articles based on category or tags", async () => {
      const res = await request(app)
        .get(`/api/vlogs/${testBlogId}/related`)
        .expect(200);

      expect(res.body).toHaveProperty("related");
      expect(Array.isArray(res.body.related)).toBe(true);
    });

    it("should filter vlogs by search, category, and tags query parameters", async () => {
      const res = await request(app)
        .get("/api/vlogs")
        .query({ search: "Millets", sort: "latest" })
        .expect(200);

      expect(res.body).toHaveProperty("vlogs");
      expect(Array.isArray(res.body.vlogs)).toBe(true);
    });

    it("should hide a soft-deleted blog from public detail routes", async () => {
      await request(app)
        .get(`/api/vlogs/${deletedBlogSlug}`)
        .expect(404);
    });

    it("should block likes for a soft-deleted blog", async () => {
      const res = await request(app)
        .post(`/api/vlogs/${deletedBlogId}/like`)
        .expect(404);

      expect(res.body).toHaveProperty("error", "Vlog not found");
    });

    it("should block related blog lookup for a soft-deleted blog", async () => {
      const res = await request(app)
        .get(`/api/vlogs/${deletedBlogId}/related`)
        .expect(404);

      expect(res.body).toHaveProperty("error", "Vlog not found");
    });
  });
});
