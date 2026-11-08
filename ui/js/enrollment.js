import { enrollmentState } from "./enrollment-state.js";
import { requestJson } from "./api.js";
import { escapeHtml } from "./ui.js";

function renderPrograms() {
  const options = enrollmentState.programs
    .map(
      (program) =>
        `<option value="${escapeHtml(program._id)}">${escapeHtml(program.name)} · ${escapeHtml(program.major)}</option>`,
    )
    .join("");

  document.querySelectorAll("[data-programs]").forEach((select) => {
    select.innerHTML = `<option value="">Select program</option>${options}`;
  });
}

function renderAcademicYears() {
  const years = [...new Set(
    enrollmentState.semesters.map((semester) => semester.academic_year),
  )];
  const options = years
    .map((year) => `<option value="${escapeHtml(year)}">${escapeHtml(year)}</option>`)
    .join("");
  const select = document.querySelector("#enroll-year");
  if (select) select.innerHTML = options;
}

function getSelectedSemester() {
  const term = document.querySelector("#enroll-term")?.value;
  const year = Number(document.querySelector("#enroll-year")?.value);
  return enrollmentState.semesters.find(
    (semester) =>
      semester.semester_term === term && semester.academic_year === year,
  );
}

function renderBlocks() {
  const semester = getSelectedSemester();
  enrollmentState.selectedSemester = semester || null;

  const options = enrollmentState.blocks
    .filter(
      (block) =>
        String(block.semester?._id || block.semester) ===
        String(semester?._id),
    )
    .map(
      (block) =>
        `<option value="${escapeHtml(block._id)}">${escapeHtml(block.section_name)}</option>`,
    )
    .join("");

  document.querySelectorAll("[data-sections]").forEach((select) => {
    select.innerHTML = `<option value="">Select section</option>${options}`;
  });
}

function bindEnrollmentEvents() {
  document.querySelector("#enroll-term")?.addEventListener("change", renderBlocks);
  document.querySelector("#enroll-year")?.addEventListener("change", renderBlocks);
}

async function loadReferenceData() {
  const [programs, semesters, blocks] = await Promise.all([
    requestJson("/programs?page=1&limit=100"),
    requestJson("/semesters?page=1&limit=100"),
    requestJson("/blocks?page=1&limit=100"),
  ]);

  enrollmentState.programs = programs.programs || [];
  enrollmentState.semesters = semesters.semesters || [];
  enrollmentState.blocks = blocks.blocks || [];
}

export async function initializeEnrollment() {
  await loadReferenceData();
  renderPrograms();
  renderAcademicYears();
  renderBlocks();
  bindEnrollmentEvents();
  return enrollmentState;
}
