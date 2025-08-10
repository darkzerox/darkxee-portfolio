# Portfolio by Darkxee

A modern portfolio website built with Node.js, Express, and MongoDB.

Theme by [Freelancer](http://startbootstrap.com/template-overviews/freelancer/)

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- MongoDB database (local or cloud)
- pnpm package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd darkzerox.github.io
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```env
DATABASE_URL="mongodb://localhost:27017/portfolio"
NODE_ENV="development"
PORT=3000
```

For MongoDB Atlas (cloud), use a connection string like:
```env
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/portfolio?retryWrites=true&w=majority"
```

4. Generate Prisma client:
```bash
npx prisma generate
```

5. Start the development server:
```bash
pnpm run dev:server
```

The application will be available at `http://localhost:3000`

### Database Setup

This application uses MongoDB as the primary database. The database contains two main collections:

- **portfolio**: Stores portfolio project information
- **skills**: Stores technical skills with proficiency levels

#### MongoDB Connection

The application connects to MongoDB using the `DATABASE_URL` environment variable. Ensure your MongoDB instance is running and accessible.

#### Data Migration

If you have existing data in JSON format, you can migrate it using:
```bash
pnpm run migrate
```

This will read data from `asset/database/portfolio.json` and `asset/database/skill.json` files and import them into MongoDB.

### Available Scripts

- `pnpm run dev` - Start Vite development server for frontend
- `pnpm run dev:server` - Start Express server in development mode
- `pnpm run server` - Start Express server in production mode
- `pnpm run build` - Build the frontend for production
- `pnpm run migrate` - Run data migration to MongoDB
- `pnpm run test` - Run test suite
- `pnpm run test:watch` - Run tests in watch mode

### API Endpoints

- `GET /api/portfolio` - Get all portfolio items (supports category filtering and pagination)
- `GET /api/portfolio/:id` - Get specific portfolio item by ID
- `GET /api/skills` - Get all skills (supports category filtering)

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | MongoDB connection string | Required |
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |

### Development

The application uses:
- **Backend**: Node.js with Express
- **Database**: MongoDB with Prisma ORM
- **Frontend**: Vanilla JavaScript with Vite
- **Testing**: Jest with Supertest

### Troubleshooting

#### Database Connection Issues

1. Ensure MongoDB is running (if using local instance)
2. Check the `DATABASE_URL` format is correct
3. Verify network connectivity to MongoDB instance
4. Check MongoDB authentication credentials

#### Migration Issues

1. Ensure JSON data files exist in `asset/database/` directory
2. Check MongoDB connection is working
3. Review migration logs for specific errors
