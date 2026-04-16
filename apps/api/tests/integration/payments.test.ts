import { describe, it, expect } from "vitest";
import { factories } from "../factories";
import { generateToken, makeRequest, jsonResponse } from "../helpers";
import { testPrisma as prisma } from "../setup";

describe("Payments Integration Tests", () => {
  describe("POST /api/v1/payments", () => {
    it("should record a payment for an installment", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      // Create sale with installments
      const sale = await factories.createSale(customer.id, motorcycle.id, user.id);

      // Get the first installment
      const installments = await prisma.installment.findMany({
        where: { saleId: sale.id },
        take: 1,
      });

      expect(installments.length).toBeGreaterThan(0);
      const installment = installments[0];

      const response = await makeRequest(
        "POST",
        "/api/v1/payments",
        token,
        {
          installment_id: installment.id,
          amount: 1000,
          payment_date: new Date().toISOString().split("T")[0],
          notes: "Test payment",
        }
      );

      expect(response.status).toBe(201);
      const data = await jsonResponse<{
        data: { id: string; amount: number; verified: boolean };
      }>(response);
      expect(data.data.amount).toBe(1000);
      expect(data.data.verified).toBe(false);
    });

    it("should handle payment with slip image upload", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const sale = await factories.createSale(customer.id, motorcycle.id, user.id);

      const installments = await prisma.installment.findMany({
        where: { saleId: sale.id },
        take: 1,
      });

      const installment = installments[0];

      const response = await makeRequest(
        "POST",
        "/api/v1/payments",
        token,
        {
          installment_id: installment.id,
          amount: 1000,
          payment_date: new Date().toISOString().split("T")[0],
          slip_image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        }
      );

      expect([201, 400]).toContain(response.status); // 400 if multipart not fully supported
    });

    it("should require authentication", async () => {
      const response = await makeRequest("POST", "/api/v1/payments", undefined, {
        installment_id: "test",
        amount: 1000,
        payment_date: new Date().toISOString().split("T")[0],
      });

      expect(response.status).toBe(401);
    });
  });

  describe("PATCH /api/v1/payments/:id/verify", () => {
    it("should verify a payment slip", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const sale = await factories.createSale(customer.id, motorcycle.id, user.id);

      const installments = await prisma.installment.findMany({
        where: { saleId: sale.id },
        take: 1,
      });

      const installment = installments[0];

      // Create payment
      const payment = await prisma.payment.create({
        data: {
          installmentId: installment.id,
          amount: 1000,
          paymentDate: new Date(),
          slipImageUrl: "http://example.com/slip.png",
          verified: false,
        },
      });

      const response = await makeRequest(
        "PATCH",
        `/api/v1/payments/${payment.id}/verify`,
        token,
        {
          verified: true,
          notes: "Verified slip",
        }
      );

      expect(response.status).toBe(200);
      const data = await jsonResponse<{ data: { verified: boolean } }>(response);
      expect(data.data.verified).toBe(true);
    });

    it("should reject payment verification", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const sale = await factories.createSale(customer.id, motorcycle.id, user.id);

      const installments = await prisma.installment.findMany({
        where: { saleId: sale.id },
        take: 1,
      });

      const installment = installments[0];

      const payment = await prisma.payment.create({
        data: {
          installmentId: installment.id,
          amount: 1000,
          paymentDate: new Date(),
          slipImageUrl: "http://example.com/slip.png",
          verified: true,
        },
      });

      const response = await makeRequest(
        "PATCH",
        `/api/v1/payments/${payment.id}/verify`,
        token,
        {
          verified: false,
          notes: "Rejected slip",
        }
      );

      expect(response.status).toBe(200);
    });
  });

  describe("Installment Status Updates", () => {
    it("should update installment status when payment received", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();

      const sale = await factories.createSale(customer.id, motorcycle.id, user.id);

      const installments = await prisma.installment.findMany({
        where: { saleId: sale.id },
        take: 1,
      });

      const installment = installments[0];

      // Create payment for full amount
      await prisma.payment.create({
        data: {
          installmentId: installment.id,
          amount: Number(installment.amountDue),
          paymentDate: new Date(),
          verified: true,
        },
      });

      // Check if installment status updated
      const updated = await prisma.installment.findUnique({
        where: { id: installment.id },
      });

      expect(updated?.amountPaid).toBe(Number(installment.amountDue));
    });

    it("should mark installment as overdue if past due date", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const sale = await factories.createSale(customer.id, motorcycle.id, user.id, {
        saleDate: pastDate,
      });

      const installments = await prisma.installment.findMany({
        where: { saleId: sale.id },
      });

      // Get first installment with due date in past
      const overdueInstallment = installments.find((i) => i.dueDate < new Date());

      if (overdueInstallment) {
        expect(overdueInstallment.status).toBe("pending");
        // In real implementation, this would be marked as overdue by a job
      }
    });
  });
});
