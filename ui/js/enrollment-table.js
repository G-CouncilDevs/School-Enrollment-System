import { enrollmentState } from "./enrollment-state.js";
import { escapeHtml } from "./ui.js";

// Render enrollments for the selected semester.
export function renderEnrollments() {
  const rows = document.querySelector("#enrollment-rows");
  if (!rows) return;

  const query = document.querySelector("#enrollment-search")?.value.trim().toLowerCase() || "";

  const filtered = query
    ? enrollmentState.enrollments.filter((enrollment) => {
        const student = enrollment.student || {};
        const name = [student.first_name, student.middle_name, student.last_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const studentId = String(student._id || enrollment.student || "").toLowerCase();
        return name.includes(query) || studentId.includes(query);
      })
    : enrollmentState.enrollments;

  if (filtered.length === 0) {
    rows.innerHTML = `<tr><td colspan="6" class="empty">${query ? "No matching enrollments." : "No enrollments yet."}</td></tr>`;
    return;
  }

  rows.innerHTML = filtered
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
            <button type="button" class="btn light small" data-enrollment-edit="${escapeHtml(enrollment._id)}">Edit</button>
            <button type="button" class="btn light small danger-text" data-enrollment-drop="${escapeHtml(enrollment._id)}">Remove</button>
          </td>
        </tr>
      `;
    })
    .join("");
}
