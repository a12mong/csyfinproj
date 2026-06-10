import { prisma } from "../../lib/prisma.js";
import type { CreateAddonInput, UpdateAddonInput } from "./addons.schemas.js";

export async function createAddon(input: CreateAddonInput) {
  const addon = await prisma.addon.create({
    data: {
      name: input.name,
      description: input.description,
      price: input.price,
      costPrice: input.cost_price ?? 0,
      stockQty: input.stock_qty ?? 0,
      type: input.type ?? "service",
      sku: input.sku ?? null,
    },
  });

  return { data: addon };
}

export async function listAddons(query?: { type?: string; search?: string }) {
  const where: any = {};

  if (query?.type) {
    const types = query.type.split(",").map((t) => t.trim()).filter(Boolean);
    if (types.length > 0) {
      where.type = { in: types };
    }
  }

  if (query?.search) {
    where.OR = [
      { name: { contains: query.search } },
      { sku: { contains: query.search } },
      { description: { contains: query.search } },
    ];
  }

  const addons = await prisma.addon.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return { data: addons };
}

export async function updateAddon(id: string, input: UpdateAddonInput) {
  const addon = await prisma.addon.findUnique({
    where: { id },
  });

  if (!addon) {
    throw Object.assign(new Error("Addon/Inventory item not found"), { statusCode: 404 });
  }

  const updated = await prisma.addon.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.cost_price !== undefined && { costPrice: input.cost_price }),
      ...(input.stock_qty !== undefined && { stockQty: input.stock_qty }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.sku !== undefined && { sku: input.sku || null }),
      ...(input.active !== undefined && { active: input.active }),
    },
  });

  return { data: updated };
}
