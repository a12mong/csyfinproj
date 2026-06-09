# CSY Fin DB Reader MCP Server

MCP server สำหรับเชื่อมต่อฐานข้อมูล MySQL ของโปรเจกต์ csyfinproj โดยอนุญาตเฉพาะคำสั่งอ่านข้อมูลแบบ Read-only (`SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN`, `WITH`) เพื่อความปลอดภัย โดยจะโหลดการตั้งค่าเชื่อมต่อฐานข้อมูล (Database Credentials) จากไฟล์ `apps/api/.env` ให้โดยอัตโนมัติ

## การทำงาน
- ใช้ `@modelcontextprotocol/sdk` ของ Anthropic
- เชื่อมต่อผ่าน Standard Input/Output (stdio)
- มีเครื่องมือ (tool) ชื่อ `query_select` สำหรับใช้สืบค้นข้อมูล
- มีระบบตรวจสอบ Query เพื่อป้องกันการแก้ไขข้อมูล (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER` ฯลฯ จะถูกบล็อกทั้งหมด)

---

## วิธีตั้งค่าใน Cursor / Claude Desktop

สามารถเรียกใช้งานได้ 2 แบบ (แนะนำการใช้ `tsx` โดยไม่ต้องคอมไพล์)

### 1. การตั้งค่าใน Cursor

1. เปิด **Cursor Settings** (สัญลักษณ์ฟันเฟืองมุมบนขวา หรือกด `Cmd + ,` บน macOS)
2. ไปที่เมนู **Features** -> **MCP**
3. คลิกปุ่ม **+ Add New MCP Server**
4. กรอกข้อมูลดังนี้:
   - **Name**: `csyfin-db-reader`
   - **Type**: `command`
   - **Command**:
     ```bash
     npx tsx /Users/a12mong/Documents/_site/SourceDev/paperclipproj/csyfinproj/apps/mcp-server/src/index.ts
     ```
5. คลิก **Save**

---

### 2. การตั้งค่าใน Claude Desktop

1. เปิดไฟล์ตั้งค่าของ Claude Desktop (บน macOS อยู่ที่ `~/Library/Application Support/Claude/claude_desktop_config.json`)
2. เพิ่มการตั้งค่านี้ในส่วนของ `mcpServers`:

```json
{
  "mcpServers": {
    "csyfin-db-reader": {
      "command": "npx",
      "args": [
        "tsx",
        "/Users/a12mong/Documents/_site/SourceDev/paperclipproj/csyfinproj/apps/mcp-server/src/index.ts"
      ]
    }
  }
}
```

3. รีสตาร์ทโปรแกรม Claude Desktop

---

## คำสั่งพัฒนา/ทดสอบระบบ

### การคอมไพล์โปรเจกต์ (Build)
```bash
pnpm --filter @csyfinproj/mcp-server build
```

### การรันตัวทดสอบความปลอดภัยและการเชื่อมต่อ (Test Connection)
```bash
pnpm --filter @csyfinproj/mcp-server exec tsx src/test-query.ts
```
