/* =========================================================
   หน้าแก้ไขบัญชีผู้ใช้  (edit-user.html?id=5)
   ช่องที่เว้นว่าง = ใช้ค่าเดิม
   ========================================================= */
document.getElementById("searchBtn").innerHTML = ICONS.search;

const userId = new URLSearchParams(location.search).get("id");
let currentUser = null;

async function loadUser() {
  currentUser = await DataStore.getUser(userId);
  const info = document.getElementById("currentInfo");

  if (!currentUser) {
    info.innerHTML = `<span style="color:var(--muted)">ไม่พบข้อมูลผู้ใช้ (ยังไม่มีข้อมูลในระบบ)</span>`;
    document.querySelectorAll("#editForm input, .btn-save").forEach(el => (el.disabled = true));
    return;
  }

  info.innerHTML = `
    <span>${escapeHTML(currentUser.firstName)}</span>
    <span>${escapeHTML(currentUser.lastName)}</span>
    <span>${escapeHTML(currentUser.email)}</span>`;

  document.getElementById("firstName").placeholder = currentUser.firstName;
  document.getElementById("lastName").placeholder = currentUser.lastName;
  document.getElementById("email").placeholder = currentUser.email;
}

function setError(id, msg) {
  document.getElementById(id + "Err").textContent = msg || "";
}

document.getElementById("editForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentUser) return;

  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const email = document.getElementById("email").value.trim();

  ["firstName", "lastName", "email"].forEach(f => setError(f, ""));

  if (!firstName && !lastName && !email) {
    showToast("ยังไม่ได้กรอกข้อมูลที่ต้องการแก้ไข");
    return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setError("email", "รูปแบบอีเมลไม่ถูกต้อง");
    return;
  }

  try {
    const updated = await DataStore.updateUser(currentUser.id, {
      firstName: firstName || currentUser.firstName,
      lastName: lastName || currentUser.lastName,
      email: email || currentUser.email,
    });
    currentUser = updated;
    showToast("บันทึกข้อมูลผู้ใช้เรียบร้อยแล้ว");
    window.location.href = "users.html";
  } catch (error) {
    setError("email", error.message || "ไม่สามารถบันทึกข้อมูลผู้ใช้ได้");
  }
});

document.getElementById("cancelBtn").addEventListener("click", () => {
  window.location.href = "users.html";
});

loadUser();
