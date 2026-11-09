import { postJson } from "./api.js";

const form = document.querySelector("#login-form");
const errorMessage = document.querySelector("#login-error");

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorMessage.hidden = true;

  const formData = new FormData(form);

  try {
    await postJson("/auth/login", {
      email: formData.get("email"),
      password: formData.get("password"),
    });
    window.location.replace("index.html");
  } catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.hidden = false;
  }
});
