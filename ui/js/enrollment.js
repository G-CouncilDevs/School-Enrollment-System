import { enrollmentState } from "./enrollment-state.js";
import { requestJson, deleteJson } from "./api.js";
import { escapeHtml, showToast } from "./ui.js";

// ── Field-level validation helpers ──────────────────────────────────

// Clear every field-error span inside a container.
function clearFieldErrors(container) {
  if (!container) return;
  container.querySelectorAll("[data-error-for]").forEach((span) => {
    span.textContent = "";
  });
}

// Write a message next to the field identified by name.
function showFieldError(container, field, message) {
  const span = container.querySelector(`[data-error-for="${field}"]`);
  if (span) span.textContent = message;
}

// Toggle submit button state and label during form submission.
function setSubmitting(isSubmitting) {
  const button = document.querySelector("#enroll-submit");
  if (!button) return;
  button.disabled = isSubmitting;
  button.textContent = isSubmitting ? "Enrolling…" : "Enroll Student";
}

const SKIPPED_REASONS = {
  no_seat: "Full",
  missing_prerequisites: "Missing prerequisite",
  already_passed: "Already passed",
  not_open: "Closed",
};

// Format enrollment result message including enrolled and skipped courses with reasons.
function formatEnrollmentSummary(response, title) {
  const lines = [title];

  if (response.enrolled?.length > 0) {
    const enrolledCodes = response.enrolled.map((course) => course.code).join(", ");
    lines.push(`Enrolled: ${enrolledCodes}`);
  } else {
    lines.push("Enrolled: None");
  }

  if (response.skipped?.length > 0) {
    const skippedDetails = response.skipped
      .map((item) => {
        const reason = SKIPPED_REASONS[item.reason] || item.reason;
        return `${item.code} (${reason})`;
      })
      .join(", ");
    lines.push(`Skipped: ${skippedDetails}`);
  }

  return lines.join("\n");
}

// Validate the new-student form fields and show per-field errors.
// Returns true when every required field is filled in.
function validateNewStudentFields(container) {
  clearFieldErrors(container);

  const field = (name) => container?.querySelector(`[name="${name}"]`)?.value.trim();
  let valid = true;

  // Student identity
  if (!field("first_name")) {
    showFieldError(container, "first_name", "First name is required.");
    valid = false;
  }
  if (!field("last_name")) {
    showFieldError(container, "last_name", "Last name is required.");
    valid = false;
  }
  if (!field("sex")) {
    showFieldError(container, "sex", "Select sex.");
    valid = false;
  }
  if (!field("birth_date")) {
    showFieldError(container, "birth_date", "Birth date is required.");
    valid = false;
  }

  // Enrollment fields
  if (!field("standing_year")) {
    showFieldError(container, "standing_year", "Select year level.");
    valid = false;
  }
  if (!field("program")) {
    showFieldError(container, "program", "Select a program.");
    valid = false;
  }
  if (!field("block")) {
    showFieldError(container, "block", "Select a section.");
    valid = false;
  }

  return valid;
}

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

