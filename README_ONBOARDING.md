# KMAPS OAuth Onboarding

## Overview

KMAPS supports connecting external learning platforms to a user's account through OAuth 2.0.

Currently supported:

* Google Classroom
* Microsoft Teams

The OAuth process allows KMAPS to access the user's learning-platform data without storing the user's platform password.

---

# OAuth Architecture

```text
User
 │
 ▼
KMAPS Frontend
 │
 ▼
KMAPS Backend
 │
 ▼
OAuth Provider
 │
 │ User Login + Permission
 ▼
OAuth Callback
 │
 ▼
KMAPS Backend
 │
 ├── Exchange Authorization Code
 │
 ├── Obtain Access Token
 │
 ├── Obtain Refresh Token
 │
 ├── Encrypt Tokens
 │
 └── Store Connection
 │
 ▼
Database
```

---

# Google Classroom

## 1. Create Google Cloud Project

Open:

```text
https://console.cloud.google.com/
```

Create or select a Google Cloud project.

---

## 2. Enable Google Classroom API

Open:

```text
APIs & Services
→ Library
```

Search:

```text
Google Classroom API
```

Enable the API.

---

# 3. Create OAuth Client

Go to:

```text
APIs & Services
→ Credentials
```

Create:

```text
OAuth Client ID
```

Application type:

```text
Web application
```

---

# 4. Redirect URI

Add:

```text
http://localhost:8000/api/v1/oauth/google_classroom/callback
```

The URI must exactly match:

```env
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/api/v1/oauth/google_classroom/callback
```

---

# 5. Configure `.env`

```env
GOOGLE_OAUTH_CLIENT_ID=your-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:8000/api/v1/oauth/google_classroom/callback
```

Never commit these values to GitHub.

---

# Microsoft Teams

Microsoft Teams integration uses Microsoft Graph API through Azure App Registration.

---

# 1. Open Azure Portal

```text
https://portal.azure.com/
```

Go to:

```text
Microsoft Entra ID
→ App registrations
```

---

# 2. Create Application

Select:

```text
New registration
```

Choose an appropriate supported account type.

For development, the project currently uses:

```env
MICROSOFT_OAUTH_TENANT=common
```

---

# 3. Configure Redirect URI

Add:

```text
http://localhost:8000/api/v1/oauth/microsoft_teams/callback
```

---

# 4. Create Client Secret

Go to:

```text
Certificates & secrets
→ New client secret
```

Copy the secret immediately.

The secret value will not be shown again after leaving the page.

---

# 5. Configure API Permissions

Go to:

```text
API permissions
→ Add a permission
→ Microsoft Graph
```

Configure the permissions required by the application.

Refer to the project's API implementation and Microsoft Graph documentation before changing permissions.

---

# 6. Configure `.env`

```env
MICROSOFT_OAUTH_CLIENT_ID=your-client-id
MICROSOFT_OAUTH_CLIENT_SECRET=your-client-secret
MICROSOFT_OAUTH_TENANT=common
MICROSOFT_OAUTH_REDIRECT_URI=http://localhost:8000/api/v1/oauth/microsoft_teams/callback
```

---

# OAuth Endpoints

## Get Platforms

```http
GET /api/v1/oauth/platforms
```

---

## Get Connections

```http
GET /api/v1/oauth/connections
```

Requires authentication.

---

# Google Authorization

```http
GET /api/v1/oauth/google_classroom/authorize
```

The backend generates an OAuth authorization URL.

The frontend redirects the user to the provider.

---

# Google Callback

```http
GET /api/v1/oauth/google_classroom/callback
```

The backend:

1. Receives authorization code.
2. Exchanges code for OAuth tokens.
3. Retrieves provider information.
4. Encrypts OAuth tokens.
5. Stores the connection.
6. Redirects to the frontend.

---

# Microsoft Authorization

```http
GET /api/v1/oauth/microsoft_teams/authorize
```

---

# Microsoft Callback

```http
GET /api/v1/oauth/microsoft_teams/callback
```

The backend performs the same general OAuth flow:

```text
Authorization Code
        ↓
Token Exchange
        ↓
Token Encryption
        ↓
Database
        ↓
Frontend Redirect
```

---

# Frontend Redirect

Success:

```env
FRONTEND_ONBOARDING_SUCCESS_PATH=/onboarding/success
```

Error:

```env
FRONTEND_ONBOARDING_ERROR_PATH=/onboarding/error
```

Frontend origin:

```env
FRONTEND_ORIGIN=http://localhost:5500
```

---

# Token Security

OAuth tokens must never be stored as plain text.

KMAPS uses:

```env
TOKEN_ENCRYPTION_KEY=
```

to encrypt sensitive OAuth credentials before storing them.

Generate:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

---

# Important Security Rules

Never commit:

```text
.env
```

Never publish:

```text
GOOGLE_OAUTH_CLIENT_SECRET
MICROSOFT_OAUTH_CLIENT_SECRET
TOKEN_ENCRYPTION_KEY
JWT_SECRET_KEY
DATABASE_PASSWORD
ACCESS_TOKEN
REFRESH_TOKEN
```

If a secret is accidentally committed:

1. Revoke the secret immediately.
2. Generate a new secret.
3. Remove the secret from the repository history if necessary.
4. Update the local `.env`.

---

# OAuth Testing Checklist

Before testing OAuth, check:

* [ ] Backend is running
* [ ] Frontend is running
* [ ] Supabase Database is accessible
* [ ] `DATABASE_URL` is correct
* [ ] JWT secret is configured
* [ ] Token encryption key is configured
* [ ] Google/Microsoft Client ID is configured
* [ ] Client Secret is configured
* [ ] Redirect URI matches exactly
* [ ] Required provider API permissions are enabled
* [ ] Frontend origin is correct

---

# OAuth Flow Test

```text
1. Open KMAPS
       ↓
2. Login / Register
       ↓
3. Open Platform Connection
       ↓
4. Select Google Classroom or Microsoft Teams
       ↓
5. Provider Login
       ↓
6. Grant Permission
       ↓
7. Provider redirects to KMAPS
       ↓
8. Backend processes callback
       ↓
9. OAuth connection stored
       ↓
10. Redirect to frontend
```

---

# Current OAuth Status

## Google Classroom

* [x] OAuth authorization
* [x] OAuth callback
* [x] Token exchange
* [x] Token encryption
* [x] Connection storage
* [ ] Full assignment synchronization
* [ ] Automatic background synchronization

## Microsoft Teams

* [x] OAuth authorization
* [x] OAuth callback
* [x] Token exchange
* [x] Token encryption
* [x] Connection storage
* [ ] Full assignment synchronization
* [ ] Automatic background synchronization
