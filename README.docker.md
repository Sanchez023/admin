# Claw Admin Docker Deployment

## Quick Start

### Prerequisites
- Docker
- Docker Compose

### Development Mode

1. Start all services:
```bash
docker-compose up -d
```

2. Access the application:
- Frontend: http://localhost:3006
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Using Makefile

```bash
# Build images
make build

# Start services
make up

# View logs
make logs

# Stop services
make down

# Restart services
make restart

# Clean up (remove containers and volumes)
make clean
```

### Manual Docker Commands

```bash
# Build images
docker-compose build

# Start in foreground (to see logs)
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild a specific service
docker-compose build backend
docker-compose build frontend
```

## Configuration

### Environment Variables

Copy `.env.docker` to `.env` and adjust as needed:

```bash
cp .env.docker .env
```

### Ports

| Service | Port |
|---------|------|
| Frontend | 3006 |
| Backend API | 8000 |
| Nginx | 80 |

## Production Deployment

For production, update the following:

1. Change `DEBUG=false` in environment
2. Update `SECRET_KEY` to a secure random string
3. Consider using a external database (PostgreSQL)
4. Configure SSL/TLS in nginx.conf

### Production Build

```bash
# Build for production
docker-compose -f docker-compose.yml build

# Start production services
docker-compose -f docker-compose.yml up -d
```

## Troubleshooting

### View logs for specific service

```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs nginx
```

### Rebuild after code changes

```bash
docker-compose build --no-cache
docker-compose up -d
```

### Reset database

```bash
docker-compose down -v
rm -rf backend/claw_admin.db
docker-compose up -d
```
