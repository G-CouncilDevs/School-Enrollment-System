import { initializeDashboard } from "./js/dashboard.js";
import { initializeEnrollment } from "./js/enrollment.js";

const initializers = {
  dashboard: initializeDashboard,
  enrollment: initializeEnrollment,
};

const initializePage = initializers[document.body.dataset.page];

if (initializePage) {
  initializePage().catch((error) => {
    console.error("Failed to initialize page:", error);
  });
}