// Update major select with majors available for the selected program.
function renderProgramMajor(programId, select) {
  if (!select) return;
  if (!programId) {
    select.innerHTML = '<option value="">Select a program first</option>';
    return;
  }
  // Collect unique majors from all programs sharing the same name.
  const program = enrollmentState.programs.find(
    (candidate) => String(candidate._id) === String(programId),
  );
  const majors = program
    ? [...new Set(
        enrollmentState.programs
          .filter((p) => p.name === program.name && p.major)
          .map((p) => p.major),
      )]
    : [];
  select.innerHTML = majors.length
    ? majors
        .map(
          (major) =>
            `<option value="${escapeHtml(major)}">${escapeHtml(major)}</option>`,
        )
        .join("")
    : '<option value="">No major listed</option>';
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

// Fill section dropdowns with blocks belonging to the selected semester, program, and major.
function renderBlocks(container = null) {
  const semester = getSelectedSemester();
  enrollmentState.selectedSemester = semester || null;

  const targets = container
    ? container.querySelectorAll("[data-sections]")
    : document.querySelectorAll("[data-sections]");

  targets.forEach((select) => {
    const parent = select.closest("#new-part, #existing-part") || document;
    const programId = parent.querySelector?.('[name="program"]')?.value;
    const major = parent.querySelector?.('[name="major"]')?.value;

    const matchingBlocks = enrollmentState.blocks.filter((block) => {
      const matchesSemester =
        String(block.semester?._id || block.semester) === String(semester?._id);
      if (!matchesSemester) return false;

      // Filter by program if program is selected
      if (programId) {
        if (block.program) {
          if (String(block.program?._id || block.program) !== String(programId)) {
            return false;
          }
        } else {
          // Fallback by program code prefix if block.program was unset
          const prog = enrollmentState.programs.find(
            (p) => String(p._id) === String(programId),
          );
          if (prog?.name?.includes("Computer Science") && !block.section_name.startsWith("BSCS")) {
            return false;
          }
          if (prog?.name?.includes("Information Technology") && !block.section_name.startsWith("BSIT")) {
            return false;
          }
        }
      }

      // Filter by major if major is selected and block specifies a major
      if (major && block.major) {
        if (block.major.toLowerCase() !== major.toLowerCase()) {
          return false;
        }
      }

      return true;
    });

    let placeholder = "Select section";
    if (!semester) placeholder = "Select term first";
    else if (!programId) placeholder = "Select program first";
    else if (matchingBlocks.length === 0) placeholder = "No sections available";

    const options = matchingBlocks
      .map(
        (block) =>
          `<option value="${escapeHtml(block._id)}">${escapeHtml(block.section_name)}</option>`,
      )
      .join("");

    select.innerHTML = `<option value="">${placeholder}</option>${options}`;
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
  const offerings = enrollmentState.selectedSemester?.offerings || [];
  const offeringByCourse = new Map(
    offerings.map((offering) => [String(offering.course?._id || offering.course), offering]),
  );

  const markup = courses.length
    ? courses
        .map(({ course }) => {
          const prerequisites = course.prerequisites?.length
            ? course.prerequisites
                .map((prerequisite) => escapeHtml(prerequisite.name || prerequisite.code))
                .join(", ")
            : "None";

          const offering = offeringByCourse.get(String(course._id));
          const capacity = offering?.capacity ?? 0;
          const enrolled = offering?.enrolled ?? 0;
          const available = Math.max(capacity - enrolled, 0);

          let isUnavailable = false;
          let seatText = "";

          if (!offering || !offering.course_active) {
            isUnavailable = true;
            seatText = " · Closed";
          } else if (available === 0) {
            isUnavailable = true;
            seatText = ` · Full (0/${capacity} seats)`;
          } else {
            seatText = ` · ${available}/${capacity} seats available`;
          }

          return `
            <label class="${isUnavailable ? "off" : ""}">
              <input type="checkbox" name="courses" value="${escapeHtml(course._id)}" ${isUnavailable ? "disabled" : ""}>
              <span>
                <strong>${escapeHtml(course.code)} · ${escapeHtml(course.name)}</strong>
                <small>${escapeHtml(course.units)} units · Prerequisites: ${prerequisites}${seatText}</small>
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

// Render enrollments for the selected semester.
function renderEnrollments() {
  const rows = document.querySelector("#enrollment-rows");
  if (!rows) return;

  if (enrollmentState.enrollments.length === 0) {
    rows.innerHTML = '<tr><td colspan="6" class="empty">No enrollments yet.</td></tr>';
    return;
  }

  rows.innerHTML = enrollmentState.enrollments
    .map((enrollment) => {
      const student = enrollment.student || {};
      const name = [student.first_name, student.middle_name, student.last_name]
        .filter(Boolean)
        .join(" ");
      const courses = enrollment.courses?.map((course) => course.code).join(", ");

      return `
        <tr>
          <td>${escapeHtml(student._id || enrollment.student)}</td>
          <td>${escapeHtml(name || "Unknown student")}</td>
          <td>${escapeHtml(enrollment.standing_year || "—")}</td>
          <td>${escapeHtml(enrollment.block?.section_name || "—")}</td>
          <td>${escapeHtml(courses || "No courses")}</td>
          <td>
            <button type="button" class="btn light small" disabled>Edit</button>
            <button type="button" class="btn light small danger-text" data-enrollment-drop="${escapeHtml(enrollment._id)}">Remove</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

// Read selected courses from one enrollment mode.
function getSelectedCourseIds(container) {
  return [...(container?.querySelectorAll('input[name="courses"]:checked') || [])]
    .map((input) => input.value);
}

// Reload semesters from API to update seat availability.
async function refreshSemesters() {
  const response = await requestJson("/semesters?page=1&limit=100");
  enrollmentState.semesters = response.semesters || [];
  enrollmentState.selectedSemester = getSelectedSemester() || null;
}

// Load enrollments for the currently selected semester.
async function loadEnrollments() {
  const semester = enrollmentState.selectedSemester;
  if (!semester) {
    enrollmentState.enrollments = [];
    renderEnrollments();
    return;
  }

  const response = await requestJson(
    `/enrollments?semester=${encodeURIComponent(semester._id)}&page=1&limit=100`,
  );
  enrollmentState.enrollments = response.enrollments || [];
  renderEnrollments();
}

// Store selected student and copy its details into the existing-student form.
async function fillSelectedStudent(student) {
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

  // Pre-fill program and standing year from previous enrollment if available
  try {
    const response = await requestJson(
      `/enrollments?student=${encodeURIComponent(student._id)}&page=1&limit=1`,
    );
    const latest = response.enrollments?.[0];
    if (latest) {
      const programSelect = existingPart.querySelector('[name="program"]');
      const yearSelect = existingPart.querySelector('[name="standing_year"]');
      const majorSelect = existingPart.querySelector('[name="major"]');
      const programId = String(latest.program?._id || latest.program || "");
      if (programSelect && programId) {
        programSelect.value = programId;
        if (majorSelect) renderProgramMajor(programId, majorSelect);
      }
      if (yearSelect && latest.standing_year) {
        yearSelect.value = String(latest.standing_year);
      }
    }
  } catch {
    // Non-fatal if student has no prior enrollments
  }

  renderBlocks(existingPart);

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
    if (student) {
      fillSelectedStudent(student).catch((error) => {
        console.error("Failed to fill student details:", error);
      });
    }
  });
}

// Submit an existing-student enrollment using the selected student and block.
async function submitExistingEnrollment(event) {
  event.preventDefault();
  if (!document.querySelector("#mode-existing")?.checked) return;

  const existingPart = document.querySelector("#existing-part");
  const student = enrollmentState.selectedStudent;
  const program = existingPart?.querySelector('[name="program"]')?.value;
  const block = existingPart?.querySelector('[name="block"]')?.value;
  const standingYear = existingPart?.querySelector('[name="standing_year"]')?.value;
  const courses = getSelectedCourseIds(existingPart);

  if (!student || !program || !enrollmentState.selectedSemester || !block || courses.length === 0) {
    showToast("Select a student, program, term, academic year, section, and course.", true);
    return;
  }

  const form = event.currentTarget;
  setSubmitting(true);
  try {
    const response = await requestJson("/enrollments", {
      method: "POST",
      body: JSON.stringify({
        student: student._id,
        program,
        semester: enrollmentState.selectedSemester._id,
        block,
        courses,
        standing_year: standingYear || undefined,
      }),
    });

    showToast(
      formatEnrollmentSummary(response, "Enrollment created."),
      response.enrolled?.length === 0,
    );
    form.reset();
    enrollmentState.selectedStudent = null;
    enrollmentState.selectedBlock = null;
    await refreshSemesters();
    renderBlockCourses();
    await loadEnrollments();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setSubmitting(false);
  }
}

// Create a new student, then create the student's first enrollment.
async function submitNewEnrollment(event) {
  event.preventDefault();
  if (!document.querySelector("#mode-new")?.checked) return;

  const newPart = document.querySelector("#new-part");
  const field = (name) => newPart?.querySelector(`[name="${name}"]`)?.value.trim();
  const program = field("program");
  const block = field("block");
  const standingYear = field("standing_year");
  const courses = getSelectedCourseIds(newPart);

  // Validate required student and enrollment fields before making the API call.
  const fieldsValid = validateNewStudentFields(newPart);

  if (!enrollmentState.selectedSemester) {
    showToast("Select a term and academic year.", true);
    return;
  }

  if (courses.length === 0) {
    // Show the error next to the courses section (span lives outside the mode container).
    const coursesError = document.querySelector('[data-error-for="courses"]');
    if (coursesError) coursesError.textContent = "Select at least one course.";
    if (fieldsValid) showToast("Select at least one course.", true);
  }

  if (!fieldsValid || courses.length === 0) {
    return;
  }

  const form = event.currentTarget;
  setSubmitting(true);
  try {
    const response = await requestJson("/enrollments", {
      method: "POST",
      body: JSON.stringify({
        first_name: field("first_name"),
        middle_name: field("middle_name"),
        last_name: field("last_name"),
        sex: field("sex"),
        birth_date: field("birth_date"),
        address: {
          street: field("street"),
          barangay: field("barangay"),
          city: field("city"),
          province: field("province"),
        },
        program,
        semester: enrollmentState.selectedSemester._id,
        block,
        courses,
        standing_year: standingYear || undefined,
      }),
    });

    showToast(
      formatEnrollmentSummary(
        response,
        `Student ${response.enrollment.student} created.`,
      ),
      response.enrolled?.length === 0,
    );
    form.reset();
    clearFieldErrors(newPart);
    const coursesError = document.querySelector('[data-error-for="courses"]');
    if (coursesError) coursesError.textContent = "";
    enrollmentState.selectedBlock = null;
    await refreshSemesters();
    renderBlockCourses();
    await loadEnrollments();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setSubmitting(false);
  }
}

// Wire the enrollment Remove button and drop-dialog modal.
function bindDropDialog() {
  const dialog = document.querySelector("#drop-dialog");
  const form = document.querySelector("#drop-form");
  const nameEl = document.querySelector("#drop-name");
  if (!dialog || !form) return;

  let pendingId = null;

  // Open dialog when a Remove button is clicked in the enrollment table.
  document.querySelector("#enrollment-rows")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-enrollment-drop]");
    if (!button) return;

    pendingId = button.dataset.enrollmentDrop;
    const enrollment = enrollmentState.enrollments.find(
      (e) => String(e._id) === pendingId,
    );
    const student = enrollment?.student || {};
    const name = [student.first_name, student.last_name].filter(Boolean).join(" ");
    if (nameEl) nameEl.textContent = name || "this student";
    dialog.showModal();
  });

  // Cancel button
  dialog.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => dialog.close());
  });

  // Confirm removal
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!pendingId) return;

    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
      const result = await deleteJson(`/enrollments/${pendingId}`);
      dialog.close();
      showToast(
        `Enrollment removed. ${result.seats_released || 0} seat(s) released.`,
      );
      await refreshSemesters();
      renderBlockCourses();
      await loadEnrollments();
    } catch (error) {
      showToast(error.message, true);
    } finally {
      if (submitButton) submitButton.disabled = false;
      pendingId = null;
    }
  });
}

