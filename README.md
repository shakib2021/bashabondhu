## Frontend

Install dependencies with `npm install`, then start the React app with `npm start`.
Set `REACT_APP_GOOGLE_CLIENT_ID`, the Firebase web app values from `.env.example`, and `REACT_APP_API_URL` in `.env.local`. Enable Email/Password under Firebase Console **Authentication > Sign-in method**, configure the Firebase email verification template, and turn on password reset emails so users can receive reset links when they forget their password. New email/password users must verify their address before registration can finish or they can sign in.

## Backend

The Express and MongoDB API is in [backend](./backend). Follow [backend/README.md](./backend/README.md) to configure MongoDB Atlas, Google OAuth, Firebase Admin credentials, and the API environment before starting it.

Deployed site: https://bashabondhu.netlify.app/