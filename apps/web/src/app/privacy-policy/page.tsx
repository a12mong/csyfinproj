"use client";

import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-150 overflow-hidden">
        {/* LINE green top strip */}
        <div className="h-2 w-full bg-[#06C755]" />
        
        <div className="p-8 sm:p-10 space-y-8">
          <div className="border-b border-gray-100 pb-6">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Privacy Policy</h1>
            <p className="text-sm text-gray-500 mt-2">นโยบายความเป็นส่วนตัวสำหรับระบบ csyfinproj</p>
            <p className="text-xs text-gray-400 mt-1">Effective Date: June 9, 2026</p>
          </div>

          <div className="space-y-6 text-sm leading-relaxed text-gray-650">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900">1. การเก็บรวบรวมข้อมูลส่วนบุคคล</h2>
              <p>
                ระบบ <strong>csyfinproj</strong> มีการเก็บรวบรวมและประมวลผลข้อมูลส่วนบุคคลเท่าที่จำเป็นเพื่อการให้บริการระบบจัดการเช่าซื้อรถจักรยานยนต์ โดยเมื่อท่านทำธุรกรรมกับเราและเลือกผูกบัญชี LINE ทางเราจะมีการจัดเก็บข้อมูลเพิ่มเติมดังนี้:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li><strong>LINE User ID:</strong> รหัสประจำตัวผู้ใช้ระบบ LINE ของท่าน (ซึ่งเป็นรหัสจำลองที่ถูกสร้างโดยระบบ LINE เพื่อใช้ระบุบัญชีเท่านั้น ไม่ใช่รหัสผ่านหรือเบอร์โทรศัพท์ของท่าน)</li>
                <li><strong>LINE Display Name & Avatar:</strong> ชื่อและรูปโปรไฟล์ที่แสดงบน LINE ของท่าน (ใช้เพื่อการแสดงผลในการยืนยันตัวตนก่อนการเชื่อมโยงข้อมูล)</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900">2. วัตถุประสงค์ในการใช้ข้อมูล</h2>
              <p>
                ข้อมูลส่วนบุคคลของท่านที่เชื่อมต่อผ่านระบบ LINE จะถูกนำมาใช้เพื่อวัตถุประสงค์ดังต่อไปนี้เท่านั้น:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li>ส่งข้อมูลแจ้งเตือนเมื่อถึงกำหนดชำระค่างวด (Installment Reminders)</li>
                <li>ส่งใบเสร็จรับเงินหรือการตอบรับการยืนยันชำระเงิน (Payment Receipts)</li>
                <li>ตรวจสอบการอัปโหลดสลิปหลักฐานการชำระเงินผ่านระบบ Webhook ของ LINE Official Account ของบริษัท</li>
                <li>แสดงสถานะและติดต่อประสานงานเกี่ยวกับสัญญาการเช่าซื้อของท่าน</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900">3. การรักษาความปลอดภัยของข้อมูล</h2>
              <p>
                เรามีมาตรการรักษาความมั่นคงปลอดภัยขั้นสูงเพื่อป้องกันไม่ให้ข้อมูลส่วนบุคคลของท่านสูญหาย ถูกนำไปใช้โดยมิชอบ หรือเข้าถึงโดยไม่ได้รับอนุญาต ข้อมูลทั้งหมดจะถูกส่งผ่านโปรโตคอลที่เข้ารหัส (HTTPS) และจัดเก็บในฐานข้อมูลที่มีระบบจำกัดสิทธิ์การเข้าถึงอย่างเข้มงวด
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900">4. การเปิดเผยข้อมูลแก่บุคคลภายนอก</h2>
              <p>
                เราจะไม่มีการขาย แลกเปลี่ยน หรือเปิดเผยข้อมูลส่วนบุคคลหรือ LINE User ID ของท่านให้กับบุคคลภายนอกที่ไม่เกี่ยวข้อง เว้นแต่เป็นการปฏิบัติตามกฎหมาย หรือได้รับการยินยอมอย่างเป็นลายลักษณ์อักษรจากท่านล่วงหน้า
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900">5. สิทธิ์ของเจ้าของข้อมูลส่วนบุคคล</h2>
              <p>
                ท่านมีสิทธิ์ในการยกเลิกการเชื่อมต่อบัญชี LINE ของท่านออกจากระบบ <strong>csyfinproj</strong> ได้ตลอดเวลา โดยการกดปุ่ม <strong>&quot;ยกเลิกการเชื่อมต่อ&quot;</strong> ที่หน้าประวัติข้อมูลลูกค้าของท่านบนระบบ หรือติดต่อเจ้าหน้าที่ของบริษัทเพื่อให้ลบข้อมูลการเชื่อมโยงระบบออก
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900">6. ข้อมูลผู้ควบคุมข้อมูลส่วนบุคคล (Contact Us)</h2>
              <p>
                หากท่านมีข้อสงสัยเกี่ยวกับนโยบายความเป็นส่วนตัวนี้ หรือมีความประสงค์ที่จะใช้สิทธิ์เกี่ยวกับข้อมูลส่วนบุคคลของท่าน สามารถติดต่อได้ที่:
              </p>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs space-y-1 text-gray-600">
                <p><strong>csyfinproj System Admin</strong></p>
                <p>Email: admin@sourcedev.app</p>
                <p>LINE Official Account: @csyfinproj (บอทจำลองเพื่อการพัฒนา)</p>
              </div>
            </section>
          </div>

          <div className="border-t border-gray-100 pt-6 flex justify-between items-center text-xs text-gray-400">
            <span>&copy; {new Date().getFullYear()} csyfinproj. All rights reserved.</span>
            <Link href="/terms-of-use" className="text-primary-600 hover:underline">
              Terms of Use
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
