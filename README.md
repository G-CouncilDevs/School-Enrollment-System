# Student & Course Management System

A web-based management system built to handle course creation, student registration, course enrollments, and student lookups.

---

## 1. Key Features

* **Manage Courses:** Add new courses to the system.
* **Student Enrollment:** Enroll a student in a specific course.
* **Course Roster:** View and list students registered per course.
* **Student Search:** Search for specific student records.
* **Enrollment Metrics:** Dashboard displaying total count of enrolled students.

---

## 2. Technical Requirements

1. **Database:** MongoDB database using Mongoose with at least two related collections (e.g., `Students`, `Courses`, `Enrollments`).
2. **Full CRUD Operations:** Complete Create, Read, Update, and Delete capabilities on the main entity working directly from the web interface.
3. **REST API:** Express server providing RESTful JSON endpoints with proper HTTP status codes.
4. **Vanilla Front-End Stack:** Built using standard **HTML, CSS, and plain JavaScript** with the `fetch` API. Files must be cleanly separated (`index.html`, `style.css`, `script.js`).
   * ⚠️ *No front-end frameworks allowed (No React, Vue, Angular, etc.).*
5. **Extra Feature:** At least one search bar, filter, or dashboard counter implementation.
6. **Validation & Messaging:** Basic client/server input validation with clear success and error UI feedback.
7. **Deployment:** Operable locally or hosted online (e.g., MongoDB Atlas for DB, Render for app hosting).

---

## 3. Grading Rubric (100 Points Total)

| Criteria | Description | Points |
| :--- | :--- | :---: |
| **Database Design** | Mongoose schema with at least two related collections | **10** |
| **REST API** | Complete CRUD routes returning JSON with correct status codes | **15** |
| **Core Functionality** | Add, View, Edit, and Delete all work from the web page | **20** |
| **Extra Feature** | Working search box, filter, or dashboard record count | **10** |
| **Front End** | HTML, CSS, and vanilla JS (`fetch`), clean, usable, separated files | **10** |
| **Validation & Error Handling** | Required fields validated with clear success/error messages | **5** |
| **Deployment** | App hosted online with a working live link | **10** |
| **Documentation** | `README.md` with setup steps, team members, and roles | **5** |
| **Presentation & Demo** | Clear walkthrough and technical explanation of code | **10** |
| **Individual Mastery** | Ability to explain personal contributions and answer technical questions | **5** |
| **TOTAL** | | **100** |