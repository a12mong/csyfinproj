import { prisma } from "../../lib/prisma.js";
import type { CreateMotorcycleInput, UpdateMotorcycleInput, ListMotorcyclesInput } from "./motorcycles.schemas.js";

function formatMotorcycle(m: {
  id: string;
  brand: string;
  model: string;
  year: number;
  chassisNumber: string;
  engineNumber: string;
  color: string;
  costPrice: { toNumber(): number } | number;
  sellingPrice: { toNumber(): number } | number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: m.id,
    brand: m.brand,
    model: m.model,
    year: m.year,
    chassis_number: m.chassisNumber,
    engine_number: m.engineNumber,
    color: m.color,
    cost_price: typeof m.costPrice === "object" ? (m.costPrice as { toNumber(): number }).toNumber() : m.costPrice,
    selling_price: typeof m.sellingPrice === "object" ? (m.sellingPrice as { toNumber(): number }).toNumber() : m.sellingPrice,
    status: m.status,
    created_at: m.createdAt,
    updated_at: m.updatedAt,
  };
}

export async function createMotorcycle(input: CreateMotorcycleInput) {
  const motorcycle = await prisma.motorcycle.create({
    data: {
      brand: input.brand ?? "Yamaha",
      model: input.model,
      year: input.year,
      chassisNumber: input.chassis_number,
      engineNumber: input.engine_number,
      color: input.color,
      costPrice: input.cost_price,
      sellingPrice: input.selling_price,
    },
  });
  return formatMotorcycle(motorcycle);
}

export async function listMotorcycles(input: ListMotorcyclesInput) {
  const { page, limit, status, search } = input;
  const skip = (page - 1) * limit;

  type WhereClause = NonNullable<Parameters<typeof prisma.motorcycle.findMany>[0]>["where"] & {
    status?: "in_stock" | "reserved" | "sold";
    OR?: Array<Record<string, unknown>>;
  };
  const where: WhereClause = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { model: { contains: search } },
      { chassisNumber: { contains: search } },
      { engineNumber: { contains: search } },
    ];
  }

  const [motorcycles, total] = await Promise.all([
    prisma.motorcycle.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.motorcycle.count({ where }),
  ]);

  return {
    data: motorcycles.map(formatMotorcycle),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getMotorcycle(id: string) {
  const motorcycle = await prisma.motorcycle.findUnique({ where: { id } });
  if (!motorcycle) {
    const err = new Error("Motorcycle not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }
  return formatMotorcycle(motorcycle);
}

export async function updateMotorcycle(id: string, input: UpdateMotorcycleInput) {
  const exists = await prisma.motorcycle.findUnique({ where: { id } });
  if (!exists) {
    const err = new Error("Motorcycle not found") as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  const motorcycle = await prisma.motorcycle.update({
    where: { id },
    data: {
      ...(input.brand !== undefined && { brand: input.brand }),
      ...(input.model !== undefined && { model: input.model }),
      ...(input.year !== undefined && { year: input.year }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.cost_price !== undefined && { costPrice: input.cost_price }),
      ...(input.selling_price !== undefined && { sellingPrice: input.selling_price }),
      ...(input.status !== undefined && { status: input.status }),
    },
  });

  return formatMotorcycle(motorcycle);
}
