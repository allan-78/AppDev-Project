# NeighborhoodShare

NeighborhoodShare is a web and mobile-based suburban tool and utility co-op system.

## Apps

- `Server` - Node.js, Express, MongoDB, Mongoose, JWT, Cloudinary API.
- `Web` - React + Vite admin dashboard for community leaders.
- `Mobile` - Expo React Native resident app.

## Quick Start

Install dependencies:

```bash
cd Server && npm install
cd ../Web && npm install
cd ../Mobile && npm install
```

Configure environment files:

- `Server/.env`
- `Web/.env`
- `Mobile/.env`

Seed sample data after MongoDB is running:

```bash
cd Server
npm run seed
```

Demo accounts:

- Admin: `admin@neighborhood.test` / `Password123!`
- Resident: `resident@neighborhood.test` / `Password123!`
- Join code: `GREEN123`

Run the apps:

```bash
cd Server
npm run dev
```

```bash
cd Web
npm run dev
```

```bash
cd Mobile
npm start
```

## Implemented Highlights

- Secured registration and login with hashed passwords and JWT tokens.
- Admin-approved community join-code registration.
- Resident mobile app for browsing, listing, requesting, tracking, and trust wallet views.
- Admin web panel for users, inventory ledger, borrowing monitor, disputes, maintenance, reports, and settings.
- Trust-weighted borrowing priority.
- Escrow point lock and release behavior.
- Late return penalties and lending/on-time return rewards.
- Split-maintenance allocation among the last five completed borrowers.
- Tool health scores, wear logs, audit logs, and Cloudinary-ready image upload endpoint.
