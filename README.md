# Session Booking API

REST API for a platform where **teachers publish sessions**, **users book them**, and **completed sessions appear in the user's history**.

Built with **Node.js, TypeScript, Express 5, MongoDB and Mongoose**.

---

## Features

- 6 required endpoints + helper endpoints for teachers and a health check
- **Aggregation pipelines** for available sessions (API 3) and a user's session list (API 6)
- **Race-safe booking and completion**: the status check and the update run as one atomic `findOneAndUpdate`, so the same session can never be booked twice, even by concurrent requests
- Request validation with **Zod** and consistent `400` responses that list each invalid field
- **Centralized error handling** (`AppError`, Zod, Mongoose cast/validation errors, duplicate keys, malformed JSON, unknown routes)
- Environment variables are checked at startup (the server exits early if one is missing or invalid)
- Indexes chosen to match the query patterns, plus a check that stops a teacher from having overlapping sessions
- Postman collection with **79 assertions** that runs the whole flow end-to-end

---

## Tech stack

| Concern | Choice |
|---|---|
| Runtime | Node.js ≥ 18 (tested on 22) |
| Language | TypeScript (strict) |
| HTTP | Express 5 (async errors go straight to the error handler, so no try/catch wrappers are needed) |
| Database | MongoDB 7 + Mongoose 8 |
| Validation | Zod |
| Security / logging | helmet, cors, morgan |

---

## Getting started

### Prerequisites

- Node.js 18+ and npm
- MongoDB 5.0+ (the pipelines use `$lookup` with `pipeline` + `localField` and `$dateDiff`). The easiest way to get it is Docker.

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | `development` \| `production` \| `test` | `development` |
| `PORT` | HTTP port | `3000` |
| `MONGODB_URI` | MongoDB connection string (**required**) | – |

### 3. Start MongoDB

```bash
docker compose up -d        # mongo:7 on localhost:27017
```

Or point `MONGODB_URI` at an existing local or Atlas instance.

### 4. (Optional) Seed sample data

```bash
npm run seed
```

Creates 3 teachers and 9 `AVAILABLE` sessions for **tomorrow (UTC)**, and prints a ready-to-use `dateTimestamp`. It is safe to run again: teachers are upserted by email and overlapping sessions are skipped.

### 5. Run

```bash
npm run dev                 # watch mode (tsx)
# or
npm run build && npm start  # compiled JS from dist/
```

The server listens on `http://localhost:3000`. Check it with `GET /health`.

### Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start in watch mode |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |
| `npm run seed` | Insert sample teachers & sessions |
| `npm run typecheck` | Type-check without emitting |
| `npm run format` | Format with Prettier |

---

## Project structure

```
src/
├── config/        env.ts (validated env vars), db.ts (Mongo connection)
├── models/        Mongoose schemas: User, Teacher, Session (+ indexes)
├── validators/    Zod schemas for body / params / query
├── middlewares/   validate, errorHandler, notFound
├── services/      Business logic & aggregation pipelines
├── controllers/   Thin HTTP layer: read the request, call the service, send the response
├── routes/        Express routers
├── utils/         AppError, constants, date helpers, response helper
├── scripts/       seed.ts
├── app.ts         Express app factory
└── server.ts      Bootstrap: DB connect → ensure indexes → listen; graceful shutdown
postman/           Postman collection
```

---

## Data model

| Collection | Fields |
|---|---|
| **User** | `fullName`, `email` (unique), `phone`, `createdAt`, `updatedAt` |
| **Teacher** | `fullName`, `email`, `specialization`, `experience` (years), `createdAt`, `updatedAt` |
| **Session** | `teacherId` (ObjectId → Teacher), `userId` (ObjectId → User \| `null`), `startTime`, `endTime`, `status` (`AVAILABLE` \| `BOOKED` \| `COMPLETED`, default `AVAILABLE`), `completedAt` (`null` until completed), `createdAt`, `updatedAt` |

Session indexes: `{status, startTime}` (API 3), `{userId, status}` (API 6), `{teacherId, startTime}` (overlap check).

Session lifecycle:

```
AVAILABLE ──book──▶ BOOKED ──complete──▶ COMPLETED
```

---

## Response format

Success:

```json
{ "success": true, "message": "Session booked successfully", "data": { ... } }
```

Error:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": { "body.email": ["must be a valid email"] }
  }
}
```

### Status codes

| Code | When |
|---|---|
| `200` | Successful read / update |
| `201` | Resource created |
| `400` | Validation failure, invalid ObjectId, malformed JSON |
| `404` | User / teacher / session / route not found |
| `409` | Duplicate email, session already booked, invalid status transition, overlapping teacher slot |
| `500` | Unexpected server error (stack trace only outside production) |

---

## API reference

Base URL: `http://localhost:3000`

### API 1 — Create User

`POST /users`

```json
{ "fullName": "Rahul Verma", "email": "rahul@example.com", "phone": "+91 9876543210" }
```

- `201` returns the created user
- `409` if the email is already registered (enforced by a unique index, so it also holds under concurrent requests)
- `400` if validation fails

### API 2 — Create Session

`POST /sessions`

```json
{
  "teacherId": "6afbd0990e3a69e4c07074e9",
  "startTime": "2026-11-18T10:00:00.000Z",
  "endTime": "2026-11-18T11:00:00.000Z"
}
```

