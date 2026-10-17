# BashaBondhu backend

Express and MongoDB API for Google registration/login and user profiles.

## Setup

1. From this directory, run `npm install`.
2. Copy `.env.example` to `.env`.
3. Set `MONGODB_URI` to the connection string from MongoDB Atlas. Replace the placeholders and URL-encode any special characters in the database user's password.
4. Set a long, random `JWT_SECRET`, the same Google OAuth client ID used by the frontend, and `CLIENT_ORIGIN` to the frontend origin. For local development, use `http://localhost:3000`; separate multiple origins with commas.
5. In Atlas, create a database user and allow your development/deployment server's IP in Network Access. Do not commit `.env` or expose `MONGODB_URI` in frontend variables.
6. Run `npm run dev`.

The API listens on port 5000 by default. The frontend should set `REACT_APP_API_URL=http://localhost:5000/api` and restart its dev server.

If Node.js reports `querySrv ECONNREFUSED`, set optional `MONGODB_DNS_SERVERS` to a DNS resolver reachable from the machine running the backend (comma-separated for multiple resolvers). If DNS then resolves but MongoDB reports a server-selection timeout, add the backend machine's public IP under Atlas **Network Access** and confirm outbound access to MongoDB on port 27017.

## Routes

- `POST /api/auth/google/register` — body: `{ "accessToken": "...", "role": "tenant" | "owner" }`. The server verifies the token with Google; public registration cannot create admins.
- `POST /api/auth/google/login` — body: `{ "accessToken": "..." }`. Returns a user profile and a signed, seven-day bearer token.
- `GET /api/users/me` — requires `Authorization: Bearer <token>`.
- `PUT /api/users/me` — requires the same bearer token; accepts `fullName`, `profileImage`, `phone`, `address`, and `occupation`.
- `GET /api/health` — health check.

Successful login/registration responses include `{ "success": true, "user": {...}, "token": "..." }`. MongoDB remains the source of truth for account roles and profile details.
