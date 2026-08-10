# 🌙 Ilm Platform — Islamic Learning Management System

> **Authentic Islamic Knowledge** — A full-featured LMS connecting students with qualified scholars.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Quick Start](#quick-start)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [User Roles](#user-roles)
7. [Student Guide](#student-guide)
8. [Scholar Guide](#scholar-guide)
9. [Admin Guide](#admin-guide)
10. [Feature Reference](#feature-reference)
11. [Project Structure](#project-structure)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)

---

## Overview

Ilm Platform is a production-ready Islamic LMS built with Next.js 16, supporting:

- **Students** — Browse, enroll, and learn from structured courses and lectures
- **Scholars** — Publish courses, lectures, and quizzes with analytics
- **Admins** — Manage all content, users, enrollments, and platform settings

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Database | PostgreSQL |
| ORM | Prisma 7 |
| Auth | NextAuth v4 (JWT + Google OAuth) |
| Styling | Tailwind CSS v4 |
| State | TanStack Query v5 |
| Media | Cloudinary |
| Email | Resend API |
| Rate Limiting | In-memory (upgrade to Redis in production) |


---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Git

### 1. Clone and install

```bash
git clone https://github.com/mu534/ilm-platform.git
cd ilm-platform
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
# Edit .env with your values (see Environment Variables section)
```

### 3. Set up the database

```bash
# Apply all migrations
npx prisma migrate deploy

# Generate the Prisma client
npx prisma generate

# Seed Islamic categories
node prisma/seed.mjs
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Create your first Admin account

1. Register at `/register`
2. Open a database client (pgAdmin, TablePlus, or psql)
3. Run:
   ```sql
   UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';
   ```
4. Log out and log back in — you now have Admin access


---

## Environment Variables

Create a `.env` file in the project root:

```env
# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/ilm_platform"

# ── NextAuth ──────────────────────────────────────────────────────────────────
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"

# ── Google OAuth (optional) ───────────────────────────────────────────────────
# Get from: https://console.cloud.google.com → APIs & Services → Credentials
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# ── Cloudinary (for file uploads) ─────────────────────────────────────────────
# Get from: https://cloudinary.com/console
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# ── Resend Email (optional) ───────────────────────────────────────────────────
# Get from: https://resend.com — free 3,000 emails/month
# Leave empty to log emails to console in development
RESEND_API_KEY=""
EMAIL_FROM="noreply@yourdomain.com"

# ── Email verification enforcement ───────────────────────────────────────────
# Set to "true" to block login until email is verified
REQUIRE_EMAIL_VERIFICATION=false
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable **Google+ API**
4. Go to **Credentials** → **Create OAuth 2.0 Client ID**
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Secret to `.env`


---

## Database Setup

### Fresh installation

```bash
# Create the database
createdb ilm_platform

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed default Islamic categories
node prisma/seed.mjs
```

### Resetting the database (development only)

```bash
npx prisma migrate reset
npx prisma generate
node prisma/seed.mjs
```

### Viewing data

```bash
npx prisma studio
# Opens at http://localhost:5555
```

---

## User Roles

| Role | Description | Capabilities |
|------|-------------|-------------|
| **USER** | Default for all new registrations | Browse content, enroll in courses, comment, bookmark, rate |
| **INSTRUCTOR** | Promoted by Admin | Everything USER can do + create courses/lectures/quizzes, view analytics |
| **ADMIN** | Platform administrator | Full access to everything |

### Promoting a user to Instructor or Admin

**Via Admin Panel:**
1. Go to `/admin/users`
2. Find the user
3. Click the `⋮` menu → **Change Role** → select **INSTRUCTOR** or **ADMIN**

**Via SQL (bootstrap only):**
```sql
UPDATE users SET role = 'INSTRUCTOR' WHERE email = 'instructor@example.com';
```


---

## Student Guide

### Getting Started

1. **Register** at `/register` with your email and password, or **Continue with Google**
2. **Verify your email** — check your inbox and click the verification link
3. **Sign in** at `/login`

### Finding Courses

- Browse all courses at `/courses`
- Filter by **Category**, **Difficulty**, or **Tags**
- Search for a topic using the search bar (top of every page)
- Click on a course to see the full description, curriculum, and instructor

### Enrolling in a Course

1. Open any course detail page
2. Click **"Enroll Now — Free"** in the sidebar
3. You are immediately enrolled and redirected to the curriculum

> ⚠️ Lectures inside a course are **locked until you enroll**. Standalone lectures (not in a course) are always accessible.

### Learning

1. Go to your **Dashboard** at `/dashboard`
2. Under **"Continue Learning"** — see your last-viewed lectures
3. Under **"My Courses"** — see progress bars for each enrolled course
4. Click any lecture to open it
5. After watching/reading, click **"Mark Complete"** to track your progress

### Tracking Progress

- Your progress percentage updates automatically as you mark lectures complete
- A **Certificate** is automatically issued when you reach 100% and pass all quizzes
- View all certificates at `/dashboard/certificates` — click **View / Download** to open a printable PDF

### Quizzes

1. Quizzes appear at the end of each module (listed in the curriculum)
2. Navigate to `/quiz/[id]` — you'll see the quiz start screen
3. Click **Start Quiz** to begin
4. Select answers and click **Submit Quiz**
5. Your result (pass/fail, score) is shown immediately
6. View your full quiz history at `/dashboard/quiz-history`

### Other Features

| Feature | Where |
|---------|-------|
| Bookmarks | `/dashboard/bookmarks` — save lectures and courses for later |
| Certificates | `/dashboard/certificates` — download earned certificates |
| Forum | `/forum` — ask questions, get answers from the community |
| Follow Scholars | Scholar profile page → **Follow** button |
| Like Lectures | ♥ icon on any lecture page |
| Rate a Course | Course detail page → bottom of page (only after enrolling) |
| Comment | Bottom of any lecture page |
| Reply to Comment | Hover a comment → click **Reply** |
| Report Content | Hover a comment → click the flag icon |
| Change Password | `/profile` → Security section |
| Language | NavBar → Globe icon → choose English / العربية / Afaan Oromo |
| Dark/Light Mode | NavBar → Toggle switch (pill icon) |


---

## Scholar Guide

### Becoming a Scholar

1. Register a normal account
2. Ask the Admin to promote your account to **SCHOLAR** role
3. Once promoted, your Scholar profile is auto-created
4. Complete your profile at `/scholars/[your-id]/edit`

### Setting Up Your Profile

Go to `/scholars/[your-id]/edit` or click **Edit Profile** on your public profile page:

- Upload a **profile photo**
- Write a detailed **biography** (min 20 characters)
- Add **Areas of Knowledge** (e.g. Quran, Fiqh, Arabic)
- Add **Qualifications** (degrees, institutions)

### Creating a Course

1. Go to `/admin/courses/new`
2. Fill in:
   - **Title** and **Description** (min 20 chars)
   - **Category** (e.g. Quran, Hadith, Fiqh)
   - **Difficulty** level and estimated duration
   - **Thumbnail** and **Banner** images (upload via Cloudinary)
   - **Learning Objectives** (what students will learn)
   - **Prerequisites** (what students need to know first)
   - **Tags** (comma-separated, for search)
3. Check **"Publish immediately"** or leave as Draft
4. Click **Create Course**

### Building Course Content (Course Builder)

After creating a course, click **"Build"** in the courses table or go to `/admin/courses/[id]/builder`:

**Adding Modules:**
1. Click **"Add Module"**
2. Enter a module title (e.g. "Introduction", "Week 1")
3. Click **"Add Module"** — it appears in the list
4. Drag to reorder using ↑↓ arrows

**Adding Lessons:**
1. Inside each module, click **"Add Lesson"**
2. Enter the lesson title and choose the content type:
   - 📝 **Article** — text content
   - 🎥 **Video** — upload or link a video
   - 🎧 **Audio** — audio lecture
   - 📄 **PDF** — PDF document
3. Check **"Publish immediately"** or leave as Draft
4. Click **"Add Lesson"**

**Editing Lesson Content:**
- Click the ✏️ icon next to any lesson → goes to the full lecture editor at `/admin/lectures/[id]/edit`
- Here you can upload media files, write HTML content, set tags, and add downloadable resources

**Adding a Quiz to a Module:**
1. Click the **"Q"** button next to the module
2. Set quiz title, passing score (default 70%), and optional time limit
3. Click **"Create Quiz"**
4. Click **"Add Question"** for each question:
   - Choose **Multiple Choice** or **True/False**
   - Write the question text
   - Select the correct answer (radio button)
   - Optionally add an explanation shown after answering
5. Save — students can now take the quiz from the course page

### Submitting a Course for Review

If you are a Scholar, your courses require Admin approval before going live:

1. Go to `/admin/courses`
2. Click **Edit** on your course
3. In the edit page, click **"Submit for Review"** (visible when status is Draft)
4. An Admin will review and approve or reject with feedback

### Scholar Dashboard & Analytics

- **Dashboard**: `/dashboard/scholar` — overview stats (views, followers, students, ratings)
- **Analytics**: `/dashboard/scholar/analytics` — top lectures, content breakdown, growth metrics, recent comments
- **Students**: `/dashboard/scholar/students` — see all students enrolled in your courses with progress


---

## Admin Guide

### Admin Panel

Access at `/admin` — only accessible to users with the **ADMIN** role.

The sidebar contains:
| Section | URL | Purpose |
|---------|-----|---------|
| Overview | `/admin` | Platform stats and recent activity |
| Analytics | `/admin/analytics` | Charts, top content, completion rates |
| Courses | `/admin/courses` | Manage all courses |
| Lectures | `/admin/lectures` | Manage all lectures |
| Enrollments | `/admin/enrollments` | View/remove enrollments, export CSV |
| Users | `/admin/users` | Manage users, change roles |
| Scholars | `/admin/scholars` | Feature, verify, delete scholar profiles |
| Reports | `/admin/reports` | Review reported comments |
| CMS | `/admin/cms` | Edit homepage banners and announcements |
| Audit Log | `/admin/audit-log` | Review all admin actions |

### Managing Users

Go to `/admin/users`:
- **Search** by name or email
- **Filter** by role (Admin / Scholar / User)
- **Change Role**: click `⋮` → Change Role → select new role
  - Setting a user to **SCHOLAR** auto-creates their scholar profile
- **Delete User**: click `⋮` → Delete User (irreversible — deletes all their content)

### Managing Scholars

Go to `/admin/scholars`:
- **Verify a Scholar**: click `⋮` → **Verify** — adds a ✓ verified badge to their profile
- **Feature a Scholar**: click `⋮` → **Feature** — shows them on the homepage
- **Edit Their Info**: click `⋮` → **Edit Info** — edit bio, topics, qualifications, photo
- **Delete Profile**: click `⋮` → **Delete Profile**

### Approving Courses

When a Scholar submits a course for review:
1. You receive a notification in the bell icon
2. Go to `/admin/courses` — courses with status **"PENDING REVIEW"** are highlighted
3. Click **Edit** on the course to review all details
4. In the edit page:
   - Click **Approve** → course is published and scholar is notified
   - Click **Reject** → enter feedback, scholar is notified to revise

### Managing Content Reports

Go to `/admin/reports`:
1. Pending reports are shown at the top
2. Click `⋮` on any report:
   - **Mark Reviewed** — acknowledge without action
   - **Resolve & Hide Comment** — hide the comment from public view
   - **Dismiss** — dismiss as not a violation

### CMS — Homepage Content

Go to `/admin/cms`:
- Use **Quick Add Presets** to create homepage content blocks:
  - `homepage_banner` — main hero banner text/image
  - `homepage_announcement` — announcement bar
  - `footer_message` — custom footer text
- Set **Active** to show/hide content
- Set **Order** to control display order

### Audit Log

Go to `/admin/audit-log`:
- See all admin actions: role changes, user deletions, etc.
- Filter by **Action** type
- Search by admin name or target entity
- IP addresses are logged for security

### Enrollment Management

Go to `/admin/enrollments`:
- Search by student name, email, or course title
- Filter by status (Active / Completed / Dropped)
- **Remove Enrollment**: click 🗑️ (also removes access to course content)
- **Export CSV**: download full enrollment report


---

## Feature Reference

### Authentication
| Feature | URL | Notes |
|---------|-----|-------|
| Register | `/register` | Email + password or Google |
| Login | `/login` | Email, password, or Google |
| Verify email | `/verify-email` | Check inbox after registration |
| Forgot password | `/forgot-password` | Enter email to receive reset link |
| Reset password | `/reset-password?token=...` | Link sent to email |
| Change password | `/profile` → Security | Requires current password |

### Student Features
| Feature | URL |
|---------|-----|
| Dashboard | `/dashboard` |
| Browse Courses | `/courses` |
| Browse Lectures | `/lectures` |
| Course Detail | `/courses/[slug]` |
| Lecture Detail | `/lectures/[slug]` |
| My Bookmarks | `/dashboard/bookmarks` |
| My Certificates | `/dashboard/certificates` |
| Quiz History | `/dashboard/quiz-history` |
| Take a Quiz | `/quiz/[id]` |
| Forum | `/forum` |
| Ask a Question | `/forum/ask` |

### Scholar Features
| Feature | URL |
|---------|-----|
| Scholar Dashboard | `/dashboard/scholar` |
| Analytics | `/dashboard/scholar/analytics` |
| My Students | `/dashboard/scholar/students` |
| Edit Profile | `/scholars/[id]/edit` |
| New Course | `/admin/courses/new` |
| Course Builder | `/admin/courses/[id]/builder` |
| New Lecture | `/admin/lectures/new` |
| Quiz Builder | `/admin/modules/[id]/quiz` |

### Admin Features
| Feature | URL |
|---------|-----|
| Admin Overview | `/admin` |
| Analytics | `/admin/analytics` |
| Course Management | `/admin/courses` |
| Lecture Management | `/admin/lectures` |
| Enrollment Management | `/admin/enrollments` |
| User Management | `/admin/users` |
| Scholar Management | `/admin/scholars` |
| Reports | `/admin/reports` |
| CMS | `/admin/cms` |
| Audit Log | `/admin/audit-log` |

---

## Project Structure

```
ilm-platform/
├── app/
│   ├── admin/              # Admin panel pages
│   │   ├── analytics/      # Platform analytics
│   │   ├── audit-log/      # Security audit log
│   │   ├── cms/            # Content management
│   │   ├── courses/        # Course & module builder
│   │   ├── enrollments/    # Enrollment management
│   │   ├── lectures/       # Lecture management
│   │   ├── reports/        # Content moderation
│   │   ├── scholars/       # Scholar management
│   │   └── users/          # User management
│   ├── api/                # All API route handlers
│   ├── components/         # Reusable React components
│   │   ├── courses/        # CourseCard, EnrollButton, etc.
│   │   ├── lectures/       # LectureCard, LikeButton, etc.
│   │   ├── scholars/       # ScholarCard, FollowButton
│   │   └── ui/             # Badge, Skeleton, etc.
│   ├── courses/            # Public course pages
│   ├── dashboard/          # Student & scholar dashboards
│   ├── forum/              # Discussion forum
│   ├── lectures/           # Public lecture pages
│   ├── lib/                # Auth, email, Prisma, validations
│   ├── quiz/               # Quiz taking pages
│   └── scholars/           # Public scholar profiles
├── prisma/
│   ├── schema.prisma       # Full database schema (30 models)
│   ├── migrations/         # All database migrations
│   └── seed.mjs            # Seeds 10 Islamic categories
├── generated/
│   └── prisma/             # Auto-generated Prisma client
└── middleware.ts           # Route protection + security headers
```


---

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repo on [vercel.com](https://vercel.com)
3. Add all environment variables in Vercel project settings
4. For the database, use [Supabase](https://supabase.com) or [Neon](https://neon.tech) (free PostgreSQL)
5. Deploy — Vercel handles build and routing automatically

**Important:** Add your Vercel domain to Google OAuth authorized redirect URIs:
```
https://yourdomain.vercel.app/api/auth/callback/google
```

### Self-hosted (VPS/Docker)

```bash
# Build
npm run build

# Start production server
npm run start
```

Or use Docker:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Database in Production

Use a managed PostgreSQL service:
- **Supabase** — free tier, generous limits
- **Neon** — serverless PostgreSQL, free tier
- **Railway** — simple hosting with built-in PostgreSQL
- **Render** — free PostgreSQL (spins down after inactivity)

After deploying, run migrations:
```bash
npx prisma migrate deploy
npx prisma generate
node prisma/seed.mjs
```

---

## Troubleshooting

### "Invalid credentials" on login
- Check your email and password are correct
- If you signed up with Google, you cannot login with email/password
- Use **Forgot Password** to reset

### Email verification link not arriving
- Check spam/junk folder
- Go to `/verify-email` and click **Resend Verification Email**
- In development, check your terminal — email content is logged to console

### Prisma errors after schema changes
```bash
npx prisma migrate deploy
npx prisma generate
# Then restart the dev server
```

### Cloudinary uploads failing
- Verify `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `.env`
- Check Cloudinary dashboard for upload limits

### Google OAuth "redirect_uri_mismatch"
- Add exact URI to Google Console: `http://localhost:3000/api/auth/callback/google`
- For production: `https://yourdomain.com/api/auth/callback/google`

### Course builder not loading modules
- Ensure the course exists in the database
- Check browser console for API errors
- Verify you are logged in as the course author or Admin

### Certificate PDF shows blank
- Open `/api/certificates/[id]/pdf` directly in browser
- Use browser's **Print** → **Save as PDF** (Ctrl+P)
- Fonts load from Google Fonts — requires internet connection

---

## API Overview

All API responses follow this format:

```json
{
  "success": true,
  "data": { ... }
}
```

Or on error:

```json
{
  "success": false,
  "error": "Error message"
}
```

Key endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/forgot-password` | Send reset email |
| POST | `/api/auth/reset-password` | Reset with token |
| GET | `/api/courses` | List published courses |
| POST | `/api/courses/[id]/enroll` | Enroll in course |
| POST | `/api/progress` | Update lecture progress |
| GET | `/api/enrollments` | Admin: all enrollments |
| GET | `/api/admin/analytics` | Admin: platform stats |
| GET | `/api/admin/audit-log` | Admin: security log |

---

## License

MIT License — free to use, modify, and distribute.

---

## بِسْمِ اللّٰهِ الرَّحْمَنِ الرَّحِيْمِ

*"Seek knowledge from the cradle to the grave."*

Built with ❤️ for the Ummah.
