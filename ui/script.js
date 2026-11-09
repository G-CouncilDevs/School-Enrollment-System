import { initializeDashboard } from "./js/dashboard.js";
import { initializeEnrollment } from "./js/enrollment.js";
import { requireAuthentication } from "./js/auth.js";

const initializers = {
  dashboard: initializeDashboard,
  enrollment: initializeEnrollment,
};

const initializePage = initializers[document.body.dataset.page];

if (initializePage) {
  requireAuthentication()
    .then((employee) => {
      if (employee) return initializePage();
    })
    .catch((error) => {
      console.error("Failed to initialize page:", error);
    });
}
