import { enrollmentState } from "./enrollment-state.js";
import { escapeHtml } from "./ui.js";

// Fill program dropdowns with programs loaded from the API.
export function renderPrograms() {
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
export function renderProgramMajor(programId, select) {
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
export function renderAcademicYears() {
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
export function getSelectedSemester() {
  const term = document.querySelector("#enroll-term")?.value;
  const year = Number(document.querySelector("#enroll-year")?.value);
  return enrollmentState.semesters.find(
    (semester) =>
      semester.semester_term === term && semester.academic_year === year,
  );
}

// NOTE: This logic mirrors helper/year_helper.js on the backend. If the section naming convention changes, update both files.
// Determine the year level (1-4) of a section from its year_level field or section_name.
export function getBlockYearLevel(block) {
  if (block?.year_level) return Number(block.year_level);
  const s = String(block?.section_name || block || "");
  const m =
    s.match(/(\d+)(?:st|nd|rd|th)?[-_ ]*(?:year|yr)?[-_ ]*[A-Za-z]/i) ||
    s.match(/[-_ ]?([1-4])[A-Za-z]/i) ||
    s.match(/([1-4])/);
  return m ? Number(m[1]) : null;
}

// Fill section dropdowns with blocks belonging to the selected semester, program, major, and year level.
export function renderBlocks(container = null) {
  const semester = getSelectedSemester();
  enrollmentState.selectedSemester = semester || null;

  const targets = container
    ? container.querySelectorAll("[data-sections]")
    : document.querySelectorAll("[data-sections]");

  targets.forEach((select) => {
    const parent = select.closest("#new-part, #existing-part") || document;
    const isNew = parent.id === "new-part" || Boolean(parent.closest("#new-part"));
    const programId = parent.querySelector?.('[name="program"]')?.value;
    const major = parent.querySelector?.('[name="major"]')?.value;
    const yearSelect = parent.querySelector?.('[name="standing_year"]');
    const standingYear = isNew ? 1 : (yearSelect?.value ? Number(yearSelect.value) : null);

    const matchingBlocks = enrollmentState.blocks.filter((block) => {
      const matchesSemester =
        String(block.semester?._id || block.semester) === String(semester?._id);
      if (!matchesSemester) return false;

      // Filter by standing year (1st, 2nd, 3rd, 4th year)
      if (standingYear) {
        const blockYear = getBlockYearLevel(block);
        if (blockYear && blockYear !== standingYear) {
          return false;
        }
      }

      // Filter by program if program is selected
      if (programId) {
        if (block.program) {
          if (String(block.program?._id || block.program) !== String(programId)) {
            return false;
          }
        } else {
          // Fallback: infer program from section_name prefix when block.program is unset.
          // Assumes BSCS = Computer Science, BSIT = Information Technology.
          // If new programs are added, extend this list or ensure blocks always store a program reference.
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
    else if (!isNew && !standingYear) placeholder = "Select year level first";
    else if (matchingBlocks.length === 0) {
      placeholder = standingYear
        ? `No sections available for Year ${standingYear}`
        : "No sections available";
    }

    const prevValue = select.value;
    const options = matchingBlocks
      .map(
        (block) =>
          `<option value="${escapeHtml(block._id)}">${escapeHtml(block.section_name)}</option>`,
      )
      .join("");

    select.innerHTML = `<option value="">${placeholder}</option>${options}`;
    if (matchingBlocks.some((b) => String(b._id) === String(prevValue))) {
      select.value = prevValue;
    } else {
      select.value = "";
      if (
        enrollmentState.selectedBlock &&
        String(enrollmentState.selectedBlock._id) === String(prevValue)
      ) {
        enrollmentState.selectedBlock = null;
      }
    }
  });

  renderBlockCourses();
}

// Store the block selected for the current enrollment.
export function selectBlock(event) {
  enrollmentState.selectedBlock =
    enrollmentState.blocks.find(
      (block) => String(block._id) === String(event.target.value),
    ) || null;
  renderBlockCourses();
}

// Show selected block courses and their prerequisite names.
export function renderBlockCourses() {
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

  renderExtraCourseOptions();
}

// Populate the extra-course select with semester offerings not in the selected block.
export function renderExtraCourseOptions() {
  const select = document.querySelector("#extra-course");
  if (!select) return;

  const blockCourseIds = new Set(
    (enrollmentState.selectedBlock?.courses || []).map(({ course }) =>
      String(course._id || course),
    ),
  );

  const offerings = enrollmentState.selectedSemester?.offerings || [];
  const extras = offerings
    .filter((offering) => {
      const courseId = String(offering.course?._id || offering.course);
      return !blockCourseIds.has(courseId) && offering.course_active;
    })
    .map((offering) => {
      const courseId = String(offering.course?._id || offering.course);
      const course = enrollmentState.courses.find(
        (c) => String(c._id) === courseId,
      );
      if (!course) return null;
      const available = Math.max((offering.capacity || 0) - (offering.enrolled || 0), 0);
      const label = `${course.code} · ${course.name} (${available}/${offering.capacity} seats)`;
      return { id: courseId, label, available };
    })
    .filter(Boolean);

  select.innerHTML =
    '<option value="">Select a course…</option>' +
    extras
      .map(
        (extra) =>
          `<option value="${escapeHtml(extra.id)}" ${extra.available === 0 ? "disabled" : ""}>${escapeHtml(extra.label)}</option>`,
      )
      .join("");
}
