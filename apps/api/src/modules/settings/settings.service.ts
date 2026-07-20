import { prisma } from "../../lib/prisma.js";

// Whitelist of editable system settings and their metadata
export const SETTING_KEYS = {
  line_oa_basic_id: {
    label: "LINE OA Basic ID",
    description: "Basic ID ของ LINE Official Account (เช่น @400rbdse) ใช้สร้าง QR เชื่อมบัญชีลูกค้า",
  },
  audit_retention_days: {
    label: "อายุการเก็บ Audit Log (วัน)",
    description: "ระบบลบ audit log ที่เก่ากว่าจำนวนวันนี้อัตโนมัติ (ค่าเริ่มต้น 365 วัน)",
  },
  customer_erasure_lock_years: {
    label: "ระยะเวลาห้ามลบข้อมูลลูกค้า (ปี)",
    description: "ลบ/ปกปิดข้อมูลลูกค้าได้เฉพาะเมื่อไม่มีความเคลื่อนไหวเกินจำนวนปีนี้ (ค่าเริ่มต้น 5 ปี)",
  },
  decimal_places: {
    label: "จำนวนตำแหน่งทศนิยม",
    description: "จำนวนทศนิยมของยอดเงินที่แสดงทั้งระบบ (ค่าเริ่มต้น 2)",
  },
  date_format: {
    label: "รูปแบบปีของวันที่",
    description: "buddhist = พ.ศ. (ค่าเริ่มต้น), gregorian = ค.ศ.",
  },
} as const;

export type SettingKey = keyof typeof SETTING_KEYS;

export function isSettingKey(key: string): key is SettingKey {
  return key in SETTING_KEYS;
}

/**
 * Read a system setting value. Falls back to the same-named (uppercased)
 * environment variable so existing .env deployments keep working.
 */
export async function getSetting(key: SettingKey): Promise<string | null> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  if (row && row.value.trim() !== "") return row.value;
  return process.env[key.toUpperCase()] ?? null;
}

export async function listSettings() {
  const rows = await prisma.systemSetting.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return Object.entries(SETTING_KEYS).map(([key, meta]) => ({
    key,
    label: meta.label,
    description: meta.description,
    value: byKey.get(key)?.value ?? process.env[key.toUpperCase()] ?? "",
    updatedAt: byKey.get(key)?.updatedAt ?? null,
  }));
}

export async function updateSetting(key: SettingKey, value: string) {
  const trimmed = value.trim();
  const row = await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value: trimmed },
    update: { value: trimmed },
  });
  return { key: row.key, value: row.value, updatedAt: row.updatedAt };
}
