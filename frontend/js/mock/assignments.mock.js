/**
 * Mock data for the Assignments & Courses page.
 * Due dates are generated relative to "now" so every demo run shows
 * a realistic mix of overdue / due today / upcoming / submitted tasks.
 */

function at(dayOffset, hour = 23, minute = 59) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function buildMockAssignments() {
  return [
    {
      id: 'm-1',
      platform: 'google',
      courseCode: '06016301',
      course: 'การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น',
      title: 'ใบงานที่ 1 - คำนวณเกรดอัตโนมัติ',
      description:
        'ให้นักศึกษาพัฒนาโปรแกรม คำนวณเกรดอัตโนมัติ โดยรับคะแนนจากผู้ใช้และแสดงผลเกรดตามเกณฑ์ที่กำหนด',
      todo: [
        'รับชื่อผู้เรียน',
        'รับคะแนน (0-100)',
        'ตรวจสอบความถูกต้องของคะแนน',
        'คำนวณเกรด',
        'แสดงผลลัพธ์อย่างสวยงาม',
      ],
      requirements: [
        'ไฟล์ Source Code',
        'ภาพหน้าจอผลการทำงานอย่างน้อย 2 กรณี (คะแนนผ่าน / ไม่ผ่าน)',
        'ไฟล์รายงาน PDF จำนวน 1 หน้า อธิบายหลักการทำงาน ตัวแปรที่ใช้ และปัญหาที่พบ',
      ],
      due: at(3),
      status: 'pending',
      url: 'https://classroom.google.com/',
    },
    {
      id: 'm-2',
      platform: 'google',
      courseCode: '06016312',
      course: 'ฐานข้อมูลสำหรับงานเทคโนโลยีสารสนเทศ',
      title: 'ใบงานที่ 2 - ออกแบบฐานข้อมูลระบบองค์กร',
      description: 'ให้นักศึกษาพัฒนาระบบฐานข้อมูลสำหรับงานเทคโนโลยีสารสนเทศในองค์กร',
      todo: ['วิเคราะห์ความต้องการ', 'วาด ER Diagram', 'สร้างตารางด้วย SQL'],
      requirements: ['ไฟล์ ER Diagram (PNG/PDF)', 'ไฟล์ SQL สำหรับสร้างตาราง'],
      due: at(0),
      status: 'pending',
      url: 'https://classroom.google.com/',
    },
    {
      id: 'm-3',
      platform: 'microsoft',
      courseCode: '06016325',
      course: 'การออกแบบและพัฒนาเว็บไซต์',
      title: 'ใบงานที่ 1 - UI/UX และ Prototype',
      description:
        'ให้นักศึกษาเลือกหัวข้อเว็บไซต์ที่สนใจหรือต้องการพัฒนา (เช่น เว็บไซต์ร้านค้า, พอร์ตโฟลิโอ, เว็บไซต์ข่าวสาร) หากยังนึกไม่ออก ครูมีตัวอย่างหัวข้อให้เลือกท้ายใบงานนี้',
      todo: [],
      requirements: ['ลิงก์ Prototype (Figma)'],
      due: at(4),
      status: 'pending',
      url: 'https://teams.microsoft.com/',
    },
    {
      id: 'm-4',
      platform: 'microsoft',
      courseCode: '06016325',
      course: 'การออกแบบและพัฒนาเว็บไซต์',
      title: 'แบบฝึกหัด HTML/CSS เบื้องต้น',
      description: 'สร้างหน้าเว็บส่วนตัว 1 หน้า ด้วย HTML และ CSS',
      todo: ['ใช้ semantic tags', 'จัดวางด้วย Flexbox'],
      requirements: ['ไฟล์ .html และ .css'],
      due: at(-2),
      status: 'pending',
      url: 'https://teams.microsoft.com/',
    },
    {
      id: 'm-5',
      platform: 'google',
      courseCode: '06016301',
      course: 'การเขียนโปรแกรมคอมพิวเตอร์เบื้องต้น',
      title: 'แบบฝึกหัด Loop และ Array',
      description: 'ทำแบบฝึกหัดท้ายบท 5 ข้อ',
      todo: [],
      requirements: ['ไฟล์ Source Code'],
      due: at(-5),
      status: 'submitted',
      url: 'https://classroom.google.com/',
    },
    {
      id: 'm-6',
      platform: 'google',
      courseCode: '06016312',
      course: 'ฐานข้อมูลสำหรับงานเทคโนโลยีสารสนเทศ',
      title: 'ใบงานที่ 1 - แนวคิดฐานข้อมูลเชิงสัมพันธ์',
      description: 'สรุปแนวคิดฐานข้อมูลเชิงสัมพันธ์ความยาว 1 หน้ากระดาษ',
      todo: [],
      requirements: ['ไฟล์ PDF'],
      due: at(-9),
      status: 'submitted',
      url: 'https://classroom.google.com/',
    },
  ];
}
