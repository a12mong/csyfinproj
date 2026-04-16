# CSYFinproj Documentation

## Overview

Yamaha motorcycle sales and finance management system. Built as a monorepo with Next.js frontend, Express API backend, and PostgreSQL database.

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.x
- PostgreSQL 15+

### Setup

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Run database migrations
pnpm db:migrate

# Generate Prisma client
pnpm db:generate

# Start development servers
pnpm dev
```

### Environment Variables

**Backend (apps/api/.env)**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT signing
- `PORT` - API server port (default: 4000)
- `LINE_CHANNEL_ACCESS_TOKEN` - LINE Messaging API token
- `SMS_API_KEY` - SMS gateway API key
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` - Email configuration
- `UPLOAD_DIR` - Directory for file uploads

**Frontend (apps/web/.env)**
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:4000/api/v1)

## Architecture

See `docs/01_ARCHITECTURE.yml` for full system architecture.

## API Reference

See `docs/03_API_CONTRACT.yml` for complete API endpoint documentation.

## Database Schema

See `docs/02_DATABASE.yml` for table definitions and relationships.