`startTime` / `endTime` accept an ISO-8601 string or a timestamp in milliseconds.

- `201` returns the session with `status: "AVAILABLE"`, `userId: null`, `completedAt: null`
- `400` if `endTime` is not greater than `startTime`, or another field is invalid
- `404` if the teacher does not exist
- `409` if the teacher already has a session that overlaps this slot

### API 3 — Available Sessions for a Date *(aggregation pipeline)*

`GET /sessions/available?dateTimestamp=1794960000000`

`dateTimestamp` is a Unix timestamp in **milliseconds** (a 10-digit value in seconds also works). Any moment within a day selects that whole **UTC** day.

Pipeline: `$match` (status `AVAILABLE`, `startTime` in `[dayStart, nextDayStart)`) → `$sort` → `$lookup` teacher → `$unwind` → `$project` (adds `durationMinutes`).

```json
{
  "success": true,
  "data": {
    "date": "2026-11-18",
    "range": { "from": "2026-11-18T00:00:00.000Z", "to": "2026-11-19T00:00:00.000Z" },
    "count": 1,
    "sessions": [
      {
        "_id": "6afbd0997e811fe23edbec9e",
        "startTime": "2026-11-18T09:00:00.000Z",
        "endTime": "2026-11-18T10:00:00.000Z",
        "status": "AVAILABLE",
        "teacher": {
          "_id": "6afbd0990e3a69e4c07074e9",
          "fullName": "Ananya Sharma",
          "email": "ananya.sharma@example.com",
          "specialization": "Mathematics",
          "experience": 8
        },
        "durationMinutes": 60
      }
    ]
  }
}
```

- `400` if `dateTimestamp` is missing or not numeric

### API 4 — Book Session

`POST /sessions/:id/book`

```json
{ "userId": "6afbd0a9fadd2c8725394b2a" }
```

- `200` returns the session with `status: "BOOKED"` and `userId` set
- `404` if the user or session does not exist
- `409` if the session is already booked, or is completed
- `400` if an ObjectId is invalid

### API 5 — Mark Session Complete

`PATCH /sessions/:id/complete`

- `200` returns the session with `status: "COMPLETED"` and `completedAt` set
- `404` if the session does not exist
- `409` if the session is not `BOOKED` (still `AVAILABLE`, or already `COMPLETED`)

### API 6 — User Session List *(aggregation pipeline)*

`GET /users/:id/sessions`

Pipeline: `$match` (this user's `BOOKED` / `COMPLETED` sessions) → `$lookup` teacher → `$unwind` → `$project` → `$facet` into two groups → `$project` totals.

```json
{
  "success": true,
  "data": {
    "userId": "6afbd0a9fadd2c8725394b2a",
    "upcomingSessions": [
      {
        "_id": "...",
        "startTime": "2026-12-01T10:00:00.000Z",
        "endTime": "2026-12-01T11:00:00.000Z",
        "status": "BOOKED",
        "teacher": { "_id": "...", "fullName": "Ananya Sharma", "specialization": "Mathematics", "...": "..." },
        "durationMinutes": 60
      }
    ],
    "completedSessions": [],
    "totals": { "upcoming": 1, "completed": 0 }
  }
}
```

- **Upcoming** = sessions with status `BOOKED`, sorted by `startTime` ascending
- **Completed** = sessions with status `COMPLETED`, newest `completedAt` first
- `404` if the user does not exist; `400` if the id is invalid

### Helper endpoints (not in the 6 required APIs)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/teachers` | Create a teacher: `{ fullName, email, specialization, experience }` |
| `GET` | `/teachers` | List teachers |
| `GET` | `/health` | Liveness + DB connectivity (`503` if the DB is down) |

The assignment defines no way to create teachers, but sessions need a teacher, so these endpoints (and `npm run seed`) fill that gap.

---

## Postman collection

File: [`postman/Session-Booking-API.postman_collection.json`](postman/Session-Booking-API.postman_collection.json)

1. In Postman: **Import** → select the file.
2. Collection variable `baseUrl` defaults to `http://localhost:3000`.
3. Run the collection top-to-bottom (Collection Runner). Test scripts save `teacherId`, `userId` and `sessionId` automatically, and session times are always set to "tomorrow (UTC)", so you can re-run it any day.

It covers the happy path for every API and the error cases (duplicate email, bad time range, overlapping slot, missing entities, double booking, invalid status transitions, invalid ids).

Command line:

```bash
postman collection run postman/Session-Booking-API.postman_collection.json
# or
npx newman run postman/Session-Booking-API.postman_collection.json
```

---

## Design notes

- **Atomic state transitions.** Booking uses `findOneAndUpdate({ _id, status: 'AVAILABLE' }, { status: 'BOOKED', userId })`. If nothing matches, a second lookup tells "not found" (`404`) apart from "wrong status" (`409`). Tested by firing 5 concurrent booking requests at one session: exactly one gets `200`, and the other four get `409`.
- **Unique email** is enforced by the database index rather than a read-then-write check, so it is safe under concurrency. Mongo error `11000` is mapped to `409`.
- **Dates are UTC.** "Sessions for a date" means `startTime` falls within that UTC calendar day.
- **Thin controllers.** Express 5 forwards rejected promises to the error handler, so controllers are plain `async` functions with no try/catch, and all errors are formatted in one place (`src/middlewares/errorHandler.ts`).
