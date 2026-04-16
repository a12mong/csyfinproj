import { describe, it, expect } from "vitest";
import { factories } from "../factories";
import { generateToken, makeRequest, jsonResponse } from "../helpers";
import { testPrisma as prisma } from "../setup";

describe("Sales Integration Tests", () => {
  describe("POST /api/v1/sales", () => {
    it("should create a new sale with installment generation", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const response = await makeRequest(
        "POST",
        "/api/v1/sales",
        token,
        {
          customer_id: customer.id,
          motorcycle_id: motorcycle.id,
          total_price: 25000,
          down_payment: 5000,
          num_installments: 12,
          interest_rate: 5.5,
          payment_method: "installment",
          notes: "Test sale",
        }
      );

      expect(response.status).toBe(201);
      const data = await jsonResponse<{
        data: {
          id: string;
          status: string;
          financeAmount: number;
          installments: unknown[];
        };
      }>(response);
      expect(data.data.status).toBe("active");
      expect(data.data.financeAmount).toBe(20000);
      expect(data.data.installments).toBeDefined();
      expect(Array.isArray(data.data.installments)).toBe(true);
    });

    it("should generate correct number of installments", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const response = await makeRequest(
        "POST",
        "/api/v1/sales",
        token,
        {
          customer_id: customer.id,
          motorcycle_id: motorcycle.id,
          total_price: 25000,
          down_payment: 5000,
          num_installments: 12,
          interest_rate: 5.5,
          payment_method: "installment",
        }
      );

      expect(response.status).toBe(201);
      const data = await jsonResponse<{ data: { id: string; installments: unknown[] } }>(response);
      expect(data.data.installments.length).toBe(12);
    });

    it("should attach add-ons to sale", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const addon = await factories.createAddon();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const response = await makeRequest(
        "POST",
        "/api/v1/sales",
        token,
        {
          customer_id: customer.id,
          motorcycle_id: motorcycle.id,
          total_price: 25000,
          down_payment: 5000,
          num_installments: 12,
          interest_rate: 5.5,
          payment_method: "installment",
          addon_ids: [addon.id],
        }
      );

      expect(response.status).toBe(201);
      const data = await jsonResponse<{ data: { id: string; addons: unknown[] } }>(response);
      expect(data.data.addons).toBeDefined();
    });

    it("should require authentication", async () => {
      const response = await makeRequest("POST", "/api/v1/sales", undefined, {
        customer_id: "test",
        motorcycle_id: "test",
        total_price: 25000,
        down_payment: 5000,
        num_installments: 12,
        interest_rate: 5.5,
        payment_method: "installment",
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/v1/sales", () => {
    it("should list sales with pagination", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      await factories.createSale(customer.id, motorcycle.id, user.id);

      const response = await makeRequest("GET", "/api/v1/sales?page=1&limit=10", token);

      expect(response.status).toBe(200);
      const data = await jsonResponse<{ data: unknown[]; total: number }>(response);
      expect(data.total).toBeGreaterThanOrEqual(1);
    });

    it("should filter sales by status", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      await factories.createSale(customer.id, motorcycle.id, user.id, { status: "active" });

      const response = await makeRequest("GET", "/api/v1/sales?status=active", token);

      expect(response.status).toBe(200);
    });

    it("should filter sales by customer", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      await factories.createSale(customer.id, motorcycle.id, user.id);

      const response = await makeRequest("GET", `/api/v1/sales?customer_id=${customer.id}`, token);

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/v1/sales/:id", () => {
    it("should get sale detail with installments", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const sale = await factories.createSale(customer.id, motorcycle.id, user.id);

      const response = await makeRequest("GET", `/api/v1/sales/${sale.id}`, token);

      expect(response.status).toBe(200);
      const data = await jsonResponse<{
        data: { id: string; installments: unknown[] };
      }>(response);
      expect(data.data.id).toBe(sale.id);
      expect(data.data.installments).toBeDefined();
    });
  });

  describe("Sale Status Transitions", () => {
    it("should transition sale from active to completed", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const sale = await factories.createSale(customer.id, motorcycle.id, user.id);

      const response = await makeRequest("PATCH", `/api/v1/sales/${sale.id}`, token, {
        status: "completed",
      });

      expect(response.status).toBe(200);
      const data = await jsonResponse<{ data: { status: string } }>(response);
      expect(data.data.status).toBe("completed");
    });

    it("should transition sale from active to cancelled", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const sale = await factories.createSale(customer.id, motorcycle.id, user.id);

      const response = await makeRequest("PATCH", `/api/v1/sales/${sale.id}`, token, {
        status: "cancelled",
      });

      expect(response.status).toBe(200);
      const data = await jsonResponse<{ data: { status: string } }>(response);
      expect(data.data.status).toBe("cancelled");
    });
  });
});
