import { describe, it, expect } from "vitest";
import { factories } from "../factories";
import { generateToken, makeRequest, jsonResponse } from "../helpers";
import { testPrisma as prisma } from "../setup";

describe("Installments Integration Tests", () => {
  async function createSaleWithInstallments(userId: string, customerId: string, motorcycleId: string) {
    const sale = await factories.createSale(customerId, motorcycleId, userId);
    // Create 3 installments for the sale
    const installments = await Promise.all([
      prisma.installment.create({
        data: {
          saleId: sale.id,
          installmentNumber: 1,
          dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago (overdue)
          amountDue: 1833.33,
          amountPaid: 0,
          status: "overdue",
        },
      }),
      prisma.installment.create({
        data: {
          saleId: sale.id,
          installmentNumber: 2,
          dueDate: new Date(),
          amountDue: 1833.33,
          amountPaid: 0,
          status: "pending",
        },
      }),
      prisma.installment.create({
        data: {
          saleId: sale.id,
          installmentNumber: 3,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days ahead
          amountDue: 1833.33,
          amountPaid: 1833.33,
          status: "paid",
        },
      }),
    ]);
    return { sale, installments };
  }

  describe("GET /api/v1/installments", () => {
    it("should list installments with pagination", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      await createSaleWithInstallments(user.id, customer.id, motorcycle.id);

      const response = await makeRequest("GET", "/api/v1/installments?page=1&limit=10", token);

      expect(response.status).toBe(200);
      const data = await jsonResponse<{ data: unknown[]; total: number; page: number }>(response);
      expect(data.total).toBeGreaterThanOrEqual(3);
      expect(data.page).toBe(1);
      expect(Array.isArray(data.data)).toBe(true);
    });

    it("should filter installments by sale_id", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const { sale } = await createSaleWithInstallments(user.id, customer.id, motorcycle.id);

      const response = await makeRequest("GET", `/api/v1/installments?sale_id=${sale.id}`, token);

      expect(response.status).toBe(200);
      const data = await jsonResponse<{ data: unknown[]; total: number }>(response);
      expect(data.total).toBe(3);
    });

    it("should filter installments by status", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const { sale } = await createSaleWithInstallments(user.id, customer.id, motorcycle.id);

      const response = await makeRequest(
        "GET",
        `/api/v1/installments?sale_id=${sale.id}&status=paid`,
        token
      );

      expect(response.status).toBe(200);
      const data = await jsonResponse<{ data: { status: string }[]; total: number }>(response);
      expect(data.total).toBe(1);
      expect(data.data[0]?.status).toBe("paid");
    });

    it("should filter overdue installments", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const { sale } = await createSaleWithInstallments(user.id, customer.id, motorcycle.id);

      const response = await makeRequest(
        "GET",
        `/api/v1/installments?sale_id=${sale.id}&overdue=true`,
        token
      );

      expect(response.status).toBe(200);
      const data = await jsonResponse<{ data: unknown[]; total: number }>(response);
      // Should include the overdue installment (installment 1 with past due date)
      expect(data.total).toBeGreaterThanOrEqual(1);
    });

    it("should require authentication", async () => {
      const response = await makeRequest("GET", "/api/v1/installments");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/v1/installments/:id", () => {
    it("should get installment detail with payment history", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const { installments } = await createSaleWithInstallments(user.id, customer.id, motorcycle.id);
      const installment = installments[0]!;

      const response = await makeRequest("GET", `/api/v1/installments/${installment.id}`, token);

      expect(response.status).toBe(200);
      const data = await jsonResponse<{
        data: {
          id: string;
          installmentNumber: number;
          amountDue: number;
          payments: unknown[];
          sale: { id: string; customer: unknown };
        };
      }>(response);
      expect(data.data.id).toBe(installment.id);
      expect(data.data.installmentNumber).toBe(1);
      expect(data.data.payments).toBeDefined();
      expect(Array.isArray(data.data.payments)).toBe(true);
      expect(data.data.sale).toBeDefined();
      expect(data.data.sale.customer).toBeDefined();
    });

    it("should return 404 for non-existent installment", async () => {
      const user = await factories.createAdmin();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const response = await makeRequest(
        "GET",
        "/api/v1/installments/00000000-0000-0000-0000-000000000000",
        token
      );

      expect(response.status).toBe(404);
    });

    it("should require authentication", async () => {
      const response = await makeRequest(
        "GET",
        "/api/v1/installments/00000000-0000-0000-0000-000000000000"
      );

      expect(response.status).toBe(401);
    });
  });
});
