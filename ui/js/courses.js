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
  const semesterId = state.selectedSemester?._id;
  return state.blocks.reduce((total, block) => {
    if (semesterId && String(block.semester?._id || block.semester) !== String(semesterId)) {
      return total;
    }
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

  const courses = state.courses;

  rows.innerHTML = courses.length
    ? courses
        .map(
          (course) => `
            <tr>
              <td><strong>${escapeHtml(course.code)}</strong><br>${escapeHtml(course.name)}</td>
              <td>${escapeHtml(course.units)}</td>
              <td>${course.prerequisites?.length
                ? course.prerequisites
                    .map((prerequisite) => {
                      const code =
                        prerequisite?.code ||
                        state.courses.find(
                          (c) =>
                            String(c._id) ===
                            String(prerequisite?._id || prerequisite),
                        )?.code ||
                        prerequisite;
                      return escapeHtml(code);
                    })
                    .join(", ")
                : "None"}</td>
              <td>${(() => { const n = getCourseEnrollmentCount(course._id); return `${n} student${n === 1 ? "" : "s"}`; })()}</td>
              <td>
                <button type="button" class="btn light small" data-course-roster="${escapeHtml(course._id)}">View Students</button>
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

// Open the confirmation dialog for deleting a course.
export function openCourseDeleteDialog(course) {
  const dialog = document.querySelector("#delete-dialog");
  const name = document.querySelector("#delete-name");
  if (!dialog || !name) return;

  state.selectedCourseToDelete = course;
  name.textContent = `${course.code} · ${course.name}`;
  dialog.showModal();
}

// Open the dialog listing students enrolled in a specific course.
export async function openCourseRosterDialog(course) {
  const dialog = document.querySelector("#roster-dialog");
  const title = document.querySelector("#roster-dialog-title");
  const sub = document.querySelector("#roster-dialog-sub");
  const rows = document.querySelector("#roster-rows");
  if (!dialog || !title || !rows) return;

  title.textContent = `${course.code} · ${course.name}`;
  sub.textContent = "Loading enrolled students…";
  rows.innerHTML = '<tr><td colspan="4" class="empty">Loading…</td></tr>';
  dialog.showModal();

  try {
    const sem = state.selectedSemester;
    const semParam = sem ? `&semester=${encodeURIComponent(sem._id)}` : "";
    const response = await requestJson(
      `/students?course=${encodeURIComponent(course._id)}${semParam}&page=1&limit=100`,
    );
    const students = response.students || [];

    const termText = sem ? ` (${sem.semester_term} Term ${sem.academic_year})` : "";
    sub.textContent = `${students.length} student${students.length === 1 ? "" : "s"} enrolled${termText}`;
    if (students.length === 0) {
      rows.innerHTML = '<tr><td colspan="4" class="empty">No students enrolled in this course.</td></tr>';
      return;
    }

    rows.innerHTML = students
      .map((student) => {
        const name = [student.first_name, student.middle_name, student.last_name]
          .filter(Boolean)
          .join(" ");

        const enrollment = state.enrollments.find((e) => {
          const sId = String(e.student?._id || e.student);
          const semMatch = sem ? String(e.semester?._id || e.semester) === String(sem._id) : true;
          return sId === String(student._id) && semMatch;
        });

        let programName = "—";
        if (enrollment) {
          const progId = enrollment.program?._id || enrollment.program;
          const foundProg = state.programs.find((p) => String(p._id) === String(progId));
          programName = foundProg?.name || enrollment.program?.name || enrollment.block?.section_name || "—";
        }

        return `
          <tr>
            <td><strong>${escapeHtml(student._id)}</strong></td>
            <td>${escapeHtml(name || "Unknown")}</td>
            <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(programName)}">${escapeHtml(programName)}</td>
            <td>${escapeHtml(student.sex || "—")}</td>
          </tr>
        `;
      })
      .join("");
  } catch (err) {
    sub.textContent = "Failed to load students.";
    rows.innerHTML = `<tr><td colspan="4" class="empty">${escapeHtml(err.message)}</td></tr>`;
  }
}

// Load one page of courses from the API and refresh related dashboard elements.
export async function loadCourses(handleLoadError) {
  const input = document.querySelector("#course-search");
  const programSelect = document.querySelector("#course-program");
  const search = input?.value.trim() || "";
  const programId = programSelect?.value || "";

  const params = new URLSearchParams({
    page: String(state.coursePage),
    limit: String(PAGE_SIZE),
  });
  if (search) params.set("search", search);
  if (programId) params.set("program", programId);

  setLoading("#course-rows", "Loading courses…");
  const response = await requestJson(`/courses?${params}`);
  state.courses = response.courses || [];
  state.courseTotal = response.total || 0;
  renderCourses();
  renderPagination("#course-pagination", state.coursePage, state.courseTotal, (page) => {
    state.coursePage = page;
    loadCourses(handleLoadError).catch(handleLoadError);
  });

  const total = document.querySelector("#course-total");
  if (total) {
    if (search || programId) {
      total.textContent = `${state.courseTotal} course${state.courseTotal === 1 ? "" : "s"} found`;
    } else {
      total.textContent = `${state.courseTotal} active course${state.courseTotal === 1 ? "" : "s"}`;
    }
  }
  if (!programId && !search) {
    const metric = document.querySelector("#metric-courses");
    if (metric) metric.textContent = state.courseTotal;
  }
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
  try {
    await deleteJson(`/courses/${course._id}`);
    showToast("Course deleted.");
    await loadData();
  } catch (error) {
    showToast(error.message, true);
  } finally {
    state.selectedCourseToDelete = null;
  }
}
