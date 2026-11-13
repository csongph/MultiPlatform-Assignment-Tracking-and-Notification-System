# KMAPS API Design

## 1. Overview

KMAPS provides a REST API for managing users, connected learning platforms, courses, assignments, notifications, and synchronization jobs.

### Base URL

```text
http://localhost:8000/api/v1
```

### API Documentation

Swagger UI:

```text
http://localhost:8000/docs
```

ReDoc:

```text
http://localhost:8000/redoc
```

## 1.1 Required ENV/API Values

### Core Backend

| Key | Required | Example | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes | `postgresql+asyncpg://USER:PASSWORD@HOST:5432/postgres?ssl=require` | PostgreSQL async connection string |
| `REDIS_URL` | Yes | `redis://localhost:6379/0` | Queue and cache backend |
| `JWT_SECRET_KEY` | Yes | Strong random secret | Signs access, refresh, and OAuth state JWTs |
| `JWT_ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | No | `15` | Access token lifetime |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS` | No | `30` | Refresh token lifetime |
| `TOKEN_ENCRYPTION_KEY` | Yes | Secure encryption key | Encrypts stored OAuth tokens |

### Frontend Redirect

| Key | Required | Default | Purpose |
|---|---|---|---|
| `FRONTEND_ORIGIN` | Yes | `http://localhost:5500` | Frontend base URL after OAuth callback |
| `FRONTEND_ONBOARDING_SUCCESS_PATH` | No | `/onboarding/success` | Redirect path after successful OAuth |
| `FRONTEND_ONBOARDING_ERROR_PATH` | No | `/onboarding/error` | Redirect path after failed OAuth |

### Google Classroom OAuth

| Key | Required | Example | Purpose |
|---|---|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | Yes | From Google Cloud Console | OAuth client ID |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Yes | From Google Cloud Console | OAuth client secret |
| `GOOGLE_OAUTH_REDIRECT_URI` | Yes | `http://localhost:8000/api/v1/oauth/google_classroom/callback` | OAuth callback URL |
| `GOOGLE_CLASSROOM_PUBSUB_TOPIC` | For Classroom push | `projects/PROJECT_ID/topics/kmaps-classroom-events` | Pub/Sub topic Classroom publishes event messages to |
| `GOOGLE_PUBSUB_PUSH_AUDIENCE` | For authenticated push delivery | `https://api.example.com/api/v1/webhooks/google-classroom` | Exact audience configured on the Pub/Sub push subscription |
| `GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT` | For authenticated push delivery | `pubsub-push@PROJECT_ID.iam.gserviceaccount.com` | Service account email used by Pub/Sub OIDC push authentication |

Required Google API configuration:

- Enable Google Classroom API in Google Cloud Console.
- Configure the OAuth consent screen and authorized redirect URI.
- Request only the scopes supported by the implementation and required for the user's access.

Google OAuth endpoints:

| Endpoint | Purpose |
|---|---|
| `https://accounts.google.com/o/oauth2/v2/auth` | Authorization |
| `https://oauth2.googleapis.com/token` | Token exchange and refresh |

### Microsoft Teams / Microsoft Graph OAuth

| Key | Required | Example | Purpose |
|---|---|---|---|
| `MICROSOFT_OAUTH_CLIENT_ID` | Yes | From Azure App Registration | OAuth client ID |
| `MICROSOFT_OAUTH_CLIENT_SECRET` | Yes | From Azure App Registration | OAuth client secret |
| `MICROSOFT_OAUTH_TENANT` | No | `common` | Tenant ID or tenant selector |
| `MICROSOFT_OAUTH_REDIRECT_URI` | Yes | `http://localhost:8000/api/v1/oauth/microsoft_teams/callback` | OAuth callback URL |

Microsoft Graph scopes configured for the application may include:

| Scope | Purpose |
|---|---|
| `offline_access` | Request refresh-token access |
| `openid email profile` | Basic identity information |
| `User.Read` | Read the signed-in user's profile |
| `EduAssignments.ReadBasic` | Read basic education assignment information |
| `EduAssignments.Read` | Read education assignments and supported submission information |
| `Team.ReadBasic.All` | Read basic team information |
| `EduRoster.Read` | Read supported education roster information |

The required permissions and administrator consent depend on the endpoints being used and the organization's Microsoft 365 policies.

Microsoft OAuth endpoints:

| Endpoint | Purpose |
|---|---|
| `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize` | Authorization |
| `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` | Token exchange and refresh |

### Synchronization and Cache Configuration

| Key | Required | Example | Purpose |
|---|---|---|---|
| `MICROSOFT_TEAMS_WEBHOOK_SECRET` | Yes for Teams event bridge | Secret value | Shared secret for event bridge requests to `/api/v1/webhooks/microsoft-teams` |
| `NOTIFICATION_POLL_INTERVAL_SECONDS` | No | `60` | Notification polling interval |
| `TOKEN_REFRESH_LEAD_MINUTES` | No | `15` | Refresh tokens before access-token expiry |
| `CACHE_TTL_SECONDS` | No | `300` | Cache time-to-live |

> **Important:** The examples above document the expected configuration. Verify each variable's actual default and whether it is required against the backend settings and environment-loading code before deployment.

### Event-driven Classroom updates

Google Classroom change feeds publish to Cloud Pub/Sub. Configure a topic, grant `classroom-notifications@system.gserviceaccount.com` the Pub/Sub Publisher role on that topic, and create a Pub/Sub push subscription targeting `POST /api/v1/webhooks/google-classroom`. Configure authenticated push with the service account in `GOOGLE_PUBSUB_PUSH_SERVICE_ACCOUNT` and set its audience to the exact `GOOGLE_PUBSUB_PUSH_AUDIENCE` value. Grant the Pub/Sub service agent (`service-PROJECT_NUMBER@gcp-sa-pubsub.iam.gserviceaccount.com`) `roles/iam.serviceAccountTokenCreator` on the push service account. The API must be publicly reachable over HTTPS. See [Pub/Sub push authentication](https://cloud.google.com/pubsub/docs/authenticate-push-subscriptions).

For local development, `APP_ENV=development` allows direct JSON events without Google Cloud credentials, restricted to loopback unless `GOOGLE_CLASSROOM_WEBHOOK_SECRET` is configured and sent as `X-KMAPS-Webhook-Secret`. Production defaults to requiring OIDC authentication. Local event ingress can enqueue a refresh only for a course already associated with a connected account; it does not replace OAuth or the Classroom API needed to retrieve current assignment details.

The Google OAuth grant now also requests `classroom.push-notifications` and `classroom.coursework.students.readonly`. Existing users must reconnect Google Classroom and approve the updated read-only scopes before event registrations can be created. Registrations are renewed every six days because Classroom registrations expire after one week. Initial import and user-requested manual sync remain available.

Classroom changes enqueue an immediate refresh through Google Cloud Pub/Sub. Teams changes enqueue an immediate refresh through `POST /api/v1/webhooks/microsoft-teams`, authenticated with `X-Kmaps-Webhook-Secret`; request JSON must include `connectionId` and may include `eventId` for delivery deduplication. Microsoft Graph's supported change-notification resources do not include Education assignments, so a Teams event bridge (for example, an automation you control that observes assignment events) must call this endpoint. The app no longer schedules periodic Teams pulls. This endpoint is an event receiver; it does not create a native Graph Education subscription.
