import { describe, it, expect } from "vitest";
import { factories } from "../factories";
import { generateToken, makeRequest, jsonResponse } from "../helpers";
import { testPrisma as prisma } from "../setup";

describe("Sales Integration Tests", () => {
  describe("POST /api/v1/sales", () => {
    // Test all 3 payment methods for TDS-57
    it("should create a CASH sale without installments or contract", async () => {
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
          down_payment: 25000, // Full amount for cash
          num_installments: 0,
          interest_rate: 0,
          payment_method: "cash",
          notes: "Cash sale - TDS-57 Test Workflow 1",
        }
      );

      expect(response.status).toBe(201);
      const data = await jsonResponse<{
        data: {
          id: string;
          status: string;
          paymentMethod: string;
          financeAmount: number;
          numInstallments: number;
        };
      }>(response);
      expect(data.data.paymentMethod).toBe("cash");
      expect(data.data.status).toBe("completed"); // Cash sales complete immediately
      expect(data.data.financeAmount).toBe(0);
      expect(data.data.numInstallments).toBe(0);
    });

    it("should create an IN-HOUSE INSTALLMENT sale with contract", async () => {
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
          interest_rate: 2.0,
          payment_method: "installment",
          notes: "In-house installment - TDS-57 Test Workflow 2",
        }
      );

      expect(response.status).toBe(201);
      const data = await jsonResponse<{
        data: {
          id: string;
          status: string;
          paymentMethod: string;
          financeAmount: number;
          numInstallments: number;
        };
      }>(response);
      expect(data.data.paymentMethod).toBe("installment");
      expect(data.data.status).toBe("active");
      expect(data.data.financeAmount).toBe(20000);
      expect(data.data.numInstallments).toBe(12);
    });

    it("should create a FINANCE COMPANY sale with company reference", async () => {
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
          num_installments: 18,
          interest_rate: 2.5,
          payment_method: "finance_company",
          finance_company_name: "กรุงศรีออโต้",
          finance_reference_number: "FC-2026-0001",
          notes: "Finance company sale - TDS-57 Test Workflow 3",
        }
      );

      expect(response.status).toBe(201);
      const data = await jsonResponse<{
        data: {
          id: string;
          status: string;
          paymentMethod: string;
          financeCompanyName: string;
          financeReferenceNumber: string;
        };
      }>(response);
      expect(data.data.paymentMethod).toBe("finance_company");
      expect(data.data.financeCompanyName).toBe("กรุงศรีออโต้");
      expect(data.data.financeReferenceNumber).toBe("FC-2026-0001");
      expect(data.data.status).toBe("active");
    });

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

  describe("Contract & Installment Workflows (TDS-57)", () => {
    it("should create a contract with installment schedule (declining balance)", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      // Create installment sale
      const saleResponse = await makeRequest(
        "POST",
        "/api/v1/sales",
        token,
        {
          customer_id: customer.id,
          motorcycle_id: motorcycle.id,
          total_price: 100000,
          down_payment: 20000,
          num_installments: 12,
          interest_rate: 2.0,
          payment_method: "installment",
        }
      );
      expect(saleResponse.status).toBe(201);
      const saleData = await jsonResponse<{ data: { id: string } }>(saleResponse);

      // Create contract from sale
      const contractResponse = await makeRequest(
        "POST",
        "/api/v1/contracts",
        token,
        {
          customer_id: customer.id,
          sale_ids: [saleData.data.id],
          total_principal: 80000,
          interest_rate: 2.0,
          num_installments: 12,
          start_date: new Date().toISOString().split("T")[0],
        }
      );

      expect(contractResponse.status).toBe(201);
      const contractData = await jsonResponse<{
        data: {
          id: string;
          contractNumber: string;
          numInstallments: number;
          installments: Array<{
            installmentNumber: number;
            principalPortion: number;
            interestPortion: number;
            remainingBalance: number;
          }>;
        };
      }>(contractResponse);

      expect(contractData.data.contractNumber).toMatch(/^CT-\d{6}$/);
      expect(contractData.data.numInstallments).toBe(12);
      expect(contractData.data.installments.length).toBe(12);

      // Verify declining balance: first installment interest > principal
      const firstInstallment = contractData.data.installments[0];
      const lastInstallment = contractData.data.installments[11];

      expect(firstInstallment.interestPortion).toBeGreaterThan(firstInstallment.principalPortion);
      expect(lastInstallment.interestPortion).toBeLessThan(lastInstallment.principalPortion);
      expect(lastInstallment.remainingBalance).toBeLessThan(1000); // Approximately 0
    });

    it("should process full and partial installment payments (TDS-57 Workflow 4)", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer();
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      // Create and setup a contract
      const saleResponse = await makeRequest(
        "POST",
        "/api/v1/sales",
        token,
        {
          customer_id: customer.id,
          motorcycle_id: motorcycle.id,
          total_price: 100000,
          down_payment: 20000,
          num_installments: 6,
          interest_rate: 2.0,
          payment_method: "installment",
        }
      );
      const saleData = await jsonResponse<{ data: { id: string } }>(saleResponse);

      const contractResponse = await makeRequest(
        "POST",
        "/api/v1/contracts",
        token,
        {
          customer_id: customer.id,
          sale_ids: [saleData.data.id],
          total_principal: 80000,
          interest_rate: 2.0,
          num_installments: 6,
          start_date: new Date().toISOString().split("T")[0],
        }
      );
      const contractData = await jsonResponse<{
        data: {
          id: string;
          installments: Array<{ id: string; installmentNumber: number }>;
        };
      }>(contractResponse);

      // Pay first installment in full
      const firstInstallmentId = contractData.data.installments[0].id;
      const paymentResponse = await makeRequest(
        "POST",
        `/api/v1/contracts/${contractData.data.id}/installments/${firstInstallmentId}/pay`,
        token,
        {
          amount: 14000,
          payment_date: new Date().toISOString().split("T")[0],
          payment_channel: "bank_transfer",
        }
      );

      expect(paymentResponse.status).toBe(201);
      const paymentData = await jsonResponse<{
        data: {
          installment: { status: string; amountPaid: number };
        };
      }>(paymentResponse);
      expect(paymentData.data.installment.status).toBe("paid");
    });
  });

  describe("Dual-customer support (TDS-66)", () => {
    it("should create a cash sale using invoice_customer_id (new field)", async () => {
      const user = await factories.createAdmin();
      const customer = await factories.createCustomer({ type: "personal" });
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const response = await makeRequest("POST", "/api/v1/sales", token, {
        invoice_customer_id: customer.id,
        motorcycle_id: motorcycle.id,
        total_price: 25000,
        down_payment: 25000,
        payment_method: "cash",
      });

      expect(response.status).toBe(201);
      const data = await jsonResponse<{ data: { invoiceCustomerId: string; buyerCustomerId: string | null } }>(response);
      expect(data.data.invoiceCustomerId).toBe(customer.id);
      expect(data.data.buyerCustomerId).toBeNull();
    });

    it("should reject cash sale with finance invoice customer and no buyer_customer_id", async () => {
      const user = await factories.createAdmin();
      const financeCustomer = await factories.createCustomer({ type: "finance" });
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const response = await makeRequest("POST", "/api/v1/sales", token, {
        invoice_customer_id: financeCustomer.id,
        motorcycle_id: motorcycle.id,
        total_price: 25000,
        down_payment: 25000,
        payment_method: "cash",
      });

      expect(response.status).toBe(400);
      const body = await jsonResponse<{ error: string }>(response);
      expect(body.error).toContain("buyer_customer_id");
    });

    it("should create a cash sale with finance invoice customer and personal buyer", async () => {
      const user = await factories.createAdmin();
      const financeCustomer = await factories.createCustomer({ type: "finance" });
      const personalBuyer = await factories.createCustomer({ type: "personal" });
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const response = await makeRequest("POST", "/api/v1/sales", token, {
        invoice_customer_id: financeCustomer.id,
        buyer_customer_id: personalBuyer.id,
        motorcycle_id: motorcycle.id,
        total_price: 25000,
        down_payment: 25000,
        payment_method: "cash",
      });

      expect(response.status).toBe(201);
      const data = await jsonResponse<{ data: { invoiceCustomerId: string; buyerCustomerId: string } }>(response);
      expect(data.data.invoiceCustomerId).toBe(financeCustomer.id);
      expect(data.data.buyerCustomerId).toBe(personalBuyer.id);
    });

    it("should create a cash sale with finance invoice customer and individual buyer", async () => {
      const user = await factories.createAdmin();
      const financeCustomer = await factories.createCustomer({ type: "finance" });
      const individualBuyer = await factories.createCustomer({ type: "individual" });
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const response = await makeRequest("POST", "/api/v1/sales", token, {
        invoice_customer_id: financeCustomer.id,
        buyer_customer_id: individualBuyer.id,
        motorcycle_id: motorcycle.id,
        total_price: 25000,
        down_payment: 25000,
        payment_method: "cash",
      });

      expect(response.status).toBe(201);
      const data = await jsonResponse<{ data: { buyerCustomerId: string } }>(response);
      expect(data.data.buyerCustomerId).toBe(individualBuyer.id);
    });

    it("should reject cash sale with finance invoice customer and finance buyer", async () => {
      const user = await factories.createAdmin();
      const financeCustomer = await factories.createCustomer({ type: "finance" });
      const financeBuyer = await factories.createCustomer({ type: "finance" });
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const response = await makeRequest("POST", "/api/v1/sales", token, {
        invoice_customer_id: financeCustomer.id,
        buyer_customer_id: financeBuyer.id,
        motorcycle_id: motorcycle.id,
        total_price: 25000,
        down_payment: 25000,
        payment_method: "cash",
      });

      expect(response.status).toBe(400);
      const body = await jsonResponse<{ error: string }>(response);
      expect(body.error).toContain("personal or individual");
    });

    it("should return invoiceCustomer and buyerCustomer with type in sale detail", async () => {
      const user = await factories.createAdmin();
      const financeCustomer = await factories.createCustomer({ type: "finance" });
      const personalBuyer = await factories.createCustomer({ type: "personal" });
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const createResponse = await makeRequest("POST", "/api/v1/sales", token, {
        invoice_customer_id: financeCustomer.id,
        buyer_customer_id: personalBuyer.id,
        motorcycle_id: motorcycle.id,
        total_price: 25000,
        down_payment: 25000,
        payment_method: "cash",
      });
      expect(createResponse.status).toBe(201);
      const created = await jsonResponse<{ data: { id: string } }>(createResponse);

      const response = await makeRequest("GET", `/api/v1/sales/${created.data.id}`, token);
      expect(response.status).toBe(200);
      const data = await jsonResponse<{
        data: {
          invoiceCustomer: { id: string; type: string };
          buyerCustomer: { id: string; type: string };
        };
      }>(response);
      expect(data.data.invoiceCustomer.type).toBe("finance");
      expect(data.data.buyerCustomer.type).toBe("personal");
    });

    it("should reject sale creation with no customer id at all", async () => {
      const user = await factories.createAdmin();
      const motorcycle = await factories.createMotorcycle();
      const token = generateToken({ email: user.email, role: "admin" }, user.id);

      const response = await makeRequest("POST", "/api/v1/sales", token, {
        motorcycle_id: motorcycle.id,
        total_price: 25000,
        down_payment: 25000,
        payment_method: "cash",
      });

      expect(response.status).toBe(400);
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
