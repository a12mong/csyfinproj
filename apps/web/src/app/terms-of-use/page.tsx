"use client";

import Link from "next/link";

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-150 overflow-hidden">
        {/* LINE green top strip */}
        <div className="h-2 w-full bg-[#06C755]" />
        
        <div className="p-8 sm:p-10 space-y-8">
          <div className="border-b border-gray-100 pb-6">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Terms of Use</h1>
            <p className="text-sm text-gray-500 mt-2">เงื่อนไขการใช้บริการระบบ csyfinproj</p>
            <p className="text-xs text-gray-400 mt-1">Last Updated: June 9, 2026</p>
          </div>

          <div className="space-y-6 text-sm leading-relaxed text-gray-650">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900">1. การยอมรับเงื่อนไขการใช้บริการ</h2>
              <p>
                การเข้าถึงและใช้งานระบบเชื่อมโยงบัญชี LINE ของ <strong>csyfinproj</strong> ย่อมถือว่าท่านตกลงที่จะผูกพันตนเองตามข้อตกลงและเงื่อนไขการให้บริการฉบับนี้โดยไม่มีข้อจำกัดใด ๆ หากท่านไม่ยินยอมตามเงื่อนไข กรุณางดเชื่อมต่อบัญชีของท่านผ่านหน้านี้
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900">2. รายละเอียดบริการแจ้งเตือนผ่าน LINE</h2>
              <p>
                ระบบเชื่อมต่อข้อมูลนี้จัดตั้งขึ้นเพื่ออำนวยความสะดวกให้แก่ลูกค้าเช่าซื้อของระบบดังนี้:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li>การแจ้งเตือนยอดค่างวดที่ครบกำหนดชำระผ่านทางการส่งข้อความเข้าสู่ LINE ของลูกค้าโดยตรง</li>
                <li>การให้สิทธิ์ระบบในการรับสลิปหลักฐานการโอนเงิน (Image Slip) ที่ท่านส่งเข้าแชทบอท เพื่อนำมาประมวลผลตัดยอดชำระอัตโนมัติในฐานข้อมูลระบบเช่าซื้อ</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900">3. ความรับผิดชอบของลูกค้า</h2>
              <p>
                ท่านมีหน้าที่ความรับผิดชอบในการรักษาความปลอดภัยของบัญชี LINE ส่วนตัวของท่าน ระบบจะไม่รับผิดชอบต่อความเสียหายใด ๆ ที่เกิดขึ้นจากการที่ผู้อื่นเข้าถึงบัญชี LINE ของท่าน หรือการรับข้อมูลแทนท่านในกรณีที่มีการใช้งานโทรศัพท์มือถือร่วมกันหรือไม่ได้ล็อกระบบ
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900">4. ข้อจำกัดความรับผิดชอบ</h2>
              <p>
                ระบบการแจ้งเตือนค่างวดเป็นเพียงช่องทางเสริมทางเลือกเพื่อความสะดวกเท่านั้น ความล่าช้า ขัดข้อง หรือการทำงานผิดพลาดของระบบอินเทอร์เน็ต เครือข่ายโทรศัพท์ หรือ LINE Server ซึ่งส่งผลให้การแจ้งเตือนไม่ไปถึงท่าน จะไม่ถือเป็นเหตุผลในการปฏิเสธการชำระเงินล่าช้า หรือยกเว้นค่าปรับตามเงื่อนไขสัญญาเช่าซื้อเดิมที่ท่านทำไว้กับบริษัท
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-gray-900">5. การระงับและขัดข้องของบริการ</h2>
              <p>
                บริษัทขอสงวนสิทธิ์ในการปรับปรุง เปลี่ยนแปลง หรือระงับการให้บริการเชื่อมโยง LINE นี้ได้ตลอดเวลาโดยไม่ต้องแจ้งให้ทราบล่วงหน้า และท่านมีสิทธิ์ตัดการเชื่อมโยงระบบของท่านเองได้ทันทีโดยไม่มีข้อผูกมัดทางกฎหมายใด ๆ
              </p>
            </section>
          </div>

          <div className="border-t border-gray-100 pt-6 flex justify-between items-center text-xs text-gray-400">
            <span>&copy; {new Date().getFullYear()} csyfinproj. All rights reserved.</span>
            <Link href="/privacy-policy" className="text-primary-600 hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
