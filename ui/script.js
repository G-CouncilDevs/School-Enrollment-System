import { initializeDashboard } from "./js/dashboard.js";

initializeDashboard().catch((error) => {
  console.error("Failed to initialize dashboard:", error);
});
