import { PAGE_SIZE, state } from "./state.js";

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function showToast(message, isError = false, duration = 5000) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.hidden = false;
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    toast.hidden = true;
  }, duration);
}

export function setLoading(selector, message) {
  const element = document.querySelector(selector);
  if (element) {
    element.innerHTML = `<span class="empty">${escapeHtml(message)}</span>`;
  }
}

export function getFormPayload(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function getProgramById(id) {
  return state.programs.find((program) => String(program._id) === String(id));
}

export function getEnrollmentForStudent(studentId) {
  return state.enrollments.find(
    (enrollment) => String(enrollment.student) === String(studentId),
  );
}

export function courseEntryMatchesId(entry, courseId) {
  const id = entry?.course?._id || entry?.course || entry?._id || entry;
  return String(id) === String(courseId);
}

export function renderPagination(selector, page, total, onChange) {
  const container = document.querySelector(selector);
  if (!container) return;

  const pageCount = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  container.innerHTML = `
    <button type="button" class="btn light small" data-page-action="previous"
      ${page <= 1 ? "disabled" : ""}>Previous</button>
    <span class="sub">Page ${page} of ${pageCount}</span>
    <button type="button" class="btn light small" data-page-action="next"
      ${page >= pageCount ? "disabled" : ""}>Next</button>
  `;

  container.querySelector('[data-page-action="previous"]')?.addEventListener(
    "click",
    () => onChange(page - 1),
  );
  container.querySelector('[data-page-action="next"]')?.addEventListener(
    "click",
    () => onChange(page + 1),
  );
}

export function renderPrograms() {
  document.querySelectorAll("[data-programs]").forEach((select) => {
    const selected = select.value;
    select.innerHTML = `
      <option value="">Select program</option>
      ${state.programs
        .map(
          (program) =>
            `<option value="${escapeHtml(program._id)}">${escapeHtml(program.name)}</option>`,
        )
        .join("")}
    `;
    select.value = selected;
  });

  const courseProgram = document.querySelector("#course-program");
  if (courseProgram) {
    const selected = courseProgram.value;
    courseProgram.innerHTML = `
      <option value="">All programs</option>
      ${state.programs
        .map(
          (program) =>
            `<option value="${escapeHtml(program._id)}">${escapeHtml(program.name)}${program.major ? ` · ${escapeHtml(program.major)}` : ""}</option>`,
        )
        .join("")}
    `;
    courseProgram.value = selected;
  }
}

export function renderMajors(programId, select) {
  const program = getProgramById(programId);
  select.innerHTML = program?.major
    ? `<option value="${escapeHtml(program.major)}">${escapeHtml(program.major)}</option>`
    : '<option value="">No major listed</option>';
}
