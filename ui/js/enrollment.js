import { enrollmentState } from "./enrollment-state.js";
import { requestJson } from "./api.js";
import {
  renderPrograms,
  renderAcademicYears,
  renderBlocks,
  getBlockYearLevel,
} from "./enrollment-render.js";
import { loadEnrollments, bindEnrollmentEvents } from "./enrollment-form.js";

export { getBlockYearLevel };

// Load programs, semesters, blocks, and courses into shared enrollment state.
async function loadReferenceData() {
  const [programs, semesters, blocks, courses] = await Promise.all([
    requestJson("/programs?page=1&limit=100"),
    requestJson("/semesters?page=1&limit=100"),
    requestJson("/blocks?page=1&limit=100"),
    requestJson("/courses?page=1&limit=200"),
  ]);

  enrollmentState.programs = programs.programs || [];
  enrollmentState.semesters = semesters.semesters || [];
  enrollmentState.blocks = blocks.blocks || [];
  enrollmentState.courses = courses.courses || [];
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
