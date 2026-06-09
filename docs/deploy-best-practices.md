# Best Practices for Building and Deploying CSY Fin Project

เอกสารแนะนำแนวทางปฏิบัติที่ดีที่สุด (Best Practices) ในการสร้าง (Build) และติดตั้ง (Deploy) ระบบ CSY Fin Project บน Server/Cloud (เช่น Render.com, Vercel) เพื่อหลีกเลี่ยงข้อผิดพลาดทั่วไป

---

## 1. ปัญหาการค้นหาโมดูล Prisma ไม่พบ (Cannot find module / namespace 'Prisma' has no exported member 'Decimal')

### สาเหตุของปัญหา
ในโครงสร้างของ TypeScript และ Prisma:
1. ตัว `@prisma/client` จะเก็บประเภทข้อมูล (Typings) ที่สร้างขึ้นมาใหม่แบบ Dynamic ตามโครงสร้างฐานข้อมูลในไฟล์ `schema.prisma`
2. หากเซิร์ฟเวอร์รันตัวตรวจสอบโค้ด (`tsc`) หรือทำการคอมไพล์ **ก่อน** ที่คำสั่ง `prisma generate` จะทำงาน:
   - TypeScript Compiler จะมองไม่เห็นโมดูล `@prisma/client` หรือมองเห็นเฉพาะค่าเริ่มต้นที่ยังว่างเปล่า
   - ส่งผลให้เกิดข้อผิดพลาด `implicitly has an 'any' type` หรือ `Namespace 'Prisma' has no exported member 'Decimal'`

### แนวทางปฏิบัติที่ดีที่สุด (Best Practice)
ต้องรันคำสั่งเพื่อสร้าง Client ของ Prisma เสมอ **ก่อนที่จะเริ่มคำสั่งคอมไพล์โค้ด (`tsc`)** โดยปรับตั้งค่าที่ `package.json` ของฝั่ง API:

```json
"scripts": {
  "build": "prisma generate && tsc"
}
```

เมื่อใช้บริการอย่าง Render.com และรันคำสั่ง `pnpm build --filter=@csyfinproj/api` ตัวระบบจะสร้าง Types ของ Prisma ขึ้นมาก่อน แล้วจึงทำการ Compile TypeScript ทำให้ไม่เกิดข้อผิดพลาดข้างต้น

---

## 2. การกำหนดคำสั่งสำหรับติดตั้ง (Build & Start Commands) ใน Monorepo

สำหรับการใช้เครื่องมือจัดการโครงการแบบ Monorepo (pnpm workspaces + Turborepo) ให้ใช้การระบุ `--filter` เพื่อจำกัดขอบเขตของแอปพลิเคชันอย่างชัดเจน

### สำหรับ Backend (Express API - เช่น Render.com / Koyeb)
- **Build Command**:
  ```bash
  pnpm install && pnpm build --filter=@csyfinproj/api
  ```
  *(จะทำการลงทะเบียน Module ทั้งหมดของ Workspace และเรียกสคริปต์ `build` ของ API ซึ่งเราเปลี่ยนไปรัน `prisma generate && tsc` ไว้แล้ว)*
- **Start Command**:
  ```bash
  pnpm --filter=@csyfinproj/api start
  ```

### สำหรับ Frontend (Next.js - เช่น Vercel)
- **Root Directory**: เลือกไปที่ `apps/web`
- **Build Command**: (รันในโฟลเดอร์ `apps/web` ได้โดยตรง)
  ```bash
  pnpm build
  ```

---

## 3. ลำดับการตั้งค่าสิ่งแวดล้อม (Environment Variables Workflow)

1. **Deploy Backend เป็นอันดับแรก**: เพื่อให้ได้โดเมนเนมหรือ URL ของ API ก่อน (เช่น `https://csyfin-api.onrender.com`)
2. **Deploy Frontend เป็นอันดับที่สอง**: โดยนำ URL ของ Backend ที่ได้จากข้อ 1 ไประบุเป็นตัวแปรสิ่งแวดล้อม:
   - `NEXT_PUBLIC_API_URL` = `https://csyfin-api.onrender.com`
3. **อนุญาต CORS สำหรับ Frontend**: นำโดเมนของ Frontend ที่ได้จาก Vercel (เช่น `https://csyfin-web.vercel.app`) ย้อนกลับมาเพิ่มในตัวแปรสิ่งแวดล้อมของ Backend:
   - `CORS_ORIGIN` = `https://csyfin-web.vercel.app` (หากมีหลายโดเมน ให้คั่นด้วยเครื่องหมายจุลภาค `,`)
   - อย่าลืมรีสตาร์ทหรือ Deploy Backend อีกครั้งเพื่อให้การเปลี่ยนค่าส่งผล
