# BashaBondhu

## Supabase Google sign-in

1. Copy `.env.example` to `.env.local` and set `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_PUBLISHABLE_KEY`. These are frontend configuration values; never put a Supabase secret/service-role key in this app.
2. In Supabase, enable Google under **Authentication → Sign In / Providers** and configure it with your Google OAuth client ID and a rotated client secret. The Google client secret must stay in Supabase, not in this repository.
3. Add `https://shtcblrmirryvzeuioeg.supabase.co/auth/v1/callback` to the Google OAuth client's authorized redirect URIs. This is Supabase's provider callback, not the app's callback route.
4. Add `http://localhost:3000/auth/callback` (and your deployed callback URL) to Supabase **Authentication → URL Configuration → Redirect URLs**.
5. Restart the React development server after editing `.env.local`.

After OAuth, the app upserts only `email`, `fullName`, and `profileImage` into `public.users`; the table should have a unique constraint on `email`. Since the request omits `id`, `createdAt`, and `updatedAt`, those columns need database defaults (or must allow null). The user can later edit `fullName`, `phone`, `address`, `occupation`, and `profileImage` from the tenant dashboard. Email is read-only; role, auth provider, verification, account status, and timestamps are not editable from the client. The user's auth profile and selected registration type are also cached locally, but local storage is user-editable and is not authoritative.

Enable RLS on `public.users` and add policies so an authenticated user can only read/insert/update the row matching the email in their verified Supabase token. For example:

```sql
alter table public.users enable row level security;
create unique index if not exists users_email_unique on public.users (email);

create policy "Users can read their profile"
on public.users for select to authenticated
using ((auth.jwt() ->> 'email') = email);

create policy "Users can create their profile"
on public.users for insert to authenticated
with check ((auth.jwt() ->> 'email') = email);

create policy "Users can update their profile"
on public.users for update to authenticated
using ((auth.jwt() ->> 'email') = email)
with check ((auth.jwt() ->> 'email') = email);
```

Run the policy statements once (or adapt existing policies). The unique index requires existing email values to be unique. Do not add an anonymous insert policy or expose a service-role key.

Restrict authenticated users to updating only their own profile fields at the database privilege level as well as with RLS. This also allows the OAuth upsert to update its `email`, `fullName`, and `profileImage` columns on conflict:

```sql
revoke update on table public.users from authenticated;
grant update (email, "fullName", phone, address, occupation, "profileImage")
on table public.users to authenticated;
```

The update policy's `using` and `with check` expressions must both require the row email to match the signed-in user's verified JWT email. Do not grant update on `role`, `authProvider`, `isVerified`, `accountStatus`, or timestamp columns to `authenticated`.