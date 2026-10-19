/**
 * KMAPS Validation Module
 * Client-side form validation for auth pages
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * ตรวจสอบรูปแบบอีเมล
 */
export function validateEmail(email) {
  const errors = [];
  const trimmed = (email || '').trim();

  if (!trimmed) {
    errors.push('Email is required.');
  } else if (!EMAIL_REGEX.test(trimmed)) {
    errors.push('Please enter a valid email address.');
  }

  return {
    valid: errors.length === 0,
    errors,
    value: trimmed,
  };
}

/**
 * ตรวจสอบรหัสผ่าน
 * ค่าเริ่มต้น: อย่างน้อย 8 ตัวอักษร และไม่เกิน 72 ไบต์
 */
export function validatePassword(
  password,
  { minLength = 8, maxLengthBytes = 72 } = {},
) {
  const errors = [];
  const value = password || '';

  if (!value) {
    errors.push('Password is required.');
  } else if (value.length < minLength) {
    errors.push(
      `Password must be at least ${minLength} characters.`,
    );
  } else {
    const byteLength = new TextEncoder().encode(value).length;

    if (byteLength > maxLengthBytes) {
      errors.push(
        `Password must not exceed ${maxLengthBytes} bytes (currently ${byteLength} bytes).`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    value,
  };
}

/**
 * ตรวจสอบการยืนยันรหัสผ่าน
 */
export function validateConfirmPassword(password, confirmPassword) {
  const errors = [];
  const value = confirmPassword || '';

  if (!value) {
    errors.push('Please confirm your password.');
  } else if (value !== password) {
    errors.push('Passwords do not match.');
  }

  return {
    valid: errors.length === 0,
    errors,
    value,
  };
}

/**
 * ตรวจสอบชื่อ-นามสกุล
 */
export function validateFullName(fullName) {
  const errors = [];
  const trimmed = (fullName || '').trim();

  if (!trimmed) {
    errors.push('Full name is required.');
  } else if (trimmed.length < 2) {
    errors.push('Full name must be at least 2 characters.');
  }

  return {
    valid: errors.length === 0,
    errors,
    value: trimmed,
  };
}

/**
 * ตรวจสอบข้อมูลเข้าสู่ระบบ
 * Login ต้องมีรหัสผ่าน แต่ไม่บังคับความยาวขั้นต่ำ 8 ตัว
 */
export function validateLoginForm({ email, password }) {
  const emailResult = validateEmail(email);

  const passwordResult = validatePassword(password, {
    minLength: 1,
  });

  const fieldErrors = {};

  if (!emailResult.valid) {
    fieldErrors.email = emailResult.errors[0];
  }

  if (!passwordResult.valid) {
    fieldErrors.password = passwordResult.errors[0];
  }

  return {
    valid: emailResult.valid && passwordResult.valid,
    fieldErrors,
    values: {
      email: emailResult.value,
      password: passwordResult.value,
    },
  };
}

/**
 * ตรวจสอบข้อมูลสมัครสมาชิก
 */
export function validateRegisterForm({
  full_name,
  email,
  password,
  confirm_password,
}) {
  const fullNameResult = validateFullName(full_name);
  const emailResult = validateEmail(email);
  const passwordResult = validatePassword(password);

  const confirmResult = validateConfirmPassword(
    password,
    confirm_password,
  );

  const fieldErrors = {};

  if (!fullNameResult.valid) {
    fieldErrors.full_name = fullNameResult.errors[0];
  }

  if (!emailResult.valid) {
    fieldErrors.email = emailResult.errors[0];
  }

  if (!passwordResult.valid) {
    fieldErrors.password = passwordResult.errors[0];
  }

  if (!confirmResult.valid) {
    fieldErrors.confirm_password = confirmResult.errors[0];
  }

  return {
    valid:
      fullNameResult.valid &&
      emailResult.valid &&
      passwordResult.valid &&
      confirmResult.valid,
    fieldErrors,
    values: {
      full_name: fullNameResult.value,
      email: emailResult.value,
      password: passwordResult.value,
    },
  };
}

/**
 * แสดงข้อผิดพลาดของแต่ละช่อง
 */
export function setFieldError(form, fieldName, message) {
  if (!form) return;

  const input = form.querySelector(`[name="${fieldName}"]`);

  const errorElement = form.querySelector(
    `[data-error-for="${fieldName}"]`,
  );

  if (input) {
    input.setAttribute(
      'aria-invalid',
      message ? 'true' : 'false',
    );

    input.classList.toggle('input-error', Boolean(message));
  }

  if (errorElement) {
    errorElement.textContent = message || '';
    errorElement.classList.toggle('visible', Boolean(message));
  }
}

/**
 * ล้างข้อความและสถานะข้อผิดพลาดทั้งหมด
 */
export function clearFormErrors(form) {
  if (!form) return;

  form.querySelectorAll('[data-error-for]').forEach((element) => {
    element.textContent = '';
    element.classList.remove('visible');
  });

  form.querySelectorAll('[aria-invalid="true"]').forEach((input) => {
    input.setAttribute('aria-invalid', 'false');
    input.classList.remove('input-error');
  });
}

/**
 * แสดงข้อผิดพลาดหลายช่องพร้อมกัน
 */
export function applyFieldErrors(form, fieldErrors) {
  if (!form) return;

  clearFormErrors(form);

  Object.entries(fieldErrors || {}).forEach(([field, message]) => {
    setFieldError(form, field, message);
  });
}
