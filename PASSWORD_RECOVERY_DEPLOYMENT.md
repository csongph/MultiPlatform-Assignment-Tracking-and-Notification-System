# Password recovery deployment

Password recovery uses three API calls under `/api/v1/auth`:

1. `POST /forgot-password` requests a six-digit code. When Resend is configured, it returns the same `202` body for known and unknown accounts. If Resend has no API key or verified sender configured, it returns the same `503` setup message for every address before checking whether an account exists. The code is delivered only to an active account with a local password.
2. `POST /verify-otp` checks the code and returns a status message only. It never returns the OTP or a reset token.
3. `POST /reset-password` accepts the email, verified code, and new password. The same password hashing function as login is used. A successful reset sends a confirmation message.

The recovery code expires after 10 minutes, is accepted once, and is disabled after five incorrect attempts. A new email request is silently suppressed for the account cooldown period to preserve the same response for existing and unknown addresses. The API also applies IP rate limits through an atomic Redis counter using the client IP resolved by Uvicorn's trusted proxy-header handling.

## Resend setup

1. Create a Resend API key with sending access and store it as `RESEND_API_KEY` in the backend environment. Never add it to frontend files or logs.
2. Add a sending domain or subdomain you control in Resend. Add the exact DNS records Resend displays at your DNS provider, including its SPF TXT and DKIM records, then wait for Resend to report the domain as verified.
3. Set `PASSWORD_RESET_FROM_EMAIL` to an address at that verified domain, for example `no-reply@your-verified-domain`, set `PASSWORD_RESET_FROM_NAME=KMAPS`, and set `PASSWORD_RESET_EMAIL_PROVIDER=resend`.
4. `onboarding@resend.dev` is only suitable for testing and can only deliver to an address allowed by the Resend test account. It is not a production sender for student email addresses.

The API checks Resend's HTTP response. Delivery failures are logged with the HTTP status/provider error but never with the OTP, API key, password, or reset data. The browser receives the same generic forgot-password response whether or not an email address is registered.

## Local setup

Set the new values in `backend/.env`, apply the Alembic migration, then start the existing backend runner:

```powershell
cd backend
python -m alembic upgrade head
powershell -ExecutionPolicy Bypass -File .\start-backend.ps1
```

The local runner trusts only `127.0.0.1` for forwarded client IP headers by default. If a local reverse proxy is used, list only its trusted IP addresses in `FORWARDED_ALLOW_IPS`.

## Render and static frontend deployment

In Render, configure the service's environment variables from `backend/.env.example` in the Dashboard; do not upload the local `.env`. Set the `DATABASE_URL`, `REDIS_URL`, long random `JWT_SECRET_KEY` and `TOKEN_ENCRYPTION_KEY`, the Resend settings above, the exact frontend origins in `FRONTEND_ORIGINS`, and `FORWARDED_ALLOW_IPS=*` only when the app is reachable exclusively through Render's trusted proxy. Render's free web services can sleep, so the frontend waits up to 30 seconds and displays a server connection message.

Set the Render web service's root directory to `backend`, build command to `pip install -r requirements.txt`, pre-deploy command to `python -m alembic upgrade head`, start command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips='*'`, and health check path to `/health`. Render only provides a separate pre-deploy command on supported paid service plans; on a plan without it, prepend `python -m alembic upgrade head &&` to the start command.

For the static frontend deployment, set `window.KMAPS_API_BASE` to the actual Render base URL ending in `/api/v1` in `frontend/config.js` before publishing. Set both `FRONTEND_ORIGIN` and `FRONTEND_ORIGINS` to the exact static-site HTTPS origin(s), comma-separated without trailing slashes. When explicit production origins are configured, the backend does not add localhost origins. The recovery page is a regular static file at `/pages/forgot-password.html` and must be included in the published frontend directory.

After environment changes, redeploy the Render service. `OPTIONS` requests to the API should receive CORS headers for each configured frontend origin.
