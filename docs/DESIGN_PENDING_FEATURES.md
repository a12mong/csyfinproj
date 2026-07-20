# Design: งานใหญ่ (Thai i18n / Role Tree / Audit + PDPA)

สถานะ (อัปเดต 2026-07-20):
- ✅ **Role Tree — เสร็จแล้ว** (ตาราง roles/role_permissions, สืบทอดสิทธิ์, บังคับใช้ฝั่ง API
  ทุก endpoint, ตัดราคาทุนออกจาก response, หน้า /settings/roles, users ผูก role_id)
- ⏳ Audit + PDPA — รอทำ (คำตอบครบแล้ว ดูด้านล่าง)
- ⏳ ภาษาไทยทั้งระบบ — รอทำ (คำตอบครบแล้ว ดูด้านล่าง)

---

## 1. ภาษาไทยทั้งระบบ + รูปแบบวันที่/ทศนิยม (ตั้งค่าได้)

### แนวทาง
- **ไม่ใช้ i18n framework** (เช่น next-intl) เพราะระบบต้องการภาษาไทยภาษาเดียว —
  แปลตรงในโค้ดทีละหน้า พร้อมตัดข้อความเชิง developer ออก (เช่น "Sale ID: uuid...",
  "Reference Mode", raw enum values)
- สร้าง `apps/web/src/lib/format.ts` เป็นจุดเดียวของการ format:
  - `formatPrice(n)` — อ่านจำนวนทศนิยมจาก system settings (`decimal_places`)
  - `formatDate(d)` / `formatDateTime(d)` — อ่านรูปแบบจาก settings (`date_format`)
  - `translateEnum(type, value)` — แปล enum ทุกตัว (สถานะ, ช่องทาง, วิธีชำระ) เป็นไทย
- เพิ่ม system settings (ตาราง `system_settings` ที่มีอยู่แล้ว):
  - `date_format`: `"buddhist"` (18 ก.ค. 2569) หรือ `"gregorian"` (18 ก.ค. 2026)
  - `decimal_places`: 0 / 2
- โหลด settings ครั้งเดียวใน AuthContext แล้วแจกผ่าน React context
- ไล่แปลทีละหน้า (26 หน้า) — ประมาณ 8 batch: dashboard → inventory → receiving →
  sales → customers → contracts → finance → payments/settings

### ✅ คำตอบที่ได้แล้ว (2026-07-20)
1. ปี **พ.ศ.** เป็นค่าเริ่มต้น
2. เอกสารพิมพ์ใช้รูปแบบเดียวกันทั้งระบบ แต่มีแบบ**เต็ม/ย่อ** และตั้งค่าได้
   → settings: `date_format_short`, `date_format_full`
3. ทศนิยม **2 ตำแหน่ง** และตั้งค่าได้ → setting `decimal_places`
4. เมนู sidebar **ไทยล้วน**: แดชบอร์ด/คลังสินค้า/รับสินค้า/การขาย/ลูกค้า/สัญญา/การเงิน/รับชำระ/ตั้งค่า

---

## 2. Role & Sub-role แบบ Tree พร้อมสืบทอดสิทธิ์

### Schema ใหม่
```prisma
model Role {
  id          String  @id @default(uuid())
  name        String  @unique            // เช่น "ผู้จัดการ", "พนักงานขาย"
  parentId    String?                    // สืบทอดสิทธิ์จาก parent
  isSystem    Boolean @default(false)    // admin (แก้/ลบไม่ได้)
  parent      Role?   @relation("RoleTree", fields: [parentId], references: [id])
  children    Role[]  @relation("RoleTree")
  permissions RolePermission[]
  users       User[]
}

model RolePermission {
  id     String @id @default(uuid())
  roleId String
  page   PermissionPage       // inventory, receiving, sales, customers, contracts, finance, payments, settings
  action String               // ดูตาราง action ด้านล่าง
  allow  Boolean              // true=อนุญาต, false=ปฏิเสธ (override parent)
  @@unique([roleId, page, action])
}
```

### Actions ต่อหน้า
| Page | Actions |
|---|---|
| ทุกหน้า | `view`, `edit` |
| inventory | + `view_cost_price` (เห็นราคาทุน), `view_selling_price` (เห็นราคาขาย) |
| finance | + `send_reminder` (กดส่งแจ้งเตือน) |
| payments | + `approve_payment` (approve/reject) |

### การสืบทอด (resolution)
- สิทธิ์ effective ของ role = เดินจาก root ลงมาถึง role นั้น โดย child **override** parent
  ได้ทั้ง allow และ deny (RolePermission.allow=false = ตัดสิทธิ์ที่สืบทอดมา)
