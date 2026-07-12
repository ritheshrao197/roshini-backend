const cron = require("node-cron");
const vlogModel = require("../models/vlogs");

// Runs every minute to publish scheduled posts
cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();
    
    // Find unpublished drafts whose scheduledPublishDate is in the past
    const scheduledBlogs = await vlogModel.find({
      status: "Draft",
      isPublished: false,
      isDeleted: false,
      scheduledPublishDate: { $ne: null, $lte: now }
    });

    for (const blog of scheduledBlogs) {
      blog.status = "Published";
      blog.isPublished = true;
      blog.publishDate = now;
      blog.scheduledPublishDate = null;
      
      await blog.save();
      console.log(`[ScheduledPublishCron] Automatically published blog: ${blog.title}`);
    }
  } catch (err) {
    console.error("[ScheduledPublishCron] Error during scheduled publishing check:", err);
  }
});
