import { enrollmentState } from "./enrollment-state.js";
import { escapeHtml, showToast } from "./ui.js";
import { requestJson, putJson, deleteJson } from "./api.js";
import {
    getSelectedSemester,
    renderBlockCourses,
    renderBlocks,
    renderProgramMajor,
    selectBlock,
} from "./enrollment-render.js";
import { renderEnrollments } from "./enrollment-table.js";

// Clear every field-error span inside a container.
export function clearFieldErrors(container) {
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

// Read selected courses from one enrollment mode.
function getSelectedCourseIds(container) {
  return [...(container?.querySelectorAll('input[name="courses"]:checked') || [])]
    .map((input) => input.value);
}

// Reload semesters from API to update seat availability.
export async function refreshSemesters() {
  const response = await requestJson("/semesters?page=1&limit=100");
  enrollmentState.semesters = response.semesters || [];
  enrollmentState.selectedSemester = getSelectedSemester() || null;
}

// Load enrollments for the currently selected semester.
export async function loadEnrollments() {
  const semester = enrollmentState.selectedSemester;

  // Clear search so the new term's list isn't pre-filtered.
  const searchInput = document.querySelector("#enrollment-search");
  if (searchInput) searchInput.value = "";

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
    `/students?search=${encodeURIComponent(search)}&page=1&limit=10`,
  );
  enrollmentState.students = response.students || [];
  renderStudentResults(enrollmentState.students);
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

// Wire the enrollment Edit button and edit-enrollment-dialog modal.
function bindEditDialog() {
  const dialog = document.querySelector("#edit-enrollment-dialog");
  const form = document.querySelector("#edit-enrollment-form");
  if (!dialog || !form) return;

  let pendingId = null;

  // Populate the edit dialog's program dropdown from enrollmentState.programs.
  function populateEditPrograms(selectedProgramId) {
    const select = form.querySelector("[data-edit-programs]");
    if (!select) return;
    const options = enrollmentState.programs
      .map(
        (program) =>
          `<option value="${escapeHtml(program._id)}"${String(program._id) === String(selectedProgramId) ? " selected" : ""}>${escapeHtml(program.name)} · ${escapeHtml(program.major)}</option>`,
      )
      .join("");
    select.innerHTML = `<option value="">Select program</option>${options}`;
  }

  // Open dialog pre-filled when an Edit button is clicked in the enrollment table.
  document.querySelector("#enrollment-rows")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-enrollment-edit]");
    if (!button) return;

    pendingId = button.dataset.enrollmentEdit;
    const enrollment = enrollmentState.enrollments.find(
      (e) => String(e._id) === pendingId,
    );
    if (!enrollment) return;

    // Pre-fill year level.
    const yearSelect = form.querySelector('[name="standing_year"]');
    if (yearSelect) yearSelect.value = enrollment.standing_year || "1";

    // Pre-fill program dropdown.
    const programId = enrollment.program?._id || enrollment.program;
    populateEditPrograms(programId);

    dialog.showModal();
  });

  // Cancel button.
  dialog.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => dialog.close());
  });

  // Save changes.
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!pendingId) return;

    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    const data = new FormData(form);
    const body = {
      standing_year: Number(data.get("standing_year")),
      program: data.get("program"),
    };

    try {
      await putJson(`/enrollments/${pendingId}`, body);
      dialog.close();
      showToast("Enrollment updated successfully.");
      await loadEnrollments();
    } catch (error) {
      showToast(error.message, true);
    } finally {
      if (submitButton) submitButton.disabled = false;
      pendingId = null;
    }
  });
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

// Add an extra course checkbox to the courses list.
function bindExtraCourse() {
  document.querySelector("#add-extra")?.addEventListener("click", () => {
    const select = document.querySelector("#extra-course");
    const courseId = select?.value;
    if (!courseId) return;

    const course = enrollmentState.courses.find(
      (c) => String(c._id) === courseId,
    );
    if (!course) return;

    // Avoid duplicates — check if checkbox already exists.
    const existing = document.querySelectorAll(
      `input[name="courses"][value="${courseId}"]`,
    );
    if (existing.length > 0) {
      existing.forEach((input) => (input.checked = true));
      select.value = "";
      return;
    }

    const offerings = enrollmentState.selectedSemester?.offerings || [];
    const offering = offerings.find(
      (o) => String(o.course?._id || o.course) === courseId,
    );
    const capacity = offering?.capacity ?? 0;
    const enrolled = offering?.enrolled ?? 0;
    const available = Math.max(capacity - enrolled, 0);
    const seatText = available > 0
      ? ` · ${available}/${capacity} seats available`
      : ` · Full (0/${capacity} seats)`;
    const isUnavailable = available === 0;

    const label = document.createElement("label");
    label.className = isUnavailable ? "off" : "";
    label.innerHTML = `
      <input type="checkbox" name="courses" value="${escapeHtml(course._id)}" ${isUnavailable ? "disabled" : "checked"}>
      <span>
        <strong>${escapeHtml(course.code)} · ${escapeHtml(course.name)}</strong>
        <small>${escapeHtml(course.units)} units · Extra course${seatText}</small>
      </span>
    `;

    // Append to all .courses containers (both modes share markup).
    document.querySelectorAll(".courses").forEach((container) => {
      const empty = container.querySelector(".empty");
      if (empty) empty.remove();
      container.appendChild(label.cloneNode(true));
    });

    select.value = "";
  });
}

// Connect term, year, and student-search controls to their handlers.
export function bindEnrollmentEvents() {
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
      const container = event.target.closest("#new-part, #existing-part");
      const majorSelect = container?.querySelector("[data-majors]");
      renderProgramMajor(event.target.value, majorSelect);
      renderBlocks(container);
    });
  });
  document.querySelectorAll("[data-majors]").forEach((select) => {
    select.addEventListener("change", (event) => {
      const container = event.target.closest("#new-part, #existing-part");
      renderBlocks(container);
    });
  });
  document.querySelectorAll('[name="standing_year"]').forEach((select) => {
    select.addEventListener("change", (event) => {
      const container = event.target.closest("#new-part, #existing-part");
      renderBlocks(container);
    });
  });
  bindStudentSearch();
  bindEditDialog();
  bindDropDialog();
  document.querySelector("#enrollment-search")?.addEventListener("input", renderEnrollments);
  bindExtraCourse();
  document.querySelector("#enroll-cancel")?.addEventListener("click", () => {
    document.querySelector("#enroll-form")?.reset();
    clearFieldErrors(document.querySelector("#new-part"));
    clearFieldErrors(document.querySelector("#existing-part"));
    const coursesError = document.querySelector('[data-error-for="courses"]');
    if (coursesError) coursesError.textContent = "";
    enrollmentState.selectedStudent = null;
    enrollmentState.selectedBlock = null;
    renderBlockCourses();
  });
}