// Connect term, year, and student-search controls to their handlers.
function bindEnrollmentEvents() {
  document.querySelector("#enroll-form")?.addEventListener(
    "submit",
    (event) => {
      if (document.querySelector("#enroll-submit")?.disabled) {
        event.preventDefault();
        return;
      }
      if (document.querySelector("#mode-new")?.checked) {
        submitNewEnrollment(event);
      } else {
        submitExistingEnrollment(event);
      }
    },
  );
  document.querySelector("#enroll-term")?.addEventListener("change", async () => {
    renderBlocks();
    await loadEnrollments();
  });
  document.querySelector("#enroll-year")?.addEventListener("change", async () => {
    renderBlocks();
    await loadEnrollments();
  });
  document.querySelectorAll("[data-sections]").forEach((select) => {
    select.addEventListener("change", selectBlock);
  });
  document.querySelectorAll("[data-programs]").forEach((select) => {
    select.addEventListener("change", (event) => {
      const container = event.target.closest("#new-part, #existing-part, #student-dialog");
      const majorSelect = container?.querySelector("[data-majors]");
      renderProgramMajor(event.target.value, majorSelect);
      renderBlocks(container);
    });
  });
  document.querySelectorAll("[data-majors]").forEach((select) => {
    select.addEventListener("change", (event) => {
      const container = event.target.closest("#new-part, #existing-part, #student-dialog");
      renderBlocks(container);
    });
  });
  bindStudentSearch();
  bindDropDialog();
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
  await loadEnrollments();
  return enrollmentState;
}
