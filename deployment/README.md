# GremlinLink Deployment Guide

## Coolify Deployment

GremlinLink is optimized for deployment on Coolify with automatic database migrations and data seeding.

### Prerequisites

1. **PostgreSQL Database** - Set up a PostgreSQL database in Coolify
2. **Environment Variables** - Configure the required environment variables
3. **Domain Configuration** - Set up your custom domain

### Environment Variables

Configure these environment variables in your Coolify service:

```bash
# Database (Required)
DATABASE_URL=postgresql://username:password@host:port/database

# Authentication (Required)
ALLOWED_DOMAINS=yourdomain.com,anotherdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Email Configuration (Required for magic links)
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@yourdomain.com

# Media Storage (Optional - for image uploads)
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_REGION=nyc3
DO_SPACES_BUCKET=your-bucket-name
DO_SPACES_KEY=your-spaces-key
DO_SPACES_SECRET=your-spaces-secret

# Environment
NODE_ENV=production
```

### Deployment Process

1. **Connect Repository** - Connect your GitHub repository to Coolify
2. **Configure Build Settings**:
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Port: `3000`
3. **Set Environment Variables** - Add all required environment variables
4. **Deploy** - The deployment script will automatically:
   - Run database migrations
   - Populate the database with word lists (if empty)
   - Start the application

### Automatic Database Setup

The deployment script (`scripts/deploy.sh`) automatically handles:

- **Database Migrations**: Applies all pending migrations using Drizzle
- **Data Seeding**: Populates the `url_words` table with adjectives and nouns for URL generation
- **Health Checks**: Verifies database connectivity before starting

### Health Monitoring

The application includes a health check endpoint at `/api/health` that:

- Verifies database connectivity
- Returns application uptime
- Provides deployment status

## Docker Deployment

### Build and Run Locally

```bash
# Build the Docker image
npm run docker:build

# Run with environment file
npm run docker:run
```

### Production Docker Deployment

```bash
# Build for production
docker build -t gremlinlink .

# Run with environment variables
docker run -d \
  --name gremlinlink \
  -p 3000:3000 \
  -e DATABASE_URL="your-database-url" \
  -e NEXT_PUBLIC_APP_URL="https://yourdomain.com" \
  -e RESEND_API_KEY="your-api-key" \
  gremlinlink
```

## Manual Deployment

For VPS or manual deployments:

1. **Clone and Install**:
   ```bash
   git clone https://github.com/gremlin-labs/gremlinlink.git
   cd gremlinlink
   npm install
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Build and Deploy**:
   ```bash
   npm run build
   npm run deploy  # Runs migrations and seeding
   npm start
   ```

## Troubleshooting

### Database Connection Issues

1. Verify `DATABASE_URL` is correctly formatted
2. Ensure database server is accessible
3. Check firewall settings

### Migration Failures

1. Check database permissions
2. Verify Drizzle configuration in `drizzle.config.ts`
3. Review migration logs

### Word List Population Issues

1. Ensure `data/` directory exists
2. Verify `adjectives-list.md` and `nouns-list.md` are present
3. Check file format (numbered list format)

### Health Check Failures

1. Verify application is running on correct port
2. Check database connectivity
3. Review application logs

## Performance Optimization

### Recommended Settings

- **Memory**: Minimum 512MB, recommended 1GB
- **CPU**: 1 vCPU minimum
- **Storage**: 10GB minimum for logs and uploads
- **Database**: Separate database server recommended for production

### Caching

Consider adding Redis for:
- Session storage
- URL resolution caching
- Analytics data caching

## Security Considerations

1. **Environment Variables**: Never commit `.env` files
2. **Database Access**: Use connection pooling
3. **HTTPS**: Always use HTTPS in production
4. **Domain Restrictions**: Configure `ALLOWED_DOMAINS` properly
5. **API Keys**: Rotate keys regularly

## Monitoring

### Recommended Monitoring

1. **Application Health**: Monitor `/api/health` endpoint
2. **Database Performance**: Track connection pool usage
3. **Response Times**: Monitor redirect performance
4. **Error Rates**: Track 4xx/5xx responses

### Logs

Application logs include:
- Deployment status
- Database migration results
- Health check results
- Error details 