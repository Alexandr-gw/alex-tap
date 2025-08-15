# Alex-tap — Service Booking & Scheduling Platform

![Architecture Diagram](https://private-user-images.githubusercontent.com/22914743/478294461-db7ea2d6-0a5e-486d-bde7-9b1a0bb39127.png?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NTUyMjkyNzUsIm5iZiI6MTc1NTIyODk3NSwicGF0aCI6Ii8yMjkxNDc0My80NzgyOTQ0NjEtZGI3ZWEyZDYtMGE1ZS00ODZkLWJkZTctOWIxYTBiYjM5MTI3LnBuZz9YLUFtei1BbGdvcml0aG09QVdTNC1ITUFDLVNIQTI1NiZYLUFtei1DcmVkZW50aWFsPUFLSUFWQ09EWUxTQTUzUFFLNFpBJTJGMjAyNTA4MTUlMkZ1cy1lYXN0LTElMkZzMyUyRmF3czRfcmVxdWVzdCZYLUFtei1EYXRlPTIwMjUwODE1VDAzMzYxNVomWC1BbXotRXhwaXJlcz0zMDAmWC1BbXotU2lnbmF0dXJlPWY1Y2JhY2JmOTE0NjQ0OWM3NTM0YjY5NjMxZTc5ZTNmOWQ0NWRlMDgwOTY2MWZhOTAwYWFlYTc2ZTU5MjM1MmEmWC1BbXotU2lnbmVkSGVhZGVycz1ob3N0In0.86mw4NOei_0UmSP_J1JvfOFJHofT7rB5rnTihf6N53I)

A multi-tenant, role-based service booking system, built with **Next.js**, **TypeScript**, **Tailwind CSS**, **Keycloak**, **PostgreSQL**, **Stripe**, **Twilio**, and **Google Maps**.

It enables companies to:
- Manage schedules, tasks, and jobs with fine-grained roles (**admin**, **manager**, **worker**, **client**)
- Let clients find free time slots, book services with AI assistance, and receive automated reminders
- Keep data secure with **OIDC + PKCE login**, **RBAC**, company-scoped isolation, rate limits, input validation, and webhook signature verification

Future-ready features include invoice generation, in-app messaging, and more — all built with a clean, documented codebase for **portfolio and real-world readiness**.

---

## Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/<your-username>/jobber-lite.git
cd jobber-lite
```
### 2. Install dependencies
```bash
npm install
# or
yarn install
```
### 3. Run the development server
```bash
npm run dev
# or
yarn dev
```

Open http://localhost:3000 to see the app.
