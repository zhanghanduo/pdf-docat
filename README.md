# DocCat - PDF Content Extraction

DocCat is a sophisticated PDF content extraction platform that leverages AI-powered OCR technology and intelligent document processing, with advanced rendering and user-friendly interfaces.

## Features

- **AI-Powered OCR**: Leverages Mistral-OCR via OpenRouter API for advanced content extraction
- **Smart PDF Detection**: Automatically identifies scanned vs. structured PDFs and applies the optimal processing method
- **Intelligent Table Detection**: Automatically identifies and extracts tables with proper formatting
- **Translation Support**: Convert extracted content to multiple languages including Chinese, English, Japanese, and more
- **Multi-language UI**: Application interface available in Chinese (default) and English
- **Caching System**: Avoid reprocessing duplicate files with SHA-256 based file caching
- **User Management**: Admin interface for managing user access
- **Rate Limiting**: Prevents abuse with tiered rate limiting

## Tech Stack

- **Frontend**: React with TypeScript, TailwindCSS, Shadcn UI components
- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Drizzle ORM
- **API Integration**: OpenRouter for AI model access
- **Authentication**: JWT-based authentication with role-based access control
- **Containerization**: Docker and Docker Compose for easy deployment

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- OpenRouter API key (for AI processing)

## Installation and Setup

### Using Docker (Recommended)

1. Clone the repository:

```bash
git clone https://github.com/yourusername/doccat.git
cd doccat
```

2. Create a `.env` file in the root directory with the following variables:

```
# Database configuration
DATABASE_URL=postgresql://postgres:postgres@db:5432/doccat
PGHOST=db
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=doccat
PGPORT=5432

# API Keys
OPENROUTER_API_KEY=your_openrouter_api_key

# JWT Secret
JWT_SECRET=your_secret_key

# Rate limiting (optional, defaults shown)
RATE_LIMIT_GENERAL=100         # General API requests per 15 minutes
RATE_LIMIT_PDF_PROCESSING=10   # PDF processing requests per hour
RATE_LIMIT_DAILY=20            # PDFs per day per user
```

3. Build and start the containers:

```bash
docker-compose up -d
```

4. Access the application at http://localhost:3000

### Manual Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/doccat.git
cd doccat
```

2. Install dependencies:

```bash
npm install
```

3. Create a PostgreSQL database and update the `.env` file with your database connection details:

```
DATABASE_URL=postgresql://username:password@localhost:5432/doccat
PGHOST=localhost
PGUSER=username
PGPASSWORD=password
PGDATABASE=doccat
PGPORT=5432
OPENROUTER_API_KEY=your_openrouter_api_key
JWT_SECRET=your_secret_key
```

4. Push the database schema:

```bash
npm run db:push
```

5. Start the development server:

```bash
npm run dev
```

6. Access the application at http://localhost:3000

## User Guide

### Authentication

The system comes with a predefined admin user:
- Username: admin_handuo
- Password: Christlurker2

New users must be created by an admin through the user management interface.

### PDF Processing

1. Log in to the application
2. Navigate to the Dashboard
3. Upload a PDF file
4. Configure translation options if needed
5. Click "Process Document"
6. View and export the extracted content

### Translation Options

- **Enable Translation**: Toggle translation on/off
- **Target Language**: Select the language to translate to
- **Dual Language View**: Display both original and translated text

## Docker Compose Configuration

The included `docker-compose.yml` file sets up:

1. A Node.js application container
2. A PostgreSQL database container
3. Proper networking between containers
4. Volume mapping for persistent data storage

## Development 

### Project Structure

```
doccat/
├── client/                  # Frontend React application
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── hooks/           # React hooks
│   │   ├── lib/             # Utility functions
│   │   ├── pages/           # Application pages
│   │   └── App.tsx          # Main application component
├── server/                  # Backend Express server
│   ├── api/                 # API implementations
│   ├── middleware/          # Express middleware
│   ├── index.ts             # Server entry point
│   └── routes.ts            # API route definitions
├── shared/                  # Shared code between client and server
│   └── schema.ts            # Database schema definitions
└── docker-compose.yml       # Docker Compose configuration
```

### Database Migrations

The project uses Drizzle ORM for database access. To update the database schema:

1. Modify the schema definitions in `shared/schema.ts`
2. Run the schema push command:

```bash
npm run db:push
```

## License

MIT

## Acknowledgements

- OpenRouter for AI model access
- Shadcn UI for component library
- Drizzle ORM for database access
- All the open source libraries that made this project possible