import { deleteJson, putJson, requestJson } from "./api.js";
import { PAGE_SIZE, state } from "./state.js";
import {
  escapeHtml,
  courseEntryMatchesId,
  getFormPayload,
  renderPagination,
  setLoading,
  showToast,
} from "./ui.js";

export function renderStudents() {
  const list = document.querySelector("#student-list");
  if (!list) return;

  const students = state.students;

  list.innerHTML = students.length
    ? students
        .map(
          (student) => {
            const fullName = [student.first_name, student.middle_name, student.last_name]
              .filter(Boolean)
              .join(" ");

            return `
              <li>
                <div>
                  <strong>${escapeHtml(fullName)}</strong>
                  <span class="sub">ID: ${escapeHtml(student._id)}</span>
                </div>
                <button type="button" class="btn light small" data-student-edit="${escapeHtml(student._id)}">Edit</button>
              </li>
            `;
          },
        )
        .join("")
    : '<li class="empty">No students found.</li>';

  const count = document.querySelector("#student-count");
  if (count) count.textContent = `${students.length} student${students.length === 1 ? "" : "s"} shown`;
}

export function openStudentDialog(student) {
  const dialog = document.querySelector("#student-dialog");
  const form = document.querySelector("#student-form");
  if (!dialog || !form) return;

  state.selectedStudent = student;
  form.elements.student_id.value = student._id;
  form.elements.first_name.value = student.first_name || "";
  form.elements.middle_name.value = student.middle_name || "";
  form.elements.last_name.value = student.last_name || "";
  form.elements.sex.value = student.sex || "";
  form.elements.birth_date.value = student.birth_date
    ? String(student.birth_date).slice(0, 10)
    : "";
  form.elements.street.value = student.address?.street || "";
  form.elements.barangay.value = student.address?.barangay || "";
  form.elements.city.value = student.address?.city || "";
  form.elements.province.value = student.address?.province || "";
  dialog.showModal();
}

export async function loadStudents(handleLoadError) {
  const input = document.querySelector("#student-search");
  const programSelect = document.querySelector("#student-program");
  const search = input?.value.trim() || "";
  const programId = programSelect?.value || "";

  const params = new URLSearchParams({
    page: String(state.studentPage),
    limit: String(PAGE_SIZE),
  });
  if (search) params.set("search", search);
  if (programId) params.set("program", programId);

  setLoading("#student-list", "Loading students…");
  const response = await requestJson(`/students?${params}`);
  state.students = response.students || [];
  state.studentTotal = response.total || 0;
  renderStudents();
  renderPagination("#student-pagination", state.studentPage, state.studentTotal, (page) => {
    state.studentPage = page;
    loadStudents(handleLoadError).catch(handleLoadError);
  });
  document.querySelector("#metric-students").textContent = state.studentTotal;
}

export async function updateStudent(event, loadData) {
  event.preventDefault();
  const form = event.currentTarget;
  const student = state.selectedStudent;
  if (!student) return;

  const payload = getFormPayload(form);
  const studentChanges = {
    first_name: payload.first_name,
    middle_name: payload.middle_name,
    last_name: payload.last_name,
    sex: payload.sex,
    birth_date: payload.birth_date,
    address: {
      street: payload.street,
      barangay: payload.barangay,
      city: payload.city,
      province: payload.province,
    },
  };

  try {
    await putJson(`/students/${student._id}`, studentChanges);
    form.closest("dialog").close();
    showToast("Student saved.");
    await loadData();
  } catch (error) {
    showToast(error.message, true);
  }
}

export async function deleteSelectedStudent(student, loadData) {
  if (!window.confirm(`Delete ${student.first_name} ${student.last_name}?`)) return;
  try {
    await deleteJson(`/students/${student._id}`);
    showToast("Student deleted.");
    await loadData();
  } catch (error) {
    showToast(error.message, true);
  }
}
