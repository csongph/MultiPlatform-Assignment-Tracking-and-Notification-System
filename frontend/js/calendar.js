// Task database mock based on the design mockup (July 2569)
let tasksData = {
  "2026-07-21": [{ id: 1, title: "ส่งรายงาน รายวิชาภาษาไทย", status: "pending", style: "yellow", bell: true }],
  "2026-07-24": [{ id: 2, title: "การบ้าน คณิตศาสตร์ (ครบกำหนดวันนี้)", status: "pending", style: "red", bell: true }],
  "2026-07-25": [{ id: 3, title: "โปรเจกต์ LMS Frontend", status: "pending", style: "yellow", bell: true }],
  "2026-07-27": [{ id: 4, title: "แบบฝึกหัด ฟิสิกส์", status: "pending", style: "red", bell: false }],
  "2026-07-28": [{ id: 5, title: "การบ้าน เคมี", status: "pending", style: "red", bell: false }]
};

let selectedDateKey = "";

// Render Calendar
function renderCalendar() {
  const grid = document.getElementById('daysGrid');
  grid.innerHTML = '';

  // July 2026 starts on Wednesday (offset = 3 days)
  const firstDayIndex = 3; 
  const totalDays = 30;

  // Empty slots before 1st of July
  for (let i = 0; i < firstDayIndex; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'day-cell';
    grid.appendChild(emptyCell);
  }

  // Populate days 1 to 30
  for (let day = 1; day <= totalDays; day++) {
    const dateKey = `2026-07-${day < 10 ? '0' + day : day}`;
    const dayCell = document.createElement('div');
    dayCell.className = 'day-cell';
    dayCell.innerText = day;

    // Check task styling matching design mockup
    if (tasksData[dateKey]) {
      const taskInfo = tasksData[dateKey][0];
      
      if (taskInfo.style === 'yellow') {
        dayCell.classList.add('highlight-yellow');
      } else if (taskInfo.style === 'red') {
        dayCell.classList.add('highlight-red');
      }

      if (taskInfo.bell) {
        const bell = document.createElement('i');
        bell.className = 'fa-solid fa-bell bell-icon';
        dayCell.appendChild(bell);
      }
    }

    // Add Click listener to interact and submit task
    dayCell.onclick = () => openModal(dateKey, day);
    grid.appendChild(dayCell);
  }
}

// Modal Control
function openModal(dateKey, dayNumber) {
  selectedDateKey = dateKey;
  document.getElementById('modalDateTitle').innerText = `การส่งงานวันที่ ${dayNumber} กรกฎาคม 2569`;
  const taskContainer = document.getElementById('modalTaskContent');
  
  const tasks = tasksData[dateKey] || [];

  if (tasks.length > 0) {
    taskContainer.innerHTML = tasks.map(t => `
      <div class="assignment-item ${t.status === 'submitted' ? '' : 'pending'}">
        <div>
          <strong>${t.title}</strong><br>
          <small>สถานะ: ${t.status === 'submitted' ? '✅ ส่งแล้ว' : '⏳ ยังไม่ส่ง'}</small>
        </div>
      </div>
    `).join('');
  } else {
    taskContainer.innerHTML = `<p style="color:#777; font-size: 14px; text-align: center; margin: 10px 0;">ไม่มีภารกิจ/งานที่ต้องส่งในวันนี้</p>`;
  }

  document.getElementById('taskModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('taskModal').style.display = 'none';
}

// Form Handle for Submitting Assignments
function handleTaskSubmit(e) {
  e.preventDefault();
  const note = document.getElementById('taskNote').value;
  
  if (!tasksData[selectedDateKey]) {
    tasksData[selectedDateKey] = [];
  }

  // Update state
  tasksData[selectedDateKey].push({
    id: Date.now(),
    title: `งานที่ส่ง: ${note}`,
    status: "submitted",
    style: "green",
    bell: false
  });

  // Update Top Card Stats
  let submittedCount = parseInt(document.getElementById('submitted-tasks').innerText);
  document.getElementById('submitted-tasks').innerText = submittedCount + 1;

  alert(`ส่งงานสำหรับวันที่ ${selectedDateKey} เรียบร้อยแล้ว!`);
  
  // Reset & Close
  document.getElementById('submissionForm').reset();
  closeModal();
  renderCalendar();
}

// Initial load
window.onload = renderCalendar;