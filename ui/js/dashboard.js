import { requestJson } from "./api.js";
import {
  createOrUpdateCourse,
  deleteSelectedCourse,
  loadCourses,
  openCourseDialog,
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

async function loadEnrollmentData() {
  const [enrollments, blocks] = await Promise.all([
    requestJson("/enrollments"),
    requestJson("/blocks"),
  ]);
  state.enrollments = enrollments?.enrollments || enrollments || [];
  state.blocks = blocks?.blocks || blocks || [];
  document.querySelector("#metric-enrolled").textContent = new Set(
    state.enrollments.map((enrollment) => enrollment.student),
  ).size;
}

function handleLoadError(error) {
  showToast(error.message, true);
  setLoading("#course-rows", "Unable to load courses.");
  setLoading("#student-list", "Unable to load students.");
}

function bindDashboardEvents(loadData) {
  document.querySelector("#course-search")?.addEventListener("input", () => {
    state.coursePage = 1;
    loadCourses(handleLoadError).catch(handleLoadError);
  });
  document.querySelector("#student-search")?.addEventListener("input", () => {
    state.studentPage = 1;
    loadStudents(handleLoadError).catch(handleLoadError);
  });
  document.querySelector("#course-program")?.addEventListener("change", renderCourses);
  document.querySelector("#student-course")?.addEventListener("change", renderStudents);
  document.querySelector("#add-course-btn")?.addEventListener("click", () => openCourseDialog());
  document.querySelector("#course-form")?.addEventListener("submit", (event) => {
    createOrUpdateCourse(event, loadData);
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
    const courseEdit = event.target.closest("[data-course-edit]");
    if (courseEdit) {
      openCourseDialog(
        state.courses.find((course) => String(course._id) === courseEdit.dataset.courseEdit),
      );
      return;
    }

    const courseDelete = event.target.closest("[data-course-delete]");
    if (courseDelete) {
      const course = state.courses.find(
        (candidate) => String(candidate._id) === courseDelete.dataset.courseDelete,
      );
      if (course) deleteSelectedCourse(course, loadData);
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
