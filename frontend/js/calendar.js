// 07_calendar_My_work Interactivity Script
document.addEventListener('DOMContentLoaded', () => {
  const monthSelect = document.getElementById('month-select');
  const yearSelect = document.getElementById('year-select');
  const prevBtn = document.getElementById('prev-month');
  const nextBtn = document.getElementById('next-month');

  // Interactive controls placeholder
  prevBtn.addEventListener('click', () => {
    if (monthSelect.selectedIndex > 0) {
      monthSelect.selectedIndex -= 1;
    }
  });

  nextBtn.addEventListener('click', () => {
    if (monthSelect.selectedIndex < monthSelect.options.length - 1) {
      monthSelect.selectedIndex += 1;
    }
  });
});