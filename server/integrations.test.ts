import { describe, it, expect } from "vitest";
import axios from "axios";

describe("Holded API", () => {
  it("should connect with the provided API key", async () => {
    const apiKey = process.env.HOLDED_API_KEY;
    expect(apiKey, "HOLDED_API_KEY must be set").toBeTruthy();

    const res = await axios.get("https://api.holded.com/api/invoicing/v1/contacts?page=1&limit=1", {
      headers: { key: apiKey! },
      validateStatus: (s) => s < 500,
    });
    // 200 = OK, 401 = bad key
    expect(res.status, `Holded returned ${res.status}`).toBe(200);
  }, 15000);
});

describe("Clockify API", () => {
  it("should connect with the provided API key", async () => {
    const apiKey = process.env.CLOCKIFY_API_KEY;
    expect(apiKey, "CLOCKIFY_API_KEY must be set").toBeTruthy();

    const res = await axios.get("https://api.clockify.me/api/v1/user", {
      headers: { "X-Api-Key": apiKey! },
      validateStatus: (s) => s < 500,
    });
    expect(res.status, `Clockify returned ${res.status}`).toBe(200);
  }, 15000);
});
