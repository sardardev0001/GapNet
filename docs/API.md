# REST & WebSocket API

Prefix: `/api/`. Authentication: `Authorization: Bearer <access>` except register/login/refresh.

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `auth/register/` | `username`, `display_name`, `password`, `password_confirm` → 201 `{access, refresh, user}` |
| POST | `auth/login/` | `username`, `password` → `{access, refresh, user}` |
| POST | `auth/refresh/` | `refresh` → `{access}` |
| GET/PATCH | `me/` | Current profile; PATCH accepts `display_name`, `bio`, `avatar_url` |
| GET | `users/?q=sara` | Handle/display-name search (max 30) |
| GET | `conversations/` | User's private/group conversations, last message, unread count and per-member `read_states` |
| POST | `conversations/` | `{username:"sara"}` or `{kind:"group",title:"Team",member_ids:[1,2]}` |
| GET/PATCH | `conversations/<uuid>/` | Details; group creator can change title |
| GET | `conversations/<uuid>/messages/?before=<uuid>` | At most 50 messages, oldest-first; returns `{items,has_more,next_cursor}` |
| POST | `conversations/<uuid>/messages/` | 201; JSON `{text,client_nonce}` or multipart text + attachment + nonce |
| POST | `conversations/<uuid>/read/` | Mark read |
| PATCH/DELETE | `messages/<uuid>/` | Sender-only edit text / soft delete |
| GET | `messages/<uuid>/attachment/` | Authenticated file download, requires membership |
| POST | `ws-ticket/` | `{ticket,expires_in:60}` |

WebSocket at `/ws/chat/?ticket=<signed-ticket>` (get ticket first). Server events: `connected`, `conversation.created`, `conversation.updated`, `message.created`, `message.updated`, `conversation.read`, `typing`, `typing.stop`, `presence`. Client events: `{"type":"typing","conversation_id":"..."}` and `{"type":"typing.stop","conversation_id":"..."}`. Non-members cannot subscribe or send typing to another conversation.

## Important rules

- Usernames: lowercase normalized and must match `[a-zA-Z0-9_]{3,30}`.
- Direct conversations are unique by sorted pair key.
- Message `client_nonce` UUID is idempotent for one sender; retries return HTTP 200 and the existing message, not a second message.
- Messages require text or an attachment. File max 10MB; allowed extensions PNG/JPEG/WebP/GIF/PDF/TXT/ZIP.
- Group creation must contain at least one other existing member.
- Client should treat all timestamps as UTC ISO 8601 and render using its desired locale.
