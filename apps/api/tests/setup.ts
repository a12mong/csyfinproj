import { beforeAll, afterAll, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";

// Use a test-specific database URL
const DATABASE_URL = process.env.TEST_DATABASE_URL ||
  "mysql://test:test@localhost:3306/csyfinproj_test";

export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

beforeAll(async () => {
  // Run migrations for test database
  const result = await testPrisma.$executeRawUnsafe(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = ? LIMIT 1",
    "csyfinproj_test"
  );

  if (!result) {
    console.log("Test database not initialized. Running migrations...");
    // Migrations will be handled by prisma migrate deploy or similar
  }
});

afterEach(async () => {
  // Clean up test data after each test
  await testPrisma.notificationLog.deleteMany({});
  await testPrisma.saleAddon.deleteMany({});
  await testPrisma.payment.deleteMany({});
  await testPrisma.installment.deleteMany({});
  await testPrisma.sale.deleteMany({});
  await testPrisma.addon.deleteMany({});
  await testPrisma.motorcycle.deleteMany({});
  await testPrisma.customer.deleteMany({});
  await testPrisma.user.deleteMany({});
});

afterAll(async () => {
  await testPrisma.$disconnect();
});
