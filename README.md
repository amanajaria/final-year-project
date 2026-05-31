# 🎓 College ERP — Anti-Gravity Edition

> Full-stack College ERP with swipe-based attendance marking, a physics Easter Egg, and a real-time admin dashboard.

```
┌─────────────────────────────────────────────────────────────────┐
│  Backend         FastAPI (Python 3.11) + PostgreSQL + Alembic   │
│  Web Portal      React 18 + Vite + Tailwind + Recharts          │
│  Mobile App      React Native + Expo SDK 51 + Expo Router       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂 Directory Structure

```
FINAL-YEAR-PROJECT/
├── backend/                 FastAPI API server
│   ├── main.py              App entry point
│   ├── database.py          Async SQLAlchemy engine
│   ├── models.py            ORM models (User, Dept, Schedule, Log)
│   ├── schemas.py           Pydantic v2 schemas
│   ├── auth/
│   │   ├── jwt.py           JWT creation + RBAC dependencies
│   │   └── routes.py        /auth/login, /auth/register
│   ├── routers/
│   │   ├── users.py         /users/students (filter), CRUD
│   │   ├── attendance.py    /attendance/submit (bulk)
│   │   └── announcements.py CRUD announcements
│   ├── alembic/             Migration environment
│   ├── alembic.ini
│   └── requirements.txt
│
├── web-portal/              React + Tailwind admin dashboard
│   └── src/
│       ├── components/
│       │   ├── AntiGravity.jsx      ⭐ Matter.js Easter Egg engine
│       │   └── AntiGravityFAB.jsx   Floating trigger button
│       └── pages/
│           ├── Dashboard.jsx        Recharts analytics
│           ├── Students.jsx         CRUD
│           ├── Teachers.jsx         CRUD
│           └── Announcements.jsx    CRUD
│
└── mobile-app/              Expo React Native app
    └── src/
        ├── app/teacher/index.js     ⭐ Tinder swipe view
        ├── app/teacher/review.js    Pre-submit review grid
        └── app/student/index.js     Dashboard + ring chart
```

---

## ⚙️ Prerequisites

| Tool        | Version  | Install                        |
|-------------|----------|-------------------------------|
| Python      | 3.11+    | python.org                     |
| Node.js     | 20+      | nodejs.org                     |
| PostgreSQL   | 15+      | postgresql.org                 |
| Expo CLI    | latest   | `npm install -g expo-cli`      |

---

## 🚀 Quick Start

### 1️⃣ Clone & Navigate

```bash
# Already in your project folder
cd FINAL-YEAR-PROJECT
```

### 2️⃣ Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv

# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

# Install all dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your PostgreSQL credentials
```

#### Create the database

```sql
-- In psql or pgAdmin:
CREATE DATABASE college_erp;
```

#### Run database migrations

```bash
# Option A: Auto-create tables on first startup (already in main.py lifespan)
# Just start the server — tables are created automatically.

# Option B: Alembic (for production migration tracking)
alembic revision --autogenerate -m "initial_schema"
alembic upgrade head
```

#### Start the FastAPI server

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

> 📖 **Swagger UI**: http://localhost:8000/docs  
> 📘 **ReDoc**:      http://localhost:8000/redoc

#### Seed initial data (optional — via Swagger UI)

```
POST /auth/register
{
  "name": "Admin User",
  "email": "admin@college.edu",
  "password": "Admin@123",
  "role": "admin"
}
```

---

### 3️⃣ Web Portal Setup

```bash
cd web-portal

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

> 🌐 Open: **http://localhost:5173**

#### Build for production

```bash
npm run build
npm run preview
```

---

### 4️⃣ Mobile App Setup

```bash
cd mobile-app

# Install dependencies
npm install

# ⚠️ IMPORTANT: Update your backend IP in src/context/AuthContext.js
# Change BASE_URL to your machine's local IP:
# export const BASE_URL = 'http://192.168.1.XXX:8000'

