import { prisma } from "../../lib/prisma.js";

export async function listFinancialInstitutions(activeOnly = false) {
  const where = activeOnly ? { active: true } : {};
  const data = await prisma.financialInstitution.findMany({
    where,
    orderBy: { name: "asc" },
  });
  return { data };
}
