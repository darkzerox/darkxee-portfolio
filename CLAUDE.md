# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a portfolio website project that combines a legacy static site with a modern full-stack application. The project includes:

- **Frontend**: Modern Vite.js + Tailwind CSS application with vanilla JavaScript components
- **Backend**: Express.js API server with MongoDB with Prisma ORM
- **Legacy Assets**: Original Jekyll-based static site assets in `/asset/` directory
- **Database Migration**: Scripts to migrate from JSON files to MongoDB database

## Development Commands

### Core Development
```bash
# Start development server (frontend only)
pnpm dev

# Start API server in development mode
pnpm run dev:server

# Build for production
pnpm build

# Preview production build
pnpm preview

# Start production server (serves built frontend + API)
pnpm server
```

### Database Operations
```bash
# Migrate data from JSON files to MongoDB using Prisma ORM
pnpm migrate
```

### Testing and Quality
```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run specific test file
pnpm test tests/path/to/test.js

# Run tests matching pattern
pnpm test -- -t "test pattern"

# Run tests with coverage
pnpm test -- --coverage

# Lint code (ESLint)
npx eslint .

# Format code (Prettier)
npx prettier --write .
```

## Architecture

### Dual Structure
The project maintains both legacy and modern structures:

- **Legacy**: `/asset/` contains original Jekyll site files (CSS, JS, images, JSON data)
- **Modern**: `/src/` contains new Vite.js application with components and services

### API Architecture
- **Server**: Express.js server (`server.js`) handles both API routes and static file serving
- **Database**: MongoDB database managed with Prisma ORM for portfolio and skills data
- **Routes**: API endpoints in `/src/routes/` for portfolio (`/api/portfolio`) and skills (`/api/skills`)
- **Services**: Database abstraction layer in `/src/services/MongoDBService.js`

### Frontend Architecture
- **Entry Point**: `index.html` → `/src/main.js`
- **Components**: Vanilla JavaScript classes in `/src/components/`
- **Services**: API client and database services in `/src/services/`
- **Styling**: Tailwind CSS with custom configuration in `tailwind.config.js`

### Component Architecture
- Components follow a class-based pattern with lifecycle methods (`init()`)
- State management is handled within components (no global state)
- Data fetching centralized through `ApiClient` service
- Components use dependency injection (services passed via constructor)

### Caching Strategy
- API responses cached for 5 minutes in `ApiClient`
- Cache keys based on endpoint + filter parameters
- Development mode includes detailed error logging

### Database Schema
**Portfolio Table:**
- id, name, img, site, date, category, description, created_at, updated_at

**Skills Table:**
- id, name, power (0-100), category, created_at, updated_at

## Key Files and Patterns

### Configuration Files
- `vite.config.js`: Vite configuration with proxy to API server (port 3000)
- `tailwind.config.js`: Custom theme with portfolio-specific colors and animations
- `eslint.config.js`: Modern ESLint flat config with ES2022 modules
- `.prettierrc`: Code formatting rules (no semicolons, single quotes)

### Development Patterns
- **ES Modules**: All files use modern import/export syntax
- **Database Access**: Use `MongoDBService` class for all database operations
- **API Responses**: Consistent JSON format with `success`, `data`, `error` fields
- **Error Handling**: Graceful error handling with different responses for dev/prod

### Data Migration
The `scripts/migrate-data.js` handles migration from legacy JSON files:
- Reads from `asset/database/portfolio.json` and `asset/database/skill.json`
- Handles field name inconsistencies (e.g., `cateogry` vs `category`)
- Validates data before insertion

### Legacy Data Format
Portfolio items in `asset/database/portfolio.json`:
- Supports both `category` and `cateogry` fields for legacy compatibility
- Image paths relative to `/asset/img/portfolio/`

Skills data in `asset/database/skill.json`:
- Power values normalized to 0-100 range
- Categories must match predefined list

### Testing
- **Framework**: Jest with ES modules support
- **API Testing**: Supertest for Express.js route testing
- **Mocking**: Database service mocked for unit tests
- **Test Location**: `/tests/` directory

## Development Notes

### Server Development
- Frontend dev server (Vite): `http://localhost:5173`
- API server: `http://localhost:3000`
- Vite proxy configuration forwards `/api` requests to Express server
- Use `pnpm run dev:server` for API development

### Database Development
- MongoDB database configured via `DATABASE_URL` environment variable
- Use Prisma's migration tools after changing data structure
- Database service includes connection pooling and error handling
- WAL mode enabled for better concurrent access

### Code Style
- No semicolons, single quotes (Prettier)
- ES6+ features preferred (arrow functions, const/let, template literals)
- Unused variables prefixed with underscore are ignored
- Console statements produce warnings in ESLint