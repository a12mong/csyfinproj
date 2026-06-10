function formatCurrency(val: number) {
  return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2 }).format(val);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function generateInvoiceHtml(invoice: any): string {
  const customer = invoice.customer;
  const sale = invoice.sale;
  const motorcycle = sale?.motorcycle;
  const payment = invoice.payment;
  const contract = payment?.contract;

  let description = "";
  if (invoice.type === "motorcycle") {
    description = `ชำระค่าซื้อรถจักรยานยนต์ ${motorcycle?.brand || ""} ${motorcycle?.model || ""} (เงินสดเต็มจำนวน)`;
  } else if (invoice.type === "down_payment") {
    description = `ชำระเงินดาวน์รถจักรยานยนต์ ${motorcycle?.brand || ""} ${motorcycle?.model || ""}`;
  } else if (invoice.type === "installment") {
    description = `ชำระค่างวดรถจักรยานยนต์ สัญญาเลขที่ ${contract?.contractNumber || "—"}`;
    if (payment?.installmentId) {
      description += ` (งวดที่ผ่อนชำระ)`;
    }
  } else if (invoice.type === "commission") {
    description = `ค่าแนะนำการขาย/ค่าคอมมิชชั่น (Commission) - ${sale?.financeCompanyName || "สถาบันการเงิน"}`;
  } else if (invoice.type === "addon") {
    description = `ค่าบริการเสริม / อุปกรณ์ตกแต่ง (Add-on)`;
  } else {
    description = `ชำระค่าบริการ / สินค้า`;
  }

  if (motorcycle) {
    description += `<br/><span style="font-size: 11px; color: #555;">เลขตัวถัง: ${motorcycle.chassisNumber} | เลขเครื่องยนต์: ${motorcycle.engineNumber}</span>`;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>ใบกำกับภาษี / ใบเสร็จรับเงิน เลขที่ ${invoice.invoiceNumber}</title>
      <style>
        body { font-family: 'Sarabun', Arial, sans-serif; line-height: 1.5; color: #333; padding: 20px; max-width: 800px; margin: auto; font-size: 14px; }
        .header-table { width: 100%; border: none; margin-bottom: 20px; }
        .header-table td { border: none; padding: 0; }
        .company-info { width: 60%; }
        .doc-info { width: 40%; text-align: right; }
        .title { font-weight: bold; font-size: 20px; color: #000; margin-bottom: 5px; }
        .invoice-details { border: 1px solid #ccc; padding: 10px; border-radius: 5px; background-color: #f9f9f9; display: inline-block; text-align: left; }
        .section-title { font-size: 14px; font-weight: bold; margin-top: 15px; margin-bottom: 5px; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 15px; }
        .label { font-weight: bold; }
        table.item-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
        table.item-table th, table.item-table td { border: 1px solid #ccc; padding: 10px; }
        table.item-table th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
        .totals-table { width: 45%; margin-left: 55%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
        .totals-table td { padding: 6px 10px; border: 1px solid #ccc; }
        .totals-table td.label-cell { font-weight: bold; background-color: #f9f9f9; text-align: right; }
        .totals-table td.value-cell { text-align: right; font-weight: bold; }
        .signature-block { display: flex; justify-content: space-between; margin-top: 60px; page-break-inside: avoid; }
        .signature-col { text-align: center; width: 40%; }
        .sig-line { border-bottom: 1px dotted #333; margin: 40px auto 5px auto; width: 80%; }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #0284c7; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">พิมพ์เอกสาร (Print)</button>
      </div>

      <table class="header-table">
        <tr>
          <td class="company-info">
            <div style="font-weight: bold; font-size: 16px; color: #000;">ห้างหุ้นส่วนจำกัด ประเสริฐยนต์มหาราช (CSY)</div>
            <div style="font-size: 12px; color: #555; margin-top: 3px;">
              เลขประจำตัวผู้เสียภาษี: 0103567890123<br/>
              ที่อยู่: 123/45 ถนนมหาราช ตำบลในเมือง อำเภอเมือง จังหวัดนครศรีธรรมราช 80000<br/>
              โทรศัพท์: 075-345678, 081-2345678
            </div>
          </td>
          <td class="doc-info">
            <div class="title">ใบกำกับภาษี / ใบเสร็จรับเงิน</div>
            <div style="font-size: 12px; font-weight: bold; color: #555; margin-bottom: 8px;">TAX INVOICE / RECEIPT</div>
            <div class="invoice-details">
              <strong>เลขที่เอกสาร:</strong> ${invoice.invoiceNumber}<br/>
              <strong>วันที่ออกเอกสาร:</strong> ${formatDate(new Date(invoice.issuedAt))}
            </div>
          </td>
        </tr>
      </table>

      <div class="section-title">ข้อมูลลูกค้า (Customer Information)</div>
      <div class="info-grid">
        <div><span class="label">ชื่อลูกค้า:</span> ${customer.name}</div>
        <div><span class="label">เลขบัตรประชาชน / เลขผู้เสียภาษี:</span> ${customer.idCardNumber || "—"}</div>
        <div style="grid-column: span 2;"><span class="label">ที่อยู่:</span> ${customer.address || "—"}</div>
        <div><span class="label">เบอร์โทรศัพท์:</span> ${customer.phone}</div>
        <div><span class="label">ประเภทลูกค้า:</span> ${customer.type === "finance" ? "บริษัทการเงิน (Finance Company)" : "ลูกค้าทั่วไป (Personal)"}</div>
      </div>

      ${sale?.buyerCustomer && sale.buyerCustomer.id !== customer.id ? `
      <div class="section-title" style="margin-top: 10px;">ข้อมูลผู้เช่าซื้อ / ผู้ใช้รถ (End-Customer / Buyer)</div>
      <div class="info-grid">
        <div><span class="label">ชื่อลูกค้าจริง:</span> ${sale.buyerCustomer.name}</div>
        <div><span class="label">เลขบัตรประชาชน:</span> ${sale.buyerCustomer.idCardNumber || "—"}</div>
        <div style="grid-column: span 2;"><span class="label">ที่อยู่:</span> ${sale.buyerCustomer.address || "—"}</div>
        <div><span class="label">เบอร์โทรศัพท์:</span> ${sale.buyerCustomer.phone}</div>
      </div>
      ` : ""}

      <table class="item-table">
        <thead>
          <tr>
            <th style="width: 10%;">ลำดับ (No.)</th>
            <th style="width: 60%; text-align: left;">รายการรายละเอียด (Description)</th>
            <th style="width: 30%; text-align: right;">จำนวนเงินรวมสุทธิ (Amount)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center; vertical-align: top;">1</td>
            <td style="text-align: left; vertical-align: top; line-height: 1.6;">
              ${description}
            </td>
            <td style="text-align: right; vertical-align: top; font-weight: bold;">
              ${formatCurrency(Number(invoice.totalAmount))} บาท
            </td>
          </tr>
        </tbody>
      </table>

      <table class="totals-table">
        <tr>
          <td class="label-cell">มูลค่าก่อนภาษี (Amount Before VAT):</td>
          <td class="value-cell">${formatCurrency(Number(invoice.amount))} บาท</td>
        </tr>
        <tr>
          <td class="label-cell">ภาษีมูลค่าเพิ่ม (VAT 7%):</td>
          <td class="value-cell">${formatCurrency(Number(invoice.vatAmount))} บาท</td>
        </tr>
        <tr>
          <td class="label-cell" style="background-color: #e5e7eb;">ยอดสุทธิรวมภาษี (Net Total):</td>
          <td class="value-cell" style="background-color: #e5e7eb; color: #1e3a8a;">${formatCurrency(Number(invoice.totalAmount))} บาท</td>
        </tr>
      </table>

      <div class="signature-block">
        <div class="signature-col">
          <div class="sig-line"></div>
          <p>ลงชื่อ..........................................................ผู้จ่ายเงิน</p>
          <p>( ${customer.name} )</p>
        </div>
        <div class="signature-col">
          <div class="sig-line"></div>
          <p>ลงชื่อ..........................................................ผู้รับเงิน</p>
          <p>( ผู้มีอำนาจลงนาม หจก. ประเสริฐยนต์มหาราช )</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
