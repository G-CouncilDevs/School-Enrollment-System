import { enrollmentState } from "./enrollment-state.js";
import { requestJson } from "./api.js";
import { escapeHtml } from "./ui.js";

// Fill program dropdowns with programs loaded from the API.
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

// Fill academic-year dropdown with years from available semesters.
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

// Find the semester matching the selected term and academic year.
function getSelectedSemester() {
  const term = document.querySelector("#enroll-term")?.value;
  const year = Number(document.querySelector("#enroll-year")?.value);
  return enrollmentState.semesters.find(
    (semester) =>
      semester.semester_term === term && semester.academic_year === year,
  );
}

// Fill section dropdowns with blocks belonging to the selected semester.
function renderBlocks() {
  const semester = getSelectedSemester();
  enrollmentState.selectedSemester = semester || null;
  enrollmentState.selectedBlock = null;

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
  renderBlockCourses();
}

// Store the block selected for the current enrollment.
function selectBlock(event) {
  enrollmentState.selectedBlock =
    enrollmentState.blocks.find(
      (block) => String(block._id) === String(event.target.value),
    ) || null;
  renderBlockCourses();
}

// Show selected block courses and their prerequisite names.
function renderBlockCourses() {
  const courses = enrollmentState.selectedBlock?.courses || [];
  const markup = courses.length
    ? courses
        .map(({ course }) => {
          const prerequisites = course.prerequisites?.length
            ? course.prerequisites
                .map((prerequisite) => escapeHtml(prerequisite.name || prerequisite.code))
                .join(", ")
            : "None";

          return `
            <label>
              <input type="checkbox" name="courses" value="${escapeHtml(course._id)}">
              <span>
                <strong>${escapeHtml(course.code)} · ${escapeHtml(course.name)}</strong>
                <small>${escapeHtml(course.units)} units · Prerequisites: ${prerequisites}</small>
              </span>
            </label>
          `;
        })
        .join("")
    : '<p class="empty">Select a section to see its courses.</p>';

  document.querySelectorAll(".courses").forEach((container) => {
    container.innerHTML = markup;
  });
}

// Show matching students as selectable search results.
function renderStudentResults(students) {
  const results = document.querySelector("#find-results");
  if (!results) return;

  if (students.length === 0) {
    results.innerHTML = '<li class="none">No students found.</li>';
  } else {
    results.innerHTML = students
      .map(
        (student) => `
          <li>
            <button type="button" data-student-id="${escapeHtml(student._id)}">
              ${escapeHtml(student.first_name)} ${escapeHtml(student.last_name)}
              <small>Student ID: ${escapeHtml(student._id)}</small>
            </button>
          </li>
        `,
      )
      .join("");
  }

  results.hidden = false;
}

// Store selected student and copy its details into the existing-student form.
function fillSelectedStudent(student) {
  enrollmentState.selectedStudent = student;
  const existingPart = document.querySelector("#existing-part");
  if (!existingPart) return;

  const fields = {
    student_id: student._id,
    first_name: student.first_name,
    middle_name: student.middle_name,
    last_name: student.last_name,
    sex: student.sex,
    birth_date: student.birth_date
      ? String(student.birth_date).slice(0, 10)
      : "",
    street: student.address?.street,
    barangay: student.address?.barangay,
    city: student.address?.city,
    province: student.address?.province,
  };

  for (const [name, value] of Object.entries(fields)) {
    const field = existingPart.querySelector(`[name="${name}"]`);
    if (field) field.value = value || "";
  }

  const results = document.querySelector("#find-results");
  if (results) results.hidden = true;
}

// Search students through the API and display matching results.
async function searchStudents(event) {
  const search = event.target.value.trim();
  if (!search) {
    enrollmentState.students = [];
    const results = document.querySelector("#find-results");
    if (results) results.hidden = true;
    return;
  }

  const response = await requestJson(
    `/students?search=${encodeURIComponent(search)}&page=1&limit=20`,
  );
  enrollmentState.students = response.students || [];
  renderStudentResults(enrollmentState.students);
}

// Bind student search input and result-selection events.
function bindStudentSearch() {
  document.querySelector("#student-find")?.addEventListener("input", (event) => {
    searchStudents(event).catch((error) => {
      console.error("Failed to search students:", error);
    });
  });

  document.querySelector("#find-results")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-student-id]");
    if (!button) return;

    const student = enrollmentState.students.find(
      (candidate) => String(candidate._id) === button.dataset.studentId,
    );
    if (student) fillSelectedStudent(student);
  });
}

// Connect term, year, and student-search controls to their handlers.
function bindEnrollmentEvents() {
  document.querySelector("#enroll-term")?.addEventListener("change", renderBlocks);
  document.querySelector("#enroll-year")?.addEventListener("change", renderBlocks);
  document.querySelectorAll("[data-sections]").forEach((select) => {
    select.addEventListener("change", selectBlock);
  });
  bindStudentSearch();
}

// Load programs, semesters, and blocks into shared enrollment state.
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

// Initialize enrollment data, controls, and event handlers.
export async function initializeEnrollment() {
  await loadReferenceData();
  renderPrograms();
  renderAcademicYears();
  renderBlocks();
  bindEnrollmentEvents();
  return enrollmentState;
}
