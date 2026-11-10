import { requestJson } from "./api.js";
import {
  createOrUpdateCourse,
  deleteSelectedCourse,
  fetchAllCourses,
  loadCourses,
  openCourseDeleteDialog,
  openCourseDialog,
  openCourseRosterDialog,
  renderCourses,
} from "./courses.js";
import { state } from "./state.js";
import {
  deleteSelectedStudent,
  loadStudents,
  openStudentDialog,
  renderStudents,
  updateStudent,
} from "./students.js";
import {
  renderMajors,
  renderPrograms,
  setLoading,
  showToast,
} from "./ui.js";

async function loadPrograms() {
  const response = await requestJson("/programs?page=1&limit=100");
  state.programs = response.programs || [];
  renderPrograms();
}

function renderDashboardAcademicYears() {
  const years = [...new Set(state.semesters.map((s) => s.academic_year))].sort((a, b) => b - a);
  const select = document.querySelector("#dashboard-year");
  if (!select) return;
  const current = select.value;
  select.innerHTML = years
    .map((year) => `<option value="${year}">${year}</option>`)
    .join("");
  if (current && years.includes(Number(current))) {
    select.value = current;
  }
}

function updateDashboardSemester() {
  const term = document.querySelector("#dashboard-term")?.value;
  const year = Number(document.querySelector("#dashboard-year")?.value);
  const semester = state.semesters.find(
    (s) => s.semester_term === term && s.academic_year === year,
  );
  state.selectedSemester = semester || null;

  const label = document.querySelector("#term-label");
  if (label) {
    if (semester) {
      label.textContent = `Viewing records for ${semester.semester_term} Term AY ${semester.academic_year}.`;
    } else {
      label.textContent = `No active semester found for ${term || "—"} AY ${year || "—"}.`;
    }
  }

  // Update enrolled students metric for the selected semester
  const relevantEnrollments = semester
    ? state.enrollments.filter(
        (e) => String(e.semester?._id || e.semester) === String(semester._id),
      )
    : state.enrollments;

  const enrolledMetric = document.querySelector("#metric-enrolled");
  if (enrolledMetric) {
    enrolledMetric.textContent = new Set(
      relevantEnrollments.map((e) => e.student?._id || e.student),
    ).size;
  }

  // Refresh courses to update "Enrolled this term" counts
  renderCourses();

  // Refresh students list for the selected semester
  state.studentPage = 1;
  loadStudents(handleLoadError).catch(handleLoadError);
}

async function loadEnrollmentData() {
  const [enrollments, blocks, semesters, allStudents, allCourses] = await Promise.all([
    requestJson("/enrollments?page=1&limit=100"),
    requestJson("/blocks?page=1&limit=100"),
    requestJson("/semesters?page=1&limit=100"),
    requestJson("/students?page=1&limit=1"),
    fetchAllCourses().catch((err) => {
      console.error("Failed to load all courses:", err);
      return [];
    }),
  ]);
  state.enrollments = enrollments?.enrollments || enrollments || [];
  state.blocks = blocks?.blocks || blocks || [];
  state.semesters = semesters?.semesters || semesters || [];
  if (Array.isArray(allCourses)) {
    state.allCourses = allCourses;
  }

  const studentsMetric = document.querySelector("#metric-students");
  if (studentsMetric && allStudents?.total !== undefined) {
    studentsMetric.textContent = allStudents.total;
  }

  const coursesMetric = document.querySelector("#metric-courses");
  if (coursesMetric) {
    coursesMetric.textContent = state.allCourses?.length ?? 0;
  }

  renderDashboardAcademicYears();
  updateDashboardSemester();
}

function handleLoadError(error) {
  showToast(error.message, true);
  setLoading("#course-rows", "Unable to load courses.");
  setLoading("#student-list", "Unable to load students.");
}

function bindDashboardEvents(loadData) {
  document.querySelector("#dashboard-term")?.addEventListener("change", updateDashboardSemester);
  document.querySelector("#dashboard-year")?.addEventListener("change", updateDashboardSemester);
  document.querySelector("#course-search")?.addEventListener("input", () => {
    state.coursePage = 1;
    loadCourses(handleLoadError).catch(handleLoadError);
  });
  document.querySelector("#student-search")?.addEventListener("input", () => {
    state.studentPage = 1;
    loadStudents(handleLoadError).catch(handleLoadError);
  });
  document.querySelector("#course-program")?.addEventListener("change", () => {
    state.coursePage = 1;
    loadCourses(handleLoadError).catch(handleLoadError);
  });
  document.querySelector("#student-program")?.addEventListener("change", () => {
    state.studentPage = 1;
    loadStudents(handleLoadError).catch(handleLoadError);
  });
  document.querySelector("#add-course-btn")?.addEventListener("click", () => {
    openCourseDialog().catch(console.error);
  });
  document.querySelector("#course-form")?.addEventListener("submit", (event) => {
    createOrUpdateCourse(event, loadData);
  });
  document.querySelector("#delete-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const course = state.selectedCourseToDelete;
    if (!course) return;

    deleteSelectedCourse(course, loadData);
    event.currentTarget.closest("dialog")?.close();
  });
  document.querySelector("#student-form")?.addEventListener("submit", (event) => {
    updateStudent(event, loadData);
  });
  document.querySelector("#student-delete-btn")?.addEventListener("click", () => {
    if (state.selectedStudent) deleteSelectedStudent(state.selectedStudent, loadData);
  });

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog")?.close());
  });

  document.addEventListener("click", (event) => {
    const courseRoster = event.target.closest("[data-course-roster]");
    if (courseRoster) {
      const course = state.courses.find(
        (c) => String(c._id) === courseRoster.dataset.courseRoster,
      );
      if (course) openCourseRosterDialog(course);
      return;
    }

    const courseEdit = event.target.closest("[data-course-edit]");
    if (courseEdit) {
      const courseId = courseEdit.dataset.courseEdit;
      const course =
        (state.allCourses || []).find((c) => String(c._id) === courseId) ||
        state.courses.find((c) => String(c._id) === courseId);
      openCourseDialog(course).catch(console.error);
      return;
    }

    const courseDelete = event.target.closest("[data-course-delete]");
    if (courseDelete) {
      const courseId = courseDelete.dataset.courseDelete;
      const course =
        (state.allCourses || []).find((candidate) => String(candidate._id) === courseId) ||
        state.courses.find((candidate) => String(candidate._id) === courseId);
      if (course) openCourseDeleteDialog(course);
      return;
    }

    const studentEdit = event.target.closest("[data-student-edit]");
    if (studentEdit) {
      const student = state.students.find(
        (candidate) => String(candidate._id) === studentEdit.dataset.studentEdit,
      );
      if (student) openStudentDialog(student);
    }
  });

  document.querySelector('[data-programs]')?.addEventListener("change", (event) => {
    renderMajors(event.target.value, document.querySelector("[data-majors]"));
  });
}

export async function initializeDashboard() {
  if (document.body.dataset.page !== "dashboard") return;

  const loadData = async () => {
    await Promise.all([
      loadCourses(handleLoadError),
      loadStudents(handleLoadError),
      loadEnrollmentData(),
    ]);
  };

  bindDashboardEvents(loadData);
  try {
    await loadPrograms();
    await loadData();
  } catch (error) {
    handleLoadError(error);
  }
}
