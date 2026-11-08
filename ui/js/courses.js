// API operations used by the course dashboard.
import { deleteJson, postJson, putJson, requestJson } from "./api.js";

// Shared dashboard data and pagination settings.
import { PAGE_SIZE, state } from "./state.js";

// Shared UI helpers for rendering and feedback.
import {
  escapeHtml,
  courseEntryMatchesId,
  getFormPayload,
  renderPagination,
  setLoading,
  showToast,
} from "./ui.js";

// Count students in blocks that include the selected course.
function getCourseEnrollmentCount(courseId) {
  return state.blocks.reduce((total, block) => {
    const course = block.courses?.some((entry) =>
      courseEntryMatchesId(entry, courseId),
    );
    return course ? total + (block.students?.length || 0) : total;
  }, 0);
}

// Check whether a course belongs to the selected program.
function courseMatchesProgram(course, programId) {
  if (!programId) return true;
  return state.programs.some(
    (program) =>
      String(program._id) === String(programId) &&
      program.courses?.some((entry) => courseEntryMatchesId(entry, course._id)),
  );
}

// Render the loaded courses as rows in the dashboard table.
export function renderCourses() {
  const rows = document.querySelector("#course-rows");
  if (!rows) return;

  const programId = document.querySelector("#course-program")?.value || "";
  const courses = state.courses.filter((course) =>
    courseMatchesProgram(course, programId),
  );

  rows.innerHTML = courses.length
    ? courses
        .map(
          (course) => `
            <tr>
              <td><strong>${escapeHtml(course.code)}</strong><br>${escapeHtml(course.name)}</td>
              <td>${escapeHtml(course.units)}</td>
              <td>${course.prerequisites?.length
                ? course.prerequisites
                    .map((prerequisite) => escapeHtml(prerequisite.name || prerequisite))
                    .join(", ")
                : "None"}</td>
              <td>${getCourseEnrollmentCount(course._id)}</td>
              <td>
                <button type="button" class="btn light small" data-course-edit="${escapeHtml(course._id)}">Edit</button>
                <button type="button" class="btn light small danger-text" data-course-delete="${escapeHtml(course._id)}">Delete</button>
              </td>
            </tr>
          `,
        )
        .join("")
    : '<tr><td colspan="5" class="empty">No courses found.</td></tr>';

  const count = document.querySelector("#course-count");
  if (count) count.textContent = `${courses.length} course${courses.length === 1 ? "" : "s"} shown`;
}

// Populate the student filter with the currently loaded courses.
export function renderCourseOptions() {
  const select = document.querySelector("#student-course");
  if (!select) return;
  select.innerHTML = `
    <option value="">All students</option>
    ${state.courses
      .map(
        (course) =>
          `<option value="${escapeHtml(course._id)}">${escapeHtml(course.code)} · ${escapeHtml(course.name)}</option>`,
      )
      .join("")}
  `;
}

// Open the course dialog in create or edit mode.
export function openCourseDialog(course = null) {
  const dialog = document.querySelector("#course-dialog");
  const form = document.querySelector("#course-form");
  if (!dialog || !form) return;

  state.selectedCourse = course;
  form.reset();
  document.querySelector("#course-dialog-title").textContent = course
    ? "Edit Course"
    : "Add Course";
  document.querySelector("#course-submit").textContent = course
    ? "Save Changes"
    : "Add Course";

  form.elements.code.value = course?.code || "";
  form.elements.code.disabled = Boolean(course);
  form.elements.name.value = course?.name || "";
  form.elements.units.value = course?.units || "";

  const prereqList = document.querySelector("#prereq-list");
  prereqList.innerHTML = state.courses
    .filter((candidate) => String(candidate._id) !== String(course?._id))
    .map(
      (candidate) => `
        <label>
          <input type="checkbox" name="prerequisites" value="${escapeHtml(candidate._id)}"
            ${(course?.prerequisites || []).some(
              (prerequisite) =>
                String(prerequisite._id || prerequisite) === String(candidate._id),
            )
              ? "checked"
              : ""}>
          ${escapeHtml(candidate.code)} · ${escapeHtml(candidate.name)}
        </label>
      `,
    )
    .join("");

  dialog.showModal();
}

// Load one page of courses from the API and refresh related dashboard elements.
export async function loadCourses(handleLoadError) {
  const input = document.querySelector("#course-search");
  const params = new URLSearchParams({
    page: String(state.coursePage),
    limit: String(PAGE_SIZE),
  });
  if (input?.value.trim()) params.set("search", input.value.trim());

  setLoading("#course-rows", "Loading courses…");
  const response = await requestJson(`/courses?${params}`);
  state.courses = response.courses || [];
  state.courseTotal = response.total || 0;
  renderCourses();
  renderCourseOptions();
  renderPagination("#course-pagination", state.coursePage, state.courseTotal, (page) => {
    state.coursePage = page;
    loadCourses(handleLoadError).catch(handleLoadError);
  });

  const total = document.querySelector("#course-total");
  if (total) total.textContent = `${state.courseTotal} active course${state.courseTotal === 1 ? "" : "s"}`;
  document.querySelector("#metric-courses").textContent = state.courseTotal;
}

// Create a course or update the course currently selected for editing.
export async function createOrUpdateCourse(event, loadData) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = getFormPayload(form);
  payload.units = Number(payload.units);
  payload.prerequisites = [...form.querySelectorAll('[name="prerequisites"]:checked')].map(
    (input) => input.value,
  );

  try {
    if (state.selectedCourse) {
      await putJson(`/courses/${state.selectedCourse._id}`, {
        name: payload.name,
        units: payload.units,
        prerequisites: payload.prerequisites,
      });
    } else {
      await postJson("/courses", payload);
    }
    form.closest("dialog").close();
    showToast("Course saved.");
    await loadData();
  } catch (error) {
    showToast(error.message, true);
  }
}

// Delete a course after confirmation and refresh the dashboard.
export async function deleteSelectedCourse(course, loadData) {
  if (!window.confirm(`Delete ${course.code} · ${course.name}?`)) return;
  try {
    await deleteJson(`/courses/${course._id}`);
    showToast("Course deleted.");
    await loadData();
  } catch (error) {
    showToast(error.message, true);
  }
}
