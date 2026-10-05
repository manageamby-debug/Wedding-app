# Wedding Event Management API

A FastAPI backend for managing wedding events, guests, invitations, RSVPs, check-in, contributions, and payment audit history. Organizers can only access records belonging to their own events. Invitation and RSVP links are public bearer links so invited guests can respond without an account.

## Features

- Organizer registration and JWT bearer authentication
- Event creation, filtering, updates, and deletion
- Guest management, invitations, and public RSVP links
- Event-day check-in and guest check-in status
- Contribution entry, confirmation, rejection, summaries, receipts, and guest history
- Payment audit records for organizer confirmations and rejections
- Event ownership checks across organizer endpoints
- SQLite persistence and Alembic migrations

## Requirements

- Python 3.10 or newer
- PowerShell on Windows, or a compatible shell on macOS/Linux

## Local setup

Create and activate a virtual environment from the project root.

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

Install the runtime packages:

```powershell
python -m pip install fastapi "uvicorn[standard]" sqlalchemy alembic email-validator PyJWT "pwdlib[argon2]" python-dotenv
```

Create a `.env` file in the project root with a private signing key. Generate a value with:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Put the generated value in `.env`:

```dotenv
SECRET_KEY=replace-this-with-the-generated-value
```

Apply database migrations, then start the development server:

```powershell
alembic upgrade head
uvicorn app.main:app --reload
```

The app uses `sqlite:///./wedding.db` by default. The database file is local and ignored by Git. API documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs); ReDoc is at [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc).

## Authentication and access control

Register an organizer with `POST /users`, then sign in using `POST /users/login`. The login response contains a bearer access token. In Swagger, select **Authorize** and enter the token as `Bearer <token>`. Tokens expire after 60 minutes. `GET /users/me` returns the authenticated user's profile.

Organizer event, guest, check-in, contribution, and audit operations are scoped to the authenticated organizer's event. Requests for resources owned by another organizer are rejected. User registration creates organizer accounts; clients cannot choose their role during signup.

These endpoints are intentionally public:

- `POST /users` and `POST /users/login` for account creation and login
- `GET /invite/{short_code}` to view an active invitation
- `GET /rsvp/{short_code}` and `POST /rsvp/{short_code}` so a guest can read or submit an RSVP without logging in

Treat an invitation short code as a private link. New invitation links use high-entropy random codes. CORS currently allows all origins for development; set an explicit origin allowlist before production deployment. Add rate limiting at the application gateway or deployment layer for login and public invitation/RSVP endpoints.

## API endpoint guide

All paths are relative to the server root (for example, `http://127.0.0.1:8000`). Organizer endpoints require a bearer token unless listed above as public.

### Users and authentication

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/users` | Public | Register an organizer account |
| `POST` | `/users/login` | Public | Sign in and receive an access token |
| `GET` | `/users/me` | Authenticated | Read the current user's profile |

### Events

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/events` | Organizer | Create an event owned by the current organizer |
| `GET` | `/events` | Authenticated | List the current user's events; optional `status`, `groom_name`, and `bride_name` filters |
| `GET` | `/events/{event_id}` | Authenticated | Read an owned event |
| `PUT` | `/events/{event_id}` | Organizer | Update an owned event |
| `DELETE` | `/events/{event_id}` | Organizer | Delete an owned event |
| `GET` | `/events/{event_id}/dashboard` | Event owner | Read event details, guest totals, RSVP counts, check-in statistics, and contribution totals |

Event statuses are `draft`, `published`, `completed`, and `cancelled`.

### Guests and check-in

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/events/{event_id}/guest` | Event owner | Add a guest to an owned event |
| `GET` | `/events/{event_id}/guest` | Event owner | List guests for an owned event |
| `GET` | `/guests/code/{guest_code}` | Organizer, guest's event owner | Find a guest by guest code |
| `POST` | `/guests/code/{guest_code}/check_in` | Organizer, guest's event owner | Check in a guest by code |
| `PUT` | `/guests/{guest_id}` | Guest's event owner | Update a guest |
| `DELETE` | `/guests/{guest_id}` | Guest's event owner | Delete a guest |
| `POST` | `/events/{event_id}/check-in/{guest_code}` | Event owner | Check in a guest; repeat check-in returns `409` |
| `GET` | `/events/{event_id}/check-in/{guest_code}` | Event owner | Read guest check-in details |
| `GET` | `/events/{event_id}/check-in-summary` | Event owner | Read check-in counts and percentage |
| `GET` | `/events/{event_id}/checked-in-guests` | Event owner | List checked-in guests |
| `GET` | `/events/{event_id}/guests/check-in-status` | Event owner | List all guests with RSVP and check-in status |

### Invitations and RSVPs

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/invitations` | Organizer, guest's event owner | Create or return the guest's invitation |
| `GET` | `/invite/{short_code}` | Public | View an active invitation |
| `GET` | `/rsvp/{short_code}` | Public | Read the RSVP associated with an active invitation |
| `POST` | `/rsvp/{short_code}` | Public | Create or update the guest's RSVP; status is `attending`, `not_attending`, or `maybe` |
| `GET` | `/events/{event_id}/rsvps` | Event owner | List RSVPs for an owned event |
| `GET` | `/events/{event_id}/rsvp-summary` | Event owner | Read RSVP counts, including guests with no response |

### Contributions and payment history

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/contributions` | Organizer, guest's event owner | Record a contribution as `pending` |
| `POST` | `/contributions/manual` | Organizer, guest's event owner | Record a payment directly as `paid` |
| `POST` | `/contributions/{contribution_id}/confirm` | Contribution's event owner | Confirm payment and write a payment audit entry |
| `POST` | `/contributions/{contribution_id}/reject` | Contribution's event owner | Reject payment, save the reason/time, and write a payment audit entry |
| `GET` | `/events/{event_id}/contributions` | Event owner | List contributions with guest names |
| `GET` | `/events/{event_id}/contribution-summary` | Event owner | Read guest and contribution totals for the dashboard |
| `GET` | `/events/{event_id}/contributions/summary` | Organizer, event owner | Read the legacy contribution summary |
| `GET` | `/guests/{guest_id}/contributions` | Organizer, guest's event owner | Read one guest's contribution history and totals |
| `GET` | `/contributions/{contribution_id}/receipt` | Contribution's event owner | Read a receipt for a paid contribution |
| `GET` | `/contributions/{contribution_id}/audit` | Contribution's event owner | Read payment confirmation/rejection audit history |

Contribution statuses include `pending`, `paid`, `confirmed` (legacy paid records), `rejected`, and `failed`. Payment methods commonly used are `mpesa`, `tigopesa`, `airtel_money`, `bank`, and `cash`; manual entries accept a payment method string.

The event/dashboard contribution summary calculates `total_expected` from all contribution records, `total_paid` from `paid` and legacy `confirmed` records, and `total_pending` as expected minus paid. A guest's history reports `total_pending` from records whose status is specifically `pending`.

## Errors

Typical status codes include `401` for an invalid or expired token, `403` when an organizer does not own an event, `404` when a guest or contribution is unavailable to that organizer, `409` for a repeated or conflicting payment/check-in action, and `422` for invalid input. API errors use the application's JSON error handler.

## Database migrations

Create a migration after changing SQLAlchemy models:

```powershell
alembic revision --autogenerate -m "describe the schema change"
```

Review the generated migration before applying it, then run:

```powershell
alembic upgrade head
```

The Alembic configuration and the application currently use the local `wedding.db` SQLite file by default. Back up important local data before applying schema changes.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for the full text.
