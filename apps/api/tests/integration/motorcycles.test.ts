import { describe, it, expect } from "vitest";
import { factories } from "../factories";
import { generateToken, makeRequest, jsonResponse } from "../helpers";

describe("Motorcycles Integration Tests", () => {
  describe("POST /api/v1/motorcycles", () => {
    it("should create a new motorcycle", async () => {
      const user = await factories.createAdmin();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const response = await makeRequest(
        "POST",
        "/api/v1/motorcycles",
        token,
        {
          model: "YZF-R15",
          year: 2023,
          chassis_number: "CHASSIS123456",
          engine_number: "ENGINE123456",
          color: "Blue",
          cost_price: 20000,
          selling_price: 25000,
        }
      );

      expect(response.status).toBe(201);
      const data = await jsonResponse<{ data: { id: string; model: string; status: string } }>(response);
      expect(data.data.model).toBe("YZF-R15");
      expect(data.data.status).toBe("in_stock");
    });

    it("should require authentication", async () => {
      const response = await makeRequest("POST", "/api/v1/motorcycles", undefined, {
        model: "YZF-R15",
        year: 2023,
        chassis_number: "CHASSIS123456",
        engine_number: "ENGINE123456",
        color: "Blue",
        cost_price: 20000,
        selling_price: 25000,
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/v1/motorcycles", () => {
    it("should list motorcycles with pagination", async () => {
      const user = await factories.createAdmin();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      await factories.createMotorcycle();
      await factories.createMotorcycle();

      const response = await makeRequest("GET", "/api/v1/motorcycles?page=1&limit=10", token);

      expect(response.status).toBe(200);
      const data = await jsonResponse<{ data: unknown[]; total: number; page: number }>(response);
      expect(data.total).toBeGreaterThanOrEqual(2);
      expect(data.page).toBe(1);
    });

    it("should filter by status", async () => {
      const user = await factories.createAdmin();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      await factories.createMotorcycle({ status: "in_stock" });
      await factories.createMotorcycle({ status: "sold" });

      const response = await makeRequest("GET", "/api/v1/motorcycles?status=in_stock", token);

      expect(response.status).toBe(200);
      const data = await jsonResponse<{ data: { status: string }[] }>(response);
      expect(data.data.every((m) => m.status === "in_stock")).toBe(true);
    });

    it("should search by model", async () => {
      const user = await factories.createAdmin();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      await factories.createMotorcycle({ model: "YZF-R15" });

      const response = await makeRequest("GET", "/api/v1/motorcycles?search=R15", token);

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/v1/motorcycles/:id", () => {
    it("should get motorcycle detail", async () => {
      const user = await factories.createAdmin();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);
      const motorcycle = await factories.createMotorcycle();

      const response = await makeRequest("GET", `/api/v1/motorcycles/${motorcycle.id}`, token);

      expect(response.status).toBe(200);
      const data = await jsonResponse<{ data: { id: string; model: string } }>(response);
      expect(data.data.id).toBe(motorcycle.id);
    });

    it("should return 404 for non-existent motorcycle", async () => {
      const user = await factories.createAdmin();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const response = await makeRequest("GET", "/api/v1/motorcycles/nonexistent", token);

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /api/v1/motorcycles/:id", () => {
    it("should update motorcycle details", async () => {
      const user = await factories.createAdmin();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);
      const motorcycle = await factories.createMotorcycle();

      const response = await makeRequest(
        "PATCH",
        `/api/v1/motorcycles/${motorcycle.id}`,
        token,
        {
          color: "Red",
          selling_price: 26000,
        }
      );

      expect(response.status).toBe(200);
      const data = await jsonResponse<{ data: { color: string; selling_price: number } }>(response);
      expect(data.data.color).toBe("Red");
      expect(data.data.selling_price).toBe(26000);
    });

    it("should update motorcycle status", async () => {
      const user = await factories.createAdmin();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);
      const motorcycle = await factories.createMotorcycle();

      const response = await makeRequest(
        "PATCH",
        `/api/v1/motorcycles/${motorcycle.id}`,
        token,
        {
          status: "sold",
        }
      );

      expect(response.status).toBe(200);
      const data = await jsonResponse<{ data: { status: string } }>(response);
      expect(data.data.status).toBe("sold");
    });
  });
});
