function formatCurrency(val: number) {
  return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2 }).format(val);
}

function formatDate(date: Date) {
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function generateCoverPageHtml(contract: any): string {
  const customer = contract.customer;
  const saleLink = contract.contractSales?.[0];
  const sale = saleLink?.sale;
  const motorcycle = sale?.motorcycle;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>ใบปะหน้าสัญญา เลขที่ ${contract.contractNumber}</title>
      <style>
        body { font-family: 'Sarabun', Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; max-width: 800px; margin: auto; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
        .header h1 { margin: 0; font-size: 24px; color: #000; }
        .header p { margin: 5px 0 0 0; font-size: 14px; }
        .section-title { font-size: 16px; font-weight: bold; background-color: #f2f2f2; padding: 5px 10px; margin-top: 20px; border-left: 4px solid #333; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
        .label { font-weight: bold; }
        .value { color: #555; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #ccc; padding-top: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f9f9f9; font-weight: bold; }
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

      <div class="header">
        <h1>ใบปะหน้าสัญญาเช่าซื้อรถจักรยานยนต์</h1>
        <p>ห้างหุ้นส่วนจำกัด ประเสริฐยนต์มหาราช (CSY)</p>
        <p>เลขที่สัญญา: ${contract.contractNumber} | วันที่ทำสัญญา: ${formatDate(new Date(contract.startDate))}</p>
      </div>

      <div class="section-title">ข้อมูลลูกค้า (ผู้เช่าซื้อ)</div>
      <div class="grid">
        <div><span class="label">ชื่อ-นามสกุล:</span> <span class="value">${customer.name}</span></div>
        <div><span class="label">เลขบัตรประชาชน:</span> <span class="value">${customer.idCardNumber}</span></div>
        <div style="grid-column: span 2;"><span class="label">ที่อยู่:</span> <span class="value">${customer.address || "-"}</span></div>
        <div><span class="label">เบอร์โทรศัพท์:</span> <span class="value">${customer.phone}</span></div>
        <div><span class="label">อีเมล:</span> <span class="value">${customer.email || "-"}</span></div>
      </div>

      <div class="section-title">รายละเอียดรถจักรยานยนต์ที่เช่าซื้อ</div>
      ${motorcycle ? `
      <div class="grid">
        <div><span class="label">ยี่ห้อ:</span> <span class="value">${motorcycle.brand}</span></div>
        <div><span class="label">รุ่น:</span> <span class="value">${motorcycle.model}</span></div>
        <div><span class="label">ปี:</span> <span class="value">${motorcycle.year}</span></div>
        <div><span class="label">สี:</span> <span class="value">${motorcycle.color}</span></div>
        <div><span class="label">เลขตัวถัง (Chassis #):</span> <span class="value">${motorcycle.chassisNumber}</span></div>
        <div><span class="label">เลขเครื่องยนต์ (Engine #):</span> <span class="value">${motorcycle.engineNumber}</span></div>
      </div>
      ` : `<p style="color: red;">ไม่พบข้อมูลตัวรถในระบบสัญญา</p>`}

      <div class="section-title">เงื่อนไขการชำระเงินและค่างวด</div>
      <div class="grid">
        <div><span class="label">ราคารถเงินสดเต็มจำนวน:</span> <span class="value">${sale ? formatCurrency(Number(sale.totalPrice)) : "-"} บาท</span></div>
        <div><span class="label">เงินดาวน์ชำระแล้ว:</span> <span class="value">${sale ? formatCurrency(Number(sale.downPayment)) : "-"} บาท</span></div>
        <div><span class="label">ยอดจัดเช่าซื้อ (เงินต้น):</span> <span class="value">${formatCurrency(Number(contract.totalPrincipal))} บาท</span></div>
        <div><span class="label">อัตราดอกเบี้ย:</span> <span class="value">${Number(contract.interestRate).toFixed(2)}% ต่อปี</span></div>
        <div><span class="label">จำนวนงวดผ่อนชำระ:</span> <span class="value">${contract.numInstallments} งวด</span></div>
        <div><span class="label">ระยะเวลาผ่อนชำระ:</span> <span class="value">${contract.numInstallments} เดือน</span></div>
        <div><span class="label">ค่างวดต่อเดือน:</span> <span class="value">${contract.installments?.[0] ? formatCurrency(Number(contract.installments[0].amountDue)) : "-"} บาท</span></div>
        <div><span class="label">ยอดชำระรวมดอกเบี้ย:</span> <span class="value">${formatCurrency(Number(contract.totalAmount))} บาท</span></div>
      </div>

      <div class="footer">
        <p>ห้างหุ้นส่วนจำกัด ประเสริฐยนต์มหาราช (CSY)</p>
      </div>
    </body>
    </html>
  `;
}

export function generateFullAgreementHtml(contract: any): string {
  const customer = contract.customer;
  const saleLink = contract.contractSales?.[0];
  const sale = saleLink?.sale;
  const motorcycle = sale?.motorcycle;

  const installmentRows = contract.installments?.map((inst: any) => `
    <tr>
      <td style="text-align: center;">${inst.installmentNumber}</td>
      <td style="text-align: center;">${formatDate(new Date(inst.dueDate))}</td>
      <td style="text-align: right;">${formatCurrency(Number(inst.amountDue))} บาท</td>
      <td style="text-align: right;">${formatCurrency(Number(inst.principalPortion))} บาท</td>
      <td style="text-align: right;">${formatCurrency(Number(inst.interestPortion))} บาท</td>
      <td style="text-align: right;">${formatCurrency(Number(inst.remainingBalance))} บาท</td>
    </tr>
  `).join("") ?? "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>สัญญาเช่าซื้อ เลขที่ ${contract.contractNumber}</title>
      <style>
        body { font-family: 'Sarabun', Arial, sans-serif; line-height: 1.5; color: #000; padding: 20px; max-width: 800px; margin: auto; font-size: 14px; }
        .title { text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 20px; }
        .section-text { text-indent: 2.5em; margin-bottom: 10px; text-align: justify; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
        th, td { border: 1px solid #000; padding: 6px; text-align: left; }
        th { background-color: #f2f2f2; text-align: center; }
        .signature-block { display: flex; justify-content: space-between; margin-top: 50px; page-break-inside: avoid; }
        .signature-col { text-align: center; width: 45%; }
        .sig-line { border-bottom: 1px dotted #000; margin: 30px auto 5px auto; width: 80%; }
        .page-break { page-break-after: always; }
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

      <div class="title">หนังสือสัญญาเช่าซื้อรถจักรยานยนต์</div>
      
      <p style="text-align: right;">ทำที่: หจก. ประเสริฐยนต์มหาราช (CSY)</p>
      <p style="text-align: right;">วันที่: ${formatDate(new Date(contract.startDate))}</p>

      <div class="section-text">
        สัญญาฉบับนี้ทำขึ้นระหว่าง <strong>ห้างหุ้นส่วนจำกัด ประเสริฐยนต์มหาราช (CSY)</strong> สำนักงานตั้งอยู่เลขที่... ซึ่งต่อไปในสัญญานี้จะเรียกว่า <strong>"ผู้ให้เช่าซื้อ"</strong> ฝ่ายหนึ่ง กับ <strong>คุณ ${customer.name}</strong> ถือบัตรประจำตัวประชาชนเลขที่ ${customer.idCardNumber} อยู่บ้านเลขที่ ${customer.address || "..."} ซึ่งต่อไปในสัญญานี้จะเรียกว่า <strong>"ผู้เช่าซื้อ"</strong> อีกฝ่ายหนึ่ง ทั้งสองฝ่ายได้ตกลงทำสัญญากันดังมีข้อความต่อไปนี้:
      </div>

      <div class="section-text">
        <strong>ข้อ 1. รายละเอียดทรัพย์สิน:</strong> ผู้ให้เช่าซื้อตกลงให้เช่าซื้อและผู้เช่าซื้อตกลงเช่าซื้อรถจักรยานยนต์ ยี่ห้อ <strong>${motorcycle?.brand || "-"}</strong> รุ่น <strong>${motorcycle?.model || "-"}</strong> หมายเลขตัวถัง <strong>${motorcycle?.chassisNumber || "-"}</strong> หมายเลขเครื่องยนต์ <strong>${motorcycle?.engineNumber || "-"}</strong> สี <strong>${motorcycle?.color || "-"}</strong>
      </div>

      <div class="section-text">
        <strong>ข้อ 2. มูลค่าสัญญาและการชำระเงิน:</strong> คู่สัญญาตกลงราคาเช่าซื้อทรัพย์สินเป็นจำนวนเงินรวมทั้งสิ้น <strong>${formatCurrency(Number(contract.totalAmount))} บาท</strong> โดยผู้เช่าซื้อได้ชำระเงินดาวน์ไว้ในวันทำสัญญานี้จำนวน <strong>${sale ? formatCurrency(Number(sale.downPayment)) : "-"} บาท</strong> และตกลงจะชำระยอดจัดเช่าซื้อที่เหลือจำนวน <strong>${formatCurrency(Number(contract.totalPrincipal))} บาท</strong> พร้อมดอกเบี้ยเป็นงวดๆ ทั้งหมด <strong>${contract.numInstallments} งวด</strong> ค่างวดละ <strong>${contract.installments?.[0] ? formatCurrency(Number(contract.installments[0].amountDue)) : "-"} บาท</strong> ตามรายละเอียดตารางท้ายสัญญานี้
      </div>

      <div class="section-text">
        <strong>ข้อ 3. การโอนกรรมสิทธิ์:</strong> กรรมสิทธิ์ในทรัพย์สินที่เช่าซื้อนี้ยังคงเป็นของผู้ให้เช่าซื้อจนกว่าผู้เช่าซื้อจะได้ชำระเงินค่าเช่าซื้อจนครบถ้วนตามสัญญาและปฏิบัติตามเงื่อนไขในสัญญานี้ครบทุกประการแล้ว ผู้ให้เช่าซื้อจึงจะโอนกรรมสิทธิ์ให้แก่ผู้เช่าซื้อ
      </div>

      <div class="section-text">
        <strong>ข้อ 4. การผิดนัดชำระสัญญา:</strong> หากผู้เช่าซื้อผิดนัดชำระค่าเช่าซื้อสามงวดติดต่อกัน หรือละเมิดเงื่อนไขใดๆ ในสัญญานี้ ผู้ให้เช่าซื้อมีสิทธิ์ที่จะบอกเลิกสัญญาเช่าซื้อและเข้าครอบครองทรัพย์สินกลับคืนมาได้ทันที
      </div>

      <div class="page-break"></div>

      <div class="title" style="margin-top: 20px;">ตารางกำหนดการชำระค่างวด (Payment Schedule)</div>
      <table>
        <thead>
          <tr>
            <th>งวดที่</th>
            <th>วันครบกำหนด</th>
            <th>ยอดที่ต้องชำระ</th>
            <th>ส่วนของเงินต้น</th>
            <th>ส่วนของดอกเบี้ย</th>
            <th>ยอดเงินคงเหลือ</th>
          </tr>
        </thead>
        <tbody>
          ${installmentRows}
        </tbody>
      </table>

      <div class="signature-block">
        <div class="signature-col">
          <div class="sig-line"></div>
          <p>ลงชื่อ..........................................................ผู้เช่าซื้อ</p>
          <p>( คุณ ${customer.name} )</p>
        </div>
        <div class="signature-col">
          <div class="sig-line"></div>
          <p>ลงชื่อ..........................................................ผู้ให้เช่าซื้อ</p>
          <p>( หจก. ประเสริฐยนต์มหาราช (CSY) )</p>
        </div>
      </div>

      <div class="signature-block" style="margin-top: 30px;">
        <div class="signature-col">
          <div class="sig-line"></div>
          <p>ลงชื่อ..........................................................พยาน</p>
          <p>(..........................................................)</p>
        </div>
        <div class="signature-col">
          <div class="sig-line"></div>
          <p>ลงชื่อ..........................................................พยาน</p>
          <p>(..........................................................)</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
