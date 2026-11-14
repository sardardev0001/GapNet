# Upgrading an existing GapNet installation

This repository standardizes the Docker Compose project identifier to `gapnet`.

**Important:** Docker Compose derives named volume names from its project name. If you ran a prior build with a different project name, a new `docker compose up` can create **fresh empty volumes** instead of attaching your existing database and media. Existing volumes are not deleted automatically, but previous messages may appear missing until the correct volumes are reattached.

Before replacing an existing installation:

1. Make a backup of its database and user-uploaded media. Never use `docker compose down -v` as an upgrade step.
2. Record its Compose project identifier with `docker compose ls` and its named volumes with `docker volume ls`.
3. For a transitional start that keeps the old project identifier, use `docker compose -p <YOUR_PREVIOUS_COMPOSE_PROJECT_NAME> up -d --build` with your previous `.env` file.
4. If you want to migrate to the new project identifier, plan an explicit backup/restore or volume migration first. Renaming the project identifier by itself does not migrate volume contents.

The browser's local session key has changed; you may need to sign in again. No messages are removed from PostgreSQL by that browser-side change.
