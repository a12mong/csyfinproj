import bcrypt from "bcryptjs";
import { testPrisma as prisma } from "./setup";
import type { User, Customer, Motorcycle, Addon, Sale } from "@prisma/client";

export const factories = {
  async createUser(data?: Partial<User>): Promise<User> {
    const passwordHash = await bcrypt.hash("Test1234!", 12);
    return prisma.user.create({
      data: {
        email: `user-${Date.now()}@test.local`,
        passwordHash,
        name: "Test User",
        role: "staff",
        ...data,
      },
    });
  },

  async createAdmin(data?: Partial<User>): Promise<User> {
    const passwordHash = await bcrypt.hash("Admin1234!", 12);
    return prisma.user.create({
      data: {
        email: `admin-${Date.now()}@test.local`,
        passwordHash,
        name: "Test Admin",
        role: "admin",
        ...data,
      },
    });
  },

  async createCustomer(data?: Partial<Customer>): Promise<Customer> {
    return prisma.customer.create({
      data: {
        name: "John Doe",
        phone: "0891234567",
        idCardNumber: `${Date.now()}`.slice(-13).padStart(13, "0"),
        email: `customer-${Date.now()}@test.local`,
        ...data,
      },
    });
  },

  async createMotorcycle(data?: Partial<Motorcycle>): Promise<Motorcycle> {
    return prisma.motorcycle.create({
      data: {
        brand: "Yamaha",
        model: "YZF-R15",
        year: 2023,
        chassisNumber: `CHASSIS-${Date.now()}`,
        engineNumber: `ENGINE-${Date.now()}`,
        color: "Blue",
        costPrice: 20000,
        sellingPrice: 25000,
        status: "in_stock",
        ...data,
      },
    });
  },

  async createAddon(data?: Partial<Addon>): Promise<Addon> {
    return prisma.addon.create({
      data: {
        name: "Insurance",
        description: "Comprehensive insurance coverage",
        price: 5000,
        active: true,
        ...data,
      },
    });
  },

  async createSale(
    customerId: string,
    motorcycleId: string,
    soldByUserId: string,
    data?: Partial<Sale>
  ): Promise<Sale> {
    return prisma.sale.create({
      data: {
        customerId,
        motorcycleId,
        soldByUserId,
        saleDate: new Date(),
        totalPrice: 25000,
        downPayment: 5000,
        financeAmount: 20000,
        numInstallments: 12,
        interestRate: 5.5,
        paymentMethod: "installment",
        ...data,
      },
    });
  },
};
