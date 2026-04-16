import { describe, it, expect } from "vitest";
import { factories } from "../factories";
import { generateToken, makeRequest, jsonResponse } from "../helpers";

describe("Customers Integration Tests", () => {
  describe("POST /api/v1/customers", () => {
    it("should create a new customer", async () => {
      const user = await factories.createAdmin();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const response = await makeRequest(
        "POST",
        "/api/v1/customers",
        token,
        {
          name: "John Doe",
          phone: "0891234567",
          id_card_number: "1234567890123",
          email: "john@test.local",
          address: "123 Main St",
        }
      );

      expect(response.status).toBe(201);
      const data = await jsonResponse<{ data: { id: string; name: string; phone: string } }>(response);
      expect(data.data.name).toBe("John Doe");
      expect(data.data.phone).toBe("0891234567");
    });

    it("should require authentication", async () => {
      const response = await makeRequest("POST", "/api/v1/customers", undefined, {
        name: "John Doe",
        phone: "0891234567",
        id_card_number: "1234567890123",
      });

      expect(response.status).toBe(401);
    });

    it("should reject duplicate id card number", async () => {
      const user = await factories.createAdmin();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const idCard = "1234567890123";

      // Create first customer
      await makeRequest(
        "POST",
        "/api/v1/customers",
        token,
        {
          name: "John Doe",
          phone: "0891234567",
          id_card_number: idCard,
        }
      );

      // Try to create another with same ID card
      const response = await makeRequest(
        "POST",
        "/api/v1/customers",
        token,
        {
          name: "Jane Doe",
          phone: "0891234568",
          id_card_number: idCard,
        }
      );

      expect(response.status).toBe(409);
    });
  });

  describe("GET /api/v1/customers", () => {
    it("should list customers with pagination", async () => {
      const user = await factories.createAdmin();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      await factories.createCustomer();
      await factories.createCustomer();

      const response = await makeRequest("GET", "/api/v1/customers?page=1&limit=10", token);

      expect(response.status).toBe(200);
      const data = await jsonResponse<{ data: unknown[]; total: number }>(response);
      expect(data.total).toBeGreaterThanOrEqual(2);
    });

    it("should search customers", async () => {
      const user = await factories.createAdmin();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      await factories.createCustomer({ name: "John Doe" });

      const response = await makeRequest("GET", "/api/v1/customers?search=John", token);

      expect(response.status).toBe(200);
    });
  });

  describe("GET /api/v1/customers/:id", () => {
    it("should get customer detail with debt summary", async () => {
      const user = await factories.createAdmin();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);
      const customer = await factories.createCustomer();

      const response = await makeRequest("GET", `/api/v1/customers/${customer.id}`, token);

      expect(response.status).toBe(200);
      const data = await jsonResponse<{
        data: { id: string; total_debt: number; paid_amount: number; overdue_count: number };
      }>(response);
      expect(data.data.id).toBe(customer.id);
      expect(data.data.total_debt).toBeDefined();
      expect(data.data.paid_amount).toBeDefined();
      expect(data.data.overdue_count).toBeDefined();
    });

    it("should calculate debt summary correctly", async () => {
      const user = await factories.createAdmin();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();

      // Create a sale
      const sale = await factories.createSale(customer.id, motorcycle.id, user.id, {
        totalPrice: 25000,
        downPayment: 5000,
        financeAmount: 20000,
      });

      const response = await makeRequest("GET", `/api/v1/customers/${customer.id}`, token);

      expect(response.status).toBe(200);
      const data = await jsonResponse<{
        data: { total_debt: number };
      }>(response);
      expect(data.data.total_debt).toBeGreaterThan(0);
    });

    it("should return 404 for non-existent customer", async () => {
      const user = await factories.createAdmin();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const response = await makeRequest("GET", "/api/v1/customers/nonexistent", token);

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /api/v1/customers/:id", () => {
    it("should update customer details", async () => {
      const user = await factories.createAdmin();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);
      const customer = await factories.createCustomer();

      const response = await makeRequest(
        "PATCH",
        `/api/v1/customers/${customer.id}`,
        token,
        {
          email: "newemail@test.local",
          address: "456 Oak St",
        }
      );

      expect(response.status).toBe(200);
      const data = await jsonResponse<{ data: { email: string; address: string } }>(response);
      expect(data.data.email).toBe("newemail@test.local");
      expect(data.data.address).toBe("456 Oak St");
    });
  });
});