# Start Expo dev server
npx expo start
```

> 📱 **Scan QR code** with Expo Go app (iOS / Android)  
> 🖥 Press `w` for web, `a` for Android emulator, `i` for iOS simulator

---

## 🔑 API Reference

### Authentication

| Method | Endpoint         | Access   | Description             |
|--------|-----------------|----------|-------------------------|
| POST   | `/auth/register` | Public   | Create new user account |
| POST   | `/auth/login`    | Public   | Get JWT token           |

### Users

| Method | Endpoint                | Access          | Description              |
|--------|------------------------|-----------------|--------------------------|
| GET    | `/users/students`       | Admin, Teacher  | List + filter students   |
| GET    | `/users/me`             | All             | Current user profile     |
| PATCH  | `/users/{id}`           | Admin           | Update user              |
| DELETE | `/users/{id}`           | Admin           | Delete user              |
| GET    | `/users/departments/all`| All             | List departments         |
| POST   | `/users/departments`    | Admin           | Create department        |

### Attendance

| Method | Endpoint                | Access          | Description              |
|--------|------------------------|-----------------|--------------------------|
| POST   | `/attendance/submit`    | Teacher, Admin  | Bulk attendance submit   |
| GET    | `/attendance/summary`   | Admin, Teacher  | Per-student summary      |
| GET    | `/attendance/my`        | Student         | Own attendance logs      |

### Announcements

| Method | Endpoint                 | Access          | Description              |
|--------|-------------------------|-----------------|--------------------------|
| GET    | `/announcements/`        | All             | List announcements       |
| POST   | `/announcements/`        | Admin, Teacher  | Create announcement      |
| PUT    | `/announcements/{id}`    | Admin, Teacher  | Update announcement      |
| DELETE | `/announcements/{id}`    | Admin, Teacher  | Delete announcement      |

---

## 🌀 Easter Eggs

### Web — Anti-Gravity Mode

1. **Keyboard**: Press **`Ctrl + Shift + G`**
2. **Mouse**: Click the floating ⚡ **purple button** (bottom-right corner)

**Effect:** All dashboard cards, sidebar links, and stat panels detach from the DOM and fall due to simulated gravity. You can **drag and throw** any element using your mouse. Press again to restore everything.

> Powered by [Matter.js](https://brm.io/matter-js/) loaded lazily from CDN.

### Mobile — Deck Explosion Mode

1. **Button**: Tap the **⚡ button** (top-right of the swipe screen)
2. **Gesture**: **Shake your device** sharply (accelerometer threshold: > 2.5G)

**Effect:** All remaining student cards in the deck fly outward in random directions with rotation, bounce off virtual screen edges, and fade out — making it look like the cards are escaping the screen!

---

## 🛡 Role-Based Access Control

| Feature                    | Admin | Teacher | Student |
|----------------------------|-------|---------|---------|
| Admin Dashboard            | ✅    | ❌      | ❌      |
| Add/Edit Students          | ✅    | ❌      | ❌      |
| Add/Edit Teachers          | ✅    | ❌      | ❌      |
| Post Announcements         | ✅    | ✅      | ❌      |
| Mark Attendance (Swipe)    | ✅    | ✅      | ❌      |
| View Own Attendance        | ❌    | ❌      | ✅      |
| View Announcements         | ✅    | ✅      | ✅      |

---

## 🗄 Database Schema

```
departments          users                 course_schedules
──────────────       ──────────────────    ────────────────────────
id (PK)              id (PK)               id (PK)
name                 name                  teacher_id → users.id
code (UNIQUE)        email (UNIQUE)        dept_id → departments.id
                     hashed_password       subject_name
                     role (ENUM)           subject_code
                     dept_id → dept.id     semester
                     semester              section
                     section               time_slot
                     roll_no
                     is_active

attendance_logs      announcements
─────────────────    ──────────────────────
id (PK)              id (PK)
student_id → users   title
schedule_id → sched  body
date                 posted_by → users.id
status (ENUM)        target_dept_id → dept
marked_by → users    created_at
                     updated_at
```

---

## 🧪 Running All Services Simultaneously

Open **three terminal windows**:

```bash
# Terminal 1 — Backend
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2 — Web Portal
cd web-portal && npm run dev

# Terminal 3 — Mobile App
cd mobile-app && npx expo start
```

---

## 📦 Tech Stack Summary

| Layer          | Technology                              |
|----------------|-----------------------------------------|
| API Framework  | FastAPI 0.111 + Uvicorn                 |
| ORM            | SQLAlchemy 2.0 (async)                  |
| Database       | PostgreSQL 15 + asyncpg                 |
| Migrations     | Alembic                                 |
| Auth           | JWT (python-jose) + bcrypt              |
| Validation     | Pydantic v2                             |
| Web Framework  | React 18 + Vite 5                       |
| Styling        | Tailwind CSS 3.4 + Inter font           |
| Charts         | Recharts 2.12                           |
| Physics EE     | Matter.js 0.19 (CDN, lazy loaded)       |
| Mobile         | React Native + Expo SDK 51              |
| Navigation     | Expo Router 3.5 (file-based)            |
| Swipe UI       | react-native-deck-swiper                |
| Accelerometer  | expo-sensors                            |
| Animations     | React Native Animated + Reanimated 3    |
