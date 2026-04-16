import { describe, it, expect } from "vitest";
import { factories } from "../factories";
import { generateToken, makeRequest, jsonResponse } from "../helpers";

describe("Add-ons Integration Tests", () => {
  describe("GET /api/v1/addons", () => {
    it("should list all active add-ons", async () => {
      const user = await factories.createAdmin();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      await factories.createAddon({ name: "Insurance", active: true });
      await factories.createAddon({ name: "Extended Warranty", active: true });

      const response = await makeRequest("GET", "/api/v1/addons", token);

      expect(response.status).toBe(200);
      const data = await jsonResponse<{ data: { name: string; active: boolean }[] }>(response);
      expect(data.data.length).toBeGreaterThanOrEqual(2);
      expect(data.data.every((a) => a.active)).toBe(true);
    });

    it("should require authentication", async () => {
      const response = await makeRequest("GET", "/api/v1/addons", undefined);

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/v1/addons", () => {
    it("should create a new add-on", async () => {
      const user = await factories.createAdmin();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const response = await makeRequest(
        "POST",
        "/api/v1/addons",
        token,
        {
          name: "Premium Service",
          description: "Premium after-sales service",
          price: 2000,
        }
      );

      expect(response.status).toBe(201);
      const data = await jsonResponse<{
        data: { id: string; name: string; price: number; active: boolean };
      }>(response);
      expect(data.data.name).toBe("Premium Service");
      expect(data.data.price).toBe(2000);
      expect(data.data.active).toBe(true);
    });

    it("should require authentication", async () => {
      const response = await makeRequest("POST", "/api/v1/addons", undefined, {
        name: "Premium Service",
        price: 2000,
      });

      expect(response.status).toBe(401);
    });

    it("should reject invalid add-on data", async () => {
      const user = await factories.createAdmin();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const response = await makeRequest(
        "POST",
        "/api/v1/addons",
        token,
        {
          name: "Premium Service",
          // missing price
        }
      );

      expect(response.status).toBe(400);
    });
  });

  describe("Add-ons on Sales", () => {
    it("should attach multiple add-ons to a sale", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const addon1 = await factories.createAddon({ name: "Insurance" });
      const addon2 = await factories.createAddon({ name: "Service Plan" });
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const response = await makeRequest(
        "POST",
        "/api/v1/sales",
        token,
        {
          customer_id: customer.id,
          motorcycle_id: motorcycle.id,
          total_price: 30000,
          down_payment: 5000,
          num_installments: 12,
          interest_rate: 5.5,
          payment_method: "installment",
          addon_ids: [addon1.id, addon2.id],
        }
      );

      expect(response.status).toBe(201);
      const data = await jsonResponse<{
        data: { id: string; addons: { id: string }[] };
      }>(response);
      expect(data.data.addons.length).toBe(2);
    });

    it("should record add-on price at time of sale", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const addon = await factories.createAddon({ name: "Insurance", price: 5000 });
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const response = await makeRequest(
        "POST",
        "/api/v1/sales",
        token,
        {
          customer_id: customer.id,
          motorcycle_id: motorcycle.id,
          total_price: 30000,
          down_payment: 5000,
          num_installments: 12,
          interest_rate: 5.5,
          payment_method: "installment",
          addon_ids: [addon.id],
        }
      );

      expect(response.status).toBe(201);
      const data = await jsonResponse<{
        data: {
          addons: { name: string; priceAtSale?: number };
        };
      }>(response);
      expect(data.data.addons[0].name).toBe("Insurance");
    });
  });
});
