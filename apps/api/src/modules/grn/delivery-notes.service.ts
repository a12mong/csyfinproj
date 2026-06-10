import { prisma } from "../../lib/prisma.js";
import type {
  CreateDeliveryNoteInput,
  ListDeliveryNotesInput,
  UpdateDeliveryNoteInput,
} from "./delivery-notes.schemas.js";

function formatItem(item: {
  id: string;
  deliveryNoteId: string;
  itemType: string;
  description: string;
  quantity: number;
  unitCost: { toNumber(): number } | number;
  createdAt: Date;
  motorcycles?: Array<{
    id: string;
    brand: string;
    model: string;
    year: number;
    chassisNumber: string;
    engineNumber: string;
    color: string;
    status: string;
  }>;
}) {
  return {
    id: item.id,
    delivery_note_id: item.deliveryNoteId,
    item_type: item.itemType,
    description: item.description,
    quantity: item.quantity,
    unit_cost:
      typeof item.unitCost === "object"
        ? (item.unitCost as { toNumber(): number }).toNumber()
        : item.unitCost,
    created_at: item.createdAt,
    motorcycles: item.motorcycles ?? [],
  };
}

function formatDeliveryNote(dn: {
  id: string;
  noteNumber: string;
  supplierName: string;
  receivedDate: Date;
  receivedByUserId: string;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  receivedBy?: { id: string; name: string; email: string };
  items?: ReturnType<typeof formatItem>[];
}) {
  return {
    id: dn.id,
    note_number: dn.noteNumber,
    supplier_name: dn.supplierName,
    received_date: dn.receivedDate,
    received_by_user_id: dn.receivedByUserId,
    notes: dn.notes,
    status: dn.status,
    created_at: dn.createdAt,
    updated_at: dn.updatedAt,
    received_by: dn.receivedBy,
    items: dn.items,
  };
}

export async function createDeliveryNote(
  input: CreateDeliveryNoteInput,
  userId: string
) {
  // Validate motorcycle items have matching chassis/engine counts
  for (const item of input.items) {
    if (item.item_type === "motorcycle") {
      const chassisCount = item.chassis_numbers?.length ?? 0;
      const engineCount = item.engine_numbers?.length ?? 0;
      if (chassisCount !== item.quantity || engineCount !== item.quantity) {
        const err = new Error(
          `Motorcycle item "${item.description}": chassis_numbers and engine_numbers arrays must each have exactly ${item.quantity} entries matching quantity`
        ) as Error & { statusCode: number };
        err.statusCode = 400;
        throw err;
      }
    }
  }

  const deliveryNote = await prisma.$transaction(async (tx) => {
    // Create delivery note
    const note = await tx.deliveryNote.create({
      data: {
        noteNumber: input.note_number,
        supplierName: input.supplier_name,
        receivedDate: new Date(input.received_date),
        receivedByUserId: userId,
        notes: input.notes,
        status: "pending",
      },
    });

    const createdItems = [];

    for (const itemInput of input.items) {
      const noteItem = await tx.deliveryNoteItem.create({
        data: {
          deliveryNoteId: note.id,
          itemType: itemInput.item_type,
          description: itemInput.description,
          quantity: itemInput.quantity,
          unitCost: itemInput.unit_cost,
        },
      });

      // Auto-create motorcycle records for motorcycle items
      if (itemInput.item_type === "motorcycle") {
        const motorcycles = [];
        for (let i = 0; i < itemInput.quantity; i++) {
          const motorcycle = await tx.motorcycle.create({
            data: {
              brand: "Yamaha",
              model: itemInput.description,
              year: itemInput.year ?? new Date().getFullYear(),
              chassisNumber: itemInput.chassis_numbers![i],
              engineNumber: itemInput.engine_numbers![i],
              color: itemInput.color ?? "TBD",
              costPrice: itemInput.unit_cost,
              sellingPrice: itemInput.selling_price ?? itemInput.unit_cost,
              status: "in_stock",
              deliveryNoteItemId: noteItem.id,
            },
          });
          motorcycles.push(motorcycle);
        }
        createdItems.push({ ...noteItem, motorcycles });
      } else {
        if (itemInput.item_type === "part" || itemInput.item_type === "accessory") {
          const existingAddon = await tx.addon.findFirst({
            where: {
              name: itemInput.description,
              type: itemInput.item_type,
            },
          });

          if (existingAddon) {
            await tx.addon.update({
              where: { id: existingAddon.id },
              data: {
                stockQty: { increment: itemInput.quantity },
                costPrice: itemInput.unit_cost,
              },
            });
          } else {
            await tx.addon.create({
              data: {
                name: itemInput.description,
                type: itemInput.item_type,
                costPrice: itemInput.unit_cost,
                price: itemInput.unit_cost * 1.25,
                stockQty: itemInput.quantity,
              },
            });
          }
        }
        createdItems.push({ ...noteItem, motorcycles: [] });
      }
    }

    return { note, items: createdItems };
  });

  return {
    data: {
      ...formatDeliveryNote({
        ...deliveryNote.note,
        receivedBy: undefined,
        items: deliveryNote.items.map(formatItem),
      }),
    },
  };
}

