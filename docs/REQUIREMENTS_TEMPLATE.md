# Screen Requirements Template (แบบฟอร์มเก็บ Requirement รายหน้าจอ)

Use one copy of this template per operation screen before it is redesigned/re-coded.
Copy the block below into `docs/requirements/<screen-name>.md` and fill it in.

---

## Template

```markdown
# Screen: <name> (<route, e.g. /sales>)

## 1. Purpose (จุดประสงค์)
- Who uses this screen (role: admin / staff / viewer)?
- What is the ONE main job this screen must accomplish?
- How often is it used (daily / per-sale / month-end)?

## 2. Entry points (เข้าหน้านี้จากไหน)
- Menu, link from another screen, LINE message, printed doc, etc.

## 3. Current behavior vs. desired (ปัจจุบัน vs ที่ต้องการ)
| # | Current behavior | Keep / Change / Remove | Desired behavior |
|---|------------------|------------------------|------------------|
| 1 |                  |                        |                  |

## 4. Workflow steps (ขั้นตอนการทำงานจริงที่หน้าร้าน)
Describe the real-world process step by step, including paper documents,
who approves what, and what happens when something goes wrong mid-way.
1. ...
2. ...

## 5. Data & fields (ข้อมูลที่ต้องกรอก)
| Field | Required? | Source (typed / scanned / auto) | Validation rule | Notes |
|-------|-----------|--------------------------------|-----------------|-------|

## 6. Business rules (กฎทางธุรกิจ)
- Pricing / interest / VAT rules, rounding rules
- What must NOT be allowed (e.g. sell a reserved bike, pay more than balance)
- Status transitions: which statuses exist, who can change them, in what order

## 7. Permissions (สิทธิ์การใช้งาน)
| Action | Admin | Staff | Viewer |
|--------|-------|-------|--------|
| View   |       |       |        |
| Create |       |       |        |
| Edit   |       |       |        |
| Delete/Cancel |  |     |        |

## 8. Documents & printing (เอกสารที่ต้องพิมพ์)
- Which documents does this screen produce (receipt, tax invoice, contract, GRN)?
- Attach a photo/scan of the real paper form currently in use.

## 9. Integrations (ระบบภายนอก)
- LINE messages sent/received on this screen? Content and timing?
- Bank slips, external finance company documents?

## 10. Reports & search (รายงานและการค้นหา)
- What does the owner/manager need to look up from this screen's data?
- Filters, date ranges, export to Excel?

## 11. Edge cases (กรณีพิเศษ)
- Refunds, cancellations, partial payments, customer disputes,
  data entry mistakes and how they are corrected today.

## 12. Acceptance criteria (เกณฑ์ตรวจรับ)
- "This screen is DONE when ..." (3–5 testable statements)

## 13. Priority & phase
- Must-have for daily operation / Nice-to-have / Later
```

---

## Screens that need requirements from the owner (รายการหน้าจอที่ต้องเก็บ requirement เพิ่ม)

Priority order, with the specific open questions found during code analysis:

### 1. Sales — new sale wizard (`/sales`)
- The 3 payment methods (cash / installment / finance company): does the current
  5-step wizard match the real front-desk process?
- Dual-customer (invoice customer vs. buyer): when exactly is this used?
- Down payment: fixed amounts, percentage presets, or free entry?
- Commission from finance companies: how is it calculated and who records it?
- What paper documents are produced at the moment of sale?

### 2. Payments — record & verify (`/payments`)
- Who records payments vs. who verifies them (two different people)?
- Real payment channels used (cash / bank transfer / LINE / PromptPay?)
- Partial payments and overpayment: how should they be applied?
- When is a tax invoice issued vs. a simple receipt?
- Slip verification: what does the verifier actually check?

### 3. Finance / collections (`/finance`)
- Definition of "overdue": how many days after due date? grace period?
- Late fees / penalties: are they charged? How calculated?
- Reminder policy: when to send LINE reminders (X days before/after due)?
- What does the daily/monthly collection report need to show the owner?
- Repossession / default process: at what point, and what happens in the system?

### 4. Contracts (`/contracts`)
- Is the printed hire-purchase contract text legally reviewed / final?
- Interest: confirm declining-balance EMI is correct (seed data uses flat rate —
  which one is the real business rule?)
- Contract closing: early payoff discount rules?
- Guarantor (ผู้ค้ำประกัน): needed? Currently not in the data model.

### 5. Receiving / GRN (`/receiving`)
- Supplier list: free text today — should suppliers be a managed master list?
- Parts/accessories pricing: auto price = cost × 1.25 today — is that the real rule?
- Who verifies a delivery note, and can a verified note be corrected?

### 6. Dashboard (`/`)
- Which KPIs does the owner actually want to see first each morning?

### 7. Notifications / LINE (`/settings/line`)
- Greeting / reminder / confirmation message wording (Thai) — final text needed.
- SMS and email are stubs today: are they actually needed, or LINE-only?