- ผู้ใช้ 1 คน = 1 role (คงเดิม) — role admin (isSystem) ได้ทุกสิทธิ์เสมอ
- API: middleware `requirePermission(page, action)` (มีอยู่แล้วแต่ยังไม่ wire)
  เปลี่ยนมาอ่านจาก role tree + **บังคับใช้ฝั่ง server ทุก endpoint** (ปิดช่องโหว่เดิม)
- ราคาทุน/ราคาขาย: API ต้อง **ตัด field ออกจาก response** เมื่อไม่มีสิทธิ์
  (ไม่ใช่แค่ซ่อนบนจอ)

### Migration จากระบบเดิม
- สร้าง role: "Admin" (system), "Staff", "Viewer" ตาม enum เดิม แล้ว map ผู้ใช้เข้า role
- ตาราง `user_permissions` เดิม → แปลงเป็น per-user override หรือตัดทิ้ง (ดูคำถาม)

### ✅ คำตอบที่ได้แล้ว + implement แล้ว (2026-07-20)
1. **role อย่างเดียว** — ตัด per-user override, หน้า users เหลือ dropdown เลือก role
2. แก้ tree ได้เฉพาะ **admin**
3. ลึกสุด **3 ชั้น** (บังคับใน API)
4. หลาย root ได้ (Admin / Staff / Viewer เป็น root) — sub-role เช่น Manager แตกจาก Staff

---

## 3. Audit Logs + PDPA (พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล)

### Audit log
```prisma
model AuditLog {
  id         String   @id @default(uuid())
  userId     String?                    // ใครทำ
  action     String                     // create / update / delete / approve / send / login / export
  entity     String                     // sale, payment, customer, contract, ...
  entityId   String?
  summary    String   @db.VarChar(500)  // คำอธิบายอ่านง่าย (ภาษาไทย)
  changes    Json?                      // before/after เฉพาะ field ที่เปลี่ยน (masked)
  ipAddress  String?  @db.VarChar(45)
  createdAt  DateTime @default(now())
  @@index([entity, entityId])
  @@index([userId])
  @@index([createdAt])
}
```
- เก็บผ่าน helper `audit(req, {action, entity, ...})` เรียกในทุก service ที่เขียนข้อมูล
- หน้า UI: /settings/audit-logs (admin) — filter ตามผู้ใช้/ประเภท/ช่วงเวลา

### PDPA
- **Masking บนหน้าจอ**: เลขบัตรประชาชน `8-8935-****86-8-5`, เบอร์โทร `059-***-*856`
  แสดงเต็มเฉพาะผู้มีสิทธิ์ (role permission ใหม่: `view_pii`) + บันทึก audit ทุกครั้งที่กดดูเต็ม
- **Masking ใน audit log**: ค่า PII ใน `changes` ถูก mask ก่อนบันทึกเสมอ
- **Retention**: กำหนดอายุข้อมูล (ดูคำถาม) + cron ลบ/anonymize
- **สิทธิ์เจ้าของข้อมูล**: ปุ่ม export ข้อมูลลูกค้ารายคน (right to access)
  และ anonymize เมื่อสิ้นสุดความจำเป็น (right to erasure) โดยคงยอดการเงินไว้
- **Consent**: บันทึกการยินยอมตอนเก็บข้อมูลลูกค้าใหม่ (checkbox + timestamp)
  และหน้า privacy policy มีอยู่แล้ว → เพิ่มลิงก์ในฟอร์ม

### ✅ คำตอบที่ได้แล้ว (2026-07-20) — รอ implement
1. เก็บ audit log **1 ปี** เป็นค่าเริ่มต้น และ**ตั้งค่าได้** → setting `audit_retention_days` (default 365)
2. ข้อมูลลูกค้า**เก็บตลอดไป ไม่ลบอัตโนมัติ** — หากลบผ่านระบบ ต้อง lock ขั้นต่ำ **5 ปี**
   (น้อยกว่านั้นลบไม่ได้) และขั้นต่ำนี้**ตั้งค่าได้** → setting `customer_erasure_lock_years` (default 5)
3. เห็น PII เต็มเฉพาะผู้มีสิทธิ์ → ใช้ permission `customers.view_pii` จาก role tree
   (**มีใน matrix แล้ว** พร้อมใช้ทันทีที่ทำ masking)
4. Consent **บันทึกในระบบพอ** (checkbox + timestamp ตอนสร้างลูกค้า)

---

## ลำดับที่แนะนำ

1. **Role tree** ก่อน (audit + PDPA masking ต้องพึ่ง permission `view_pii`
   และเป็นการปิดช่องโหว่ security ที่ API ไม่เช็คสิทธิ์)
2. **Audit + PDPA** ต่อ (โครงสร้างพร้อมจาก role)
3. **ภาษาไทย + format settings** สุดท้าย (ไล่แปลทีละหน้า ไม่บล็อกงานอื่น)
