# School Enrollment System

> **CS3 System Presentation Project — Topic 4: School Enrollment System**  
> A full-stack web application built with **Node.js, Express, MongoDB (Mongoose), and Vanilla JavaScript**.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Team Members & Contributions](#team-members--contributions)
3. [Tech Stack](#tech-stack)
4. [Local Setup & Installation](#local-setup--installation)
5. [REST API Documentation](#rest-api-documentation)

---

## Project Overview

The **School Enrollment System** manages student registrations, academic courses, section blocks, and term enrollments. It provides an intuitive interface for school administrators to manage courses, enroll students into sections with automatic seat capacity enforcement, view student rosters per course, search student records, and monitor real-time enrollment statistics.

---

## Team Members & Contributions

Summary of contributions based on git commit history and project roles:

### 1. **Kurt** (`@PizzaMcrust`) — Backend & Database
- Set up the MongoDB connection and defined the Mongoose schemas for students, courses, enrollments, and sections.
- Built the sequential student ID generator (`YYYY + 6 digits`).
- Implemented the initial backend CRUD route handlers and validation rules.
- Created integration test suites in `handler_test/` to verify database operations.

### 2. **GabeNFree** (`@GabeNFree`) — Frontend UI & Layout
- Built the HTML and CSS structure for the Login, Dashboard, and Enrollment pages.
- Designed responsive UI components, including modal popups, data tables, navigation tabs, and form layouts.
- Styled and organized the static frontend files without using external CSS or JS frameworks.

### 3. **minty** (`@mintyZer0`) — Full-Stack Integration & Enrollment Logic
- Connected the frontend to backend APIs using vanilla JavaScript and `fetch()`.
- Built the enrollment logic, including section filtering, year-level restrictions, and seat capacity tracking.
- Implemented the course roster modal, search bar, active semester term filters, and pagination.
- Added session authentication, database seed scripts, and integration bug fixes.

---

## Tech Stack

- **Runtime Environment:** [Node.js](https://nodejs.org/) (v20+)
- **Back-End Framework:** [Express.js](https://expressjs.com/) (v5)
- **Database:** [MongoDB](https://www.mongodb.com/) (Atlas Cloud Cluster)
- **Object Data Modeling (ODM):** [Mongoose](https://mongoosejs.com/) (v9)
- **Authentication & Security:** `express-session`, `crypto` (scrypt password hashing)
- **Front-End:** Vanilla **HTML5, CSS3, and JavaScript (ES Modules, Fetch API)**

---

## Local Setup & Installation

Follow these steps to run the application locally:

### 1. Clone the Repository

```bash
git clone https://github.com/G-CouncilDevs/School-Enrollment-System.git
cd School-Enrollment-System
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
MONGODB_USERNAME=your_mongodb_username
MONGODB_PASSWORD=your_mongodb_password
SESSION_SECRET=super_secret_session_key_12345
ADMIN_EMAIL=admin@school.edu
ADMIN_PASSWORD=admin123
PORT=3000
```

### 4. Seed the Database (Optional but Recommended)

Populate the database with realistic programs, semesters, courses, blocks, and sample students:

```bash
node --env-file=.env scripts/populate-data.js
```

### 5. Start the Application

```bash
npm start
```

The application will be running at: **`http://localhost:3000`**

### 6. Default Login Credentials

- **Email:** `admin@school.edu`
- **Password:** `admin123`

---

## REST API Documentation

All API routes return JSON and appropriate HTTP status codes (`200`, `201`, `400`, `404`, `409`, `500`). Protected endpoints require an active session.

| Method     | Endpoint               | Description                           | Query Parameters                                           |
| :--------- | :--------------------- | :------------------------------------ | :--------------------------------------------------------- |
| **POST**   | `/api/auth/login`      | Authenticate employee & start session | —                                                          |
| **POST**   | `/api/auth/logout`     | Terminate session                     | —                                                          |
| **GET**    | `/api/courses`         | List paginated courses                | `search`, `program`, `page`, `limit`                       |
| **GET**    | `/api/courses/:id`     | Get course details                    | —                                                          |
| **POST**   | `/api/courses`         | Create new course                     | —                                                          |
| **PUT**    | `/api/courses/:id`     | Update course name, units, prereqs    | —                                                          |
| **DELETE** | `/api/courses/:id`     | Delete course (with relation checks)  | —                                                          |
| **GET**    | `/api/students`        | List paginated students               | `search`, `program`, `course`, `semester`, `page`, `limit` |
| **GET**    | `/api/students/:id`    | Get student details                   | —                                                          |
| **PUT**    | `/api/students/:id`    | Update student profile                | —                                                          |
| **DELETE** | `/api/students/:id`    | Delete student (with relation checks) | —                                                          |
| **GET**    | `/api/enrollments`     | List enrollments                      | `semester`, `student`, `block`, `page`, `limit`            |
| **POST**   | `/api/enrollments`     | Enroll new or existing student        | —                                                          |
| **PUT**    | `/api/enrollments/:id` | Edit enrollment year level or program | —                                                          |
| **DELETE** | `/api/enrollments/:id` | Remove enrollment & release seats     | —                                                          |
| **GET**    | `/api/semesters`       | List academic terms and offerings     | `semester_term`, `page`, `limit`                           |
| **GET**    | `/api/programs`        | List degree programs and curricula    | `page`, `limit`                                            |
| **GET**    | `/api/blocks`          | List sections & course schedules      | `semester`, `program`, `year_level`                        |

---
