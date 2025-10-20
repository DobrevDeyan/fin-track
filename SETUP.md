# FinTrack Setup Guide

This guide will help you set up the FinTrack development environment and get the application running locally.

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js 18+** and npm
- **Python 3.11+** and pip
- **Docker** and Docker Compose
- **Git**

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd fin-track
```

### 2. Set Up Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your configuration
```

### 3. Set Up Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
# Edit .env.local with your configuration
```

### 4. Set Up Database

#### Option A: Using Docker Compose (Recommended)

```bash
# From the project root
docker-compose up -d db

# Wait for database to be ready
docker-compose logs db
```

#### Option B: Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database named `fintrack`
3. Update the `DATABASE_URL` in `backend/.env`

### 5. Run the Application

#### Backend (Terminal 1)

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Development with Docker

### Run Everything with Docker Compose

```bash
# From the project root
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

This will start:
- PostgreSQL database on port 5432
- FastAPI backend on port 8000
- Redis on port 6379

## Environment Configuration

### Backend Environment Variables

Create `backend/.env` with the following:

```env
# Database
DATABASE_URL=postgresql://fintrack_user:fintrack_password@localhost:5432/fintrack

# Security
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
ALLOWED_ORIGINS=["http://localhost:3000", "http://localhost:3001"]
ALLOWED_HOSTS=["*"]

# Application
DEBUG=true
```

### Frontend Environment Variables

Create `frontend/.env.local` with the following:

```env
# API Configuration
API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key
```

## Database Setup

### Create Database Tables

The database tables will be created automatically when you start the FastAPI application. However, you can also create them manually:

```bash
cd backend
python -c "from app.database import engine; from app.models import Base; Base.metadata.create_all(bind=engine)"
```

### Database Migrations (Future)

When you need to create migrations:

```bash
cd backend
alembic revision --autogenerate -m "Description of changes"
alembic upgrade head
```

## Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in backend/.env
   - Verify database credentials

2. **Port Already in Use**
   - Change ports in docker-compose.yml
   - Kill processes using the ports: `lsof -ti:8000 | xargs kill -9`

3. **Module Import Errors**
   - Ensure virtual environment is activated
   - Reinstall dependencies: `pip install -r requirements.txt`

4. **Frontend Build Errors**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check TypeScript errors: `npm run type-check`

### Logs

View application logs:

```bash
# Backend logs
docker-compose logs backend

# Database logs
docker-compose logs db

# All logs
docker-compose logs -f
```

## Next Steps

1. **Explore the API**: Visit http://localhost:8000/docs
2. **Test Authentication**: Try registering and logging in
3. **Add Transactions**: Use the dashboard to add sample data
4. **Customize**: Modify the UI and add new features

## Development Workflow

1. **Make Changes**: Edit code in your preferred editor
2. **Test Locally**: Ensure changes work in development
3. **Commit Changes**: Use git to version control your changes
4. **Deploy**: Push to production when ready

## Getting Help

- Check the [ROADMAP.md](./ROADMAP.md) for development phases
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Read the [README.md](./README.md) for project overview

Happy coding! 🚀
