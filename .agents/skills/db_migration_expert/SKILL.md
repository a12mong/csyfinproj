# DB Migration Expert Skill

## Purpose
Handles database migration creation and management using Prisma ORM.

## Usage
- Generate migrations from schema changes: `pnpm db:migrate`
- Generate Prisma client: `pnpm db:generate`
- Always update `docs/02_DATABASE.yml` before creating migrations
- Migration files live in `apps/api/prisma/migrations/`

## Rules
- Never modify existing migration files
- Always create a new migration for schema changes
- Test migrations on a fresh database before committing
- Include both up and down migration logic where possible
