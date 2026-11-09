import { requestJson } from "./api.js";

export async function requireAuthentication() {
  try {
    const response = await requestJson("/auth/me");
    updateUserMenu(response.employee);
    return response.employee;
  } catch (error) {
    if (error.message === "Authentication required") {
      window.location.replace("login.html");
      return null;
    }

    throw error;
  }
}

function updateUserMenu(employee) {
  const name = [employee.first_name, employee.last_name].filter(Boolean).join(" ");
  const initials = [employee.first_name, employee.last_name]
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  document.querySelectorAll("[data-user-name]").forEach((element) => {
    element.textContent = name;
  });
  document.querySelectorAll("[data-user-initials]").forEach((element) => {
    element.textContent = initials;
  });

  document.querySelectorAll("[data-logout]").forEach((element) => {
    element.addEventListener("click", async (event) => {
      event.preventDefault();
      try {
        await requestJson("/auth/logout", { method: "POST" });
      } finally {
        window.location.replace("login.html");
      }
    });
  });
}