export async function listDeliveryNotes(input: ListDeliveryNotesInput) {
  const { page, limit, status, supplier, date_from, date_to } = input;
  const skip = (page - 1) * limit;

  const where: {
    status?: "pending" | "verified" | "cancelled";
    supplierName?: { contains: string };
    receivedDate?: { gte?: Date; lte?: Date };
  } = {};

  if (status) {
    where.status = status;
  }
  if (supplier) {
    where.supplierName = { contains: supplier };
  }
  if (date_from || date_to) {
    where.receivedDate = {};
    if (date_from) where.receivedDate.gte = new Date(date_from);
    if (date_to) where.receivedDate.lte = new Date(date_to);
  }

  const [notes, total] = await Promise.all([
    prisma.deliveryNote.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        receivedBy: { select: { id: true, name: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.deliveryNote.count({ where }),
  ]);

  return {
    data: notes.map((n) => ({
      ...formatDeliveryNote({ ...n, receivedBy: n.receivedBy }),
      item_count: n._count.items,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getDeliveryNote(id: string) {
  const note = await prisma.deliveryNote.findUnique({
    where: { id },
    include: {
      receivedBy: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          motorcycles: {
            select: {
              id: true,
              brand: true,
              model: true,
              year: true,
              chassisNumber: true,
              engineNumber: true,
              color: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!note) {
    const err = new Error("Delivery note not found") as Error & {
      statusCode: number;
    };
    err.statusCode = 404;
    throw err;
  }

  return {
    data: formatDeliveryNote({
      ...note,
      receivedBy: note.receivedBy,
      items: note.items.map(formatItem),
    }),
  };
}

export async function updateDeliveryNote(
  id: string,
  input: UpdateDeliveryNoteInput
) {
  const note = await prisma.deliveryNote.findUnique({
    where: { id },
    include: { items: { include: { motorcycles: true } } },
  });

  if (!note) {
    const err = new Error("Delivery note not found") as Error & {
      statusCode: number;
    };
    err.statusCode = 404;
    throw err;
  }

  if (note.status !== "pending") {
    const err = new Error(
      `Cannot update a delivery note with status "${note.status}". Only pending notes can be updated.`
    ) as Error & { statusCode: number };
    err.statusCode = 422;
    throw err;
  }

  if (input.status === "cancelled") {
    // Cancelling: only un-link motorcycles that have NOT been sold
    await prisma.$transaction(async (tx) => {
      for (const item of note.items) {
        const unsoldMotorcycles = item.motorcycles.filter(
          (m) => m.status !== "sold"
        );
        // Remove the delivery note item link from unsold motorcycles (do NOT delete them)
        for (const m of unsoldMotorcycles) {
          await tx.motorcycle.update({
            where: { id: m.id },
            data: { deliveryNoteItemId: null },
          });
        }
      }

      await tx.deliveryNote.update({
        where: { id },
        data: {
          status: "cancelled",
          ...(input.notes !== undefined && { notes: input.notes }),
        },
      });
    });
  } else {
    await prisma.deliveryNote.update({
      where: { id },
      data: {
        status: input.status,
        ...(input.notes !== undefined && { notes: input.notes }),
      },
    });
  }

  return getDeliveryNote(id);
}
