# Project Structure

This project follows a modular architecture with clear separation of concerns:

## Directory Structure

```
src/
├── assets/
│   ├── css/           # Stylesheets and Tailwind CSS
│   ├── js/            # Main application entry point
│   ├── img/           # Images and media files
│   └── fonts/         # Font files
├── components/        # Reusable UI components
│   ├── Navigation.js  # Navigation component
│   ├── Portfolio.js   # Portfolio component
│   └── Skills.js      # Skills component
├── services/          # API and external service clients
│   └── ApiClient.js   # Centralized API client
└── utils/             # Utility functions and helpers
    └── helpers.js     # Common utility functions
```

## Components

- **Navigation**: Handles smooth scrolling navigation and mobile menu
- **Portfolio**: Manages portfolio data fetching, filtering, and display
- **Skills**: Handles skills data and progress bar animations

## Services

- **ApiClient**: Centralized service for API communication with caching and error handling

## Development

The project uses:

- Vite.js for build tooling and development server
- Tailwind CSS for styling
- ESLint for code linting
- Prettier for code formatting
- pnpm for package management

## Getting Started

1. Install dependencies: `pnpm install`
2. Start development server: `pnpm dev`
3. Build for production: `pnpm build`
