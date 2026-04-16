import { prisma } from "../../lib/prisma.js";
import type { CreateAddonInput } from "./addons.schemas.js";

export async function createAddon(input: CreateAddonInput) {
  const addon = await prisma.addon.create({
    data: {
      name: input.name,
      description: input.description,
      price: input.price,
      active: true,
    },
  });

  return { data: addon };
}

export async function listAddons() {
  const addons = await prisma.addon.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });

  return { data: addons };
}
