// ข้อมูลการมอบหมายงาน โดยเพิ่ม bell: true ให้กับวันที่ 27 และ 28
let tasksData = {
  "2026-07-21": {
    displayTitle: "การส่งงานวันที่ 24 กรกฎาคม 2569",
    tasks: [{ id: 1, title: "การบ้าน คณิตศาสตร์", status: "pending", style: "yellow", bell: true }]
  },
  "2026-07-24": {
    displayTitle: "การส่งงานวันที่ 24 กรกฎาคม 2569",
    tasks: [{ id: 2, title: "ส่งรายงาน รายวิชาภาษาไทย", status: "pending", style: "red", bell: true }]
  },
  "2026-07-25": {
    displayTitle: "การส่งงานวันที่ 28 กรกฎาคม 2569",
    tasks: [{ id: 3, title: "แบบฝึกหัด ฟิสิกส์", status: "pending", style: "yellow", bell: true }]
  },
  "2026-07-27": {
    displayTitle: "การส่งงานวันที่ 27 กรกฎาคม 2569",
    tasks: [{ id: 4, title: "การบ้าน เคมี", status: "pending", style: "red", bell: true }]
  },
  "2026-07-28": {
    displayTitle: "การส่งงานวันที่ 28 กรกฎาคม 2569",
    tasks: [{ id: 5, title: "โปรเจกต์ LMS Frontend", status: "pending", style: "red", bell: true }]
  }
};

let selectedDateKey = "";

// Render Calendar
function renderCalendar() {
  const grid = document.getElementById('daysGrid');
  grid.innerHTML = '';

  const firstDayIndex = 3; // วันที่ 1 กรกฎาคม 2569 ตรงกับวันพุธ
  const totalDays = 30;

  // เว้นช่องว่างก่อนวันที่ 1
  for (let i = 0; i < firstDayIndex; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'h-[48px]';
    grid.appendChild(emptyCell);
  }

  // สร้างวันที่ 1 ถึง 30
  for (let day = 1; day <= totalDays; day++) {
    const dateKey = `2026-07-${day < 10 ? '0' + day : day}`;
    const dayCell = document.createElement('div');
    
    dayCell.className = 'h-[48px] flex items-center justify-center text-[15px] font-medium text-gray-800 rounded-lg relative cursor-pointer hover:bg-gray-100 transition-all';
    dayCell.innerText = day;

    // ตรวจสอบการแสดงผลสีไฮไลต์และรูปกระดิ่งแจ้งเตือน
    if (tasksData[dateKey]) {
      const taskInfo = tasksData[dateKey].tasks[0];
      
      if (taskInfo.style === 'yellow') {
        dayCell.classList.add('bg-[#ffcc00]', 'text-black', 'font-bold');
      } else if (taskInfo.style === 'red') {
        dayCell.classList.add('bg-[#ff1e1e]', 'text-white', 'font-bold');
      }

      // แสดงไอคอนกระดิ่งเมื่อค่า bell เป็น true
      if (taskInfo.bell) {
        const bell = document.createElement('i');
        bell.className = 'fa-solid fa-bell absolute -top-2 -right-2 text-[#ffcc00] text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]';
        dayCell.appendChild(bell);
      }
    }

    dayCell.onclick = () => openModal(dateKey, day);
    grid.appendChild(dayCell);
  }
}

// เปิด Pop-up แสดงรายละเอียด
function openModal(dateKey, dayNumber) {
  selectedDateKey = dateKey;
  
  const dayData = tasksData[dateKey];
  const titleText = (dayData && dayData.displayTitle) 
    ? dayData.displayTitle 
    : `การส่งงานวันที่ ${dayNumber} กรกฎาคม 2569`;

  document.getElementById('modalDateTitle').innerText = titleText;
  
  const taskContainer = document.getElementById('modalTaskContent');
  const tasks = dayData ? dayData.tasks : [];

  if (tasks.length > 0) {
    taskContainer.innerHTML = tasks.map(t => `
      <div class="p-3 rounded-lg bg-gray-50 border-l-4 ${t.status === 'submitted' ? 'border-[#00f050]' : 'border-[#ff1e1e]'} flex justify-between items-center mb-2">
        <div>
          <strong class="text-sm">${t.title}</strong><br>
          <small class="text-xs text-gray-600">สถานะ: ${t.status === 'submitted' ? '✅ ส่งแล้ว' : '⏳ ยังไม่ส่ง'}</small>
        </div>
      </div>
    `).join('');
  } else {
    taskContainer.innerHTML = `<p class="text-gray-500 text-sm text-center my-3">ไม่มีภารกิจ/งานที่ต้องส่งในวันนี้</p>`;
  }

  const modal = document.getElementById('taskModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

// ปิด Pop-up
function closeModal() {
  const modal = document.getElementById('taskModal');
  modal.classList.remove('flex');
  modal.classList.add('hidden');
}

// ระบบจัดการเมื่อกดยืนยันส่งงาน
function handleTaskSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('taskNote').value;
  
  if (!tasksData[selectedDateKey]) {
    tasksData[selectedDateKey] = {
      displayTitle: `การส่งงานวันที่ ${selectedDateKey.split('-')[2]} กรกฎาคม 2569`,
      tasks: []
    };
  }

  tasksData[selectedDateKey].tasks.push({
    id: Date.now(),
    title: `งานที่ส่ง: ${note}`,
    status: "submitted",
    style: "green",
    bell: false
  });

  let submittedCount = parseInt(document.getElementById('submitted-tasks').innerText);
  document.getElementById('submitted-tasks').innerText = submittedCount + 1;

  alert(`ส่งงานเรียบร้อยแล้ว!`);
  
  document.getElementById('submissionForm').reset();
  closeModal();
  renderCalendar();
}

window.onload = renderCalendar;