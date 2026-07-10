const request = require("supertest");
const express = require("express");

// Set environment to test to prevent database connection logs or app binding conflict
process.env.NODE_ENV = "test";
process.env.DATABASE = "mongodb://127.0.0.1:27017/test_db"; // Dummy test database URL

const app = require("../app");

describe("API Health Verification Suite", () => {
  it("should return healthy status for GET /health", async () => {
    const res = await request(app)
      .get("/health")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toEqual({ status: "healthy" });
  });

  it("should return detailed status check for GET /health/details", async () => {
    const res = await request(app)
      .get("/health/details")
      .expect("Content-Type", /json/)
      .expect(200);

    expect(res.body).toHaveProperty("status", "healthy");
    expect(res.body).toHaveProperty("mongodb");
    expect(res.body).toHaveProperty("redis");
    expect(res.body).toHaveProperty("uptime");
    expect(res.body).toHaveProperty("timestamp");
  });
});
