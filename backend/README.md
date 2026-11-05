# BashaBondhu backend

Express and MongoDB API for Google and Firebase registration/login and user profiles.

## Setup

1. From this directory, run `npm install`.
2. Copy `.env.example` to `.env`.
3. Set `MONGODB_URI` to the connection string from MongoDB Atlas. Replace the placeholders and URL-encode any special characters in the database user's password.
4. Set a long, random `JWT_SECRET`, the same Google OAuth client ID used by the frontend, `FIREBASE_PROJECT_ID`, and `CLIENT_ORIGIN` to the frontend origin. For local development, use `http://localhost:3000`; separate multiple origins with commas.
5. In Firebase Console, enable **Authentication > Sign-in method > Email/Password** and configure the email verification template. Add your frontend domain under **Authentication > Settings > Authorized domains** so Firebase can return users to the registration page after verification. Create a Firebase service account and set `GOOGLE_APPLICATION_CREDENTIALS` to its local JSON file path (or provide application-default credentials in the deployment environment). Never commit or expose this service-account file.
6. In Atlas, create a database user and allow your development/deployment server's IP in Network Access. Do not commit `.env` or expose `MONGODB_URI` in frontend variables.
7. Run `npm run dev`.

The API listens on port 5000 by default. Set the frontend's `REACT_APP_API_URL` to the backend origin (for example, `http://localhost:5000`) and restart its dev server. The frontend adds `/api` to this URL automatically.

If Node.js reports `querySrv ECONNREFUSED`, set optional `MONGODB_DNS_SERVERS` to a DNS resolver reachable from the machine running the backend (comma-separated for multiple resolvers). If DNS then resolves but MongoDB reports a server-selection timeout, add the backend machine's public IP under Atlas **Network Access** and confirm outbound access to MongoDB on port 27017.

## Design patterns

The backend uses the Factory pattern in `src/middleware/imageUpload.js` to build Multer middleware for different image-upload routes. NID verification and property photos share the same image-type validation and upload-error handling while retaining their route-specific file limits and response messages. The app also exposes `createApp` as a factory so tests can inject model and authentication dependencies.

The backend also uses the Strategy pattern in `src/utils/imageValidation.js`: it selects the signature validator for JPEG, PNG, or WebP from the uploaded file's MIME type. NID and property-photo uploads share those strategies, so both routes verify file contents rather than trusting MIME metadata alone.

## Routes

- `POST /api/auth/google/register` — body: `{ "accessToken": "...", "role": "tenant" | "owner" }`. The server verifies the token with Google; public registration cannot create admins.
- `POST /api/auth/google/login` — body: `{ "accessToken": "..." }`. Returns a user profile and a signed, seven-day bearer token.
- `POST /api/auth/firebase/register` — body: `{ "idToken": "...", "role": "tenant" | "owner", "fullName": "..." }`. Verifies the Firebase ID token before saving the app profile.
- `POST /api/auth/firebase/login` — body: `{ "idToken": "..." }`. Requires an existing Firebase-linked app profile.
- `GET /api/users/me` — requires `Authorization: Bearer <token>`.
- `PUT /api/users/me` — requires the same bearer token; accepts `fullName`, `profileImage`, `phone`, `address`, and `occupation`.
- `GET /api/owner/verification` — owners can check their verification status without exposing their NID details.
- `POST /api/owner/verification` — owners submit `nidName`, `nidNumber`, `frontImage`, and `backImage` as multipart form data. NID numbers may contain 10, 13, or 17 digits; each JPEG, PNG, or WebP image is limited to 4 MB.
- `GET /api/admin/owner-verifications` — admins can view the pending verification queue and submitted NID details.
- `GET /api/admin/owner-verifications/:verificationId/documents/:side` — admins only; privately serves the `front` or `back` NID image with caching disabled.
- `PATCH /api/admin/owner-verifications/:verificationId` — admins approve with `{ "decision": "approve" }` or reject with `{ "decision": "reject", "rejectionReason": "..." }`.
- `GET /api/admin/summary` — admin dashboard counts for users, property posts, pending reports, and pending verifications.
- `GET /api/admin/users` and `PATCH /api/admin/users/:userId/status` — admins can list accounts and suspend/reactivate non-admin users.
- `GET /api/admin/posts` and `DELETE /api/admin/posts/:postId` — admins can list and permanently remove property posts.
- `PATCH /api/admin/reports/:reportId` — admins mark a pending report `reviewed` or `dismissed`.
- `POST /api/properties` — owners can create listings using JSON or multipart form data. Multipart requests send a `property` JSON field and up to 6 `images` files (JPEG, PNG, or WebP; up to 5 MB each and 12 MB combined).
- `PUT /api/properties/:propertyId` and `DELETE /api/properties/:propertyId` — owners can update or delete their own listings. Updates retain only the existing image URLs included in the `images` list and can add new multipart `images` files.
- `GET /api/property-images/:propertyId/:photoId` — serves a listing image stored in the `images` array as its original image type.
- `GET /api/property-images/:imageId` — serves legacy photos stored in the separate property-image collection.
- `GET /api/users/me/watchlist` — returns the signed-in user's saved available listings.
- `PUT /api/users/me/watchlist/:propertyId` — requires `{ "watched": true | false }` to save or remove an available listing.
- `POST /api/properties/:propertyId/reports` — authenticated users can submit a report with a category and optional details.
- `GET /api/admin/reports` — admins can review the latest 100 submitted property reports.
- `GET /api/health` — health check.

Successful login/registration responses include `{ "success": true, "user": {...}, "token": "..." }`. MongoDB remains the source of truth for account roles and profile details.

Owner NID documents are stored as private MongoDB binary data and are not included in public listing or profile responses. Only an admin's authenticated document route can return them. A public verified-owner badge is enabled only after an admin approves the submitted NID; email verification alone does not grant the badge.

New property photos are stored as BSON binary entries in the listing's `images` array in the `accopost` collection. The API turns each binary entry into an image URL in its responses without returning the binary bytes in listing JSON. On backend startup, images from the old `photos` field are migrated into `images` and the old field is removed. Uploads are limited to 12 MB combined so the listing stays below MongoDB's 16 MB document limit. Photos previously stored in the separate property-image collection remain available through the legacy image route. Public listing responses show a verified-owner badge only when the listing owner's NID verification has been approved.
