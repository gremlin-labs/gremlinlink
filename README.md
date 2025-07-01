![gremlinlink by gremlinlabs](assets/gremlinlabs-gremlinlink.jpg)

# GremlinLink 🔗

**The URL shortener that doesn't just redirect—it showcases.**

## Why GremlinLink?

In the age of personal branding, every link is an opportunity. Whether you're sharing your latest project, building a professional presence, or creating a content empire, you need more than just shortened URLs—you need a platform that works as hard as you do.

**GremlinLink** is your personal hub for intelligent link management. Create beautiful short URLs that don't just redirect—they showcase your brand, track performance, and build connections. One click, infinite possibilities.

## What Makes It Special

### Intelligent URL Shortening
- **Custom Branded Links** - Create memorable short URLs with your personal touch (`gremlin.link/portfolio`)
- **Smart Slug Generation** - Auto-generate unique slugs or craft your own memorable ones
- **Bulk Import Power** - Migrate your existing link collections instantly
- **Reserved Word Protection** - Intelligent conflict detection and resolution

### Advanced Content Management
- **Multi-Format Content Blocks** - Articles, images, galleries, redirects, and composite pages
- **Drag & Drop Page Builder** - Compose rich landing pages with zero coding
- **Rich Text Editor** - Powered by Lexical for professional content creation
- **Media Library** - Upload, organize, and optimize images with automatic thumbnails

### Analytics That Actually Help
- **Real-Time Click Tracking** - See exactly how your links perform across time and geography
- **Visual Analytics Dashboard** - Beautiful charts showing trends, top performers, and user behavior
- **Geographic Insights** - Understand where your audience comes from
- **Export Capabilities** - Download your data for deeper analysis

### Security & Authentication
- **Magic Link Authentication** - Passwordless, secure admin access via email
- **Domain Restrictions** - Control who can access your admin panel
- **Session Management** - Secure, HTTP-only cookies with proper expiration
- **Privacy-First Analytics** - Track performance without compromising user privacy

### Professional Infrastructure
- **Lightning-Fast Redirects** - Sub-100ms redirect times with middleware optimization
- **Database-Driven Architecture** - PostgreSQL + Drizzle ORM for bulletproof reliability
- **Docker Deployment Ready** - One-command deployment to any VPS
- **TypeScript Throughout** - Type safety from database to frontend

## Your Link Management Hub

- 🎯 **Smart Link Creation** - Transform any URL into a branded, trackable powerhouse
- 📊 **Performance Analytics** - Beautiful dashboards that turn clicks into insights
- 🎨 **Content Composition** - Build rich landing pages that convert visitors into followers
- 🔒 **Enterprise Security** - Bank-level security for your personal brand
- ⚡ **Blazing Performance** - Optimized for speed, built for scale

## Getting Started

### Quick Setup (Recommended)

```bash
# Get the code
git clone https://github.com/gremlin-labs/gremlinlink.git
cd gremlinlink

# Install dependencies
npm install

# Set up your environment (see Environment Setup below)
cp .env.example .env

# Initialize the database
npm run db:push
npm run db:seed

# Start building your link empire
npm run dev
```

Visit `http://localhost:3000` to access your new link management hub.

### Production Deployment

```bash
# Build for production
npm run build

# Deploy with Docker
docker build -t gremlinlink .
docker run -p 3000:3000 --env-file .env gremlinlink
```

## Environment Setup

Create your `.env` file with these essential variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gremlinlink

# Authentication Configuration
ALLOWED_DOMAINS=yourcompany.com,yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Email Configuration (Resend)
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=noreply@yourdomain.com

# Media Storage (Digital Ocean Spaces)
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_REGION=nyc3
DO_SPACES_BUCKET=your-bucket-name
DO_SPACES_KEY=your-spaces-key
DO_SPACES_SECRET=your-spaces-secret

# Environment
NODE_ENV=production
```

## Service Integrations

GremlinLink plays nicely with best-in-class services:

### 📧 **Email Magic** - [Resend](https://resend.com)
Powers magic link authentication and notifications with enterprise-grade deliverability.

### 🗄️ **Data Persistence** - [PostgreSQL](https://postgresql.org)
Battle-tested data storage with ACID compliance and infinite scalability.

### ☁️ **Media Storage** - [Digital Ocean Spaces](https://digitalocean.com/products/spaces)
S3-compatible object storage for your media assets with global CDN distribution.

### 🎨 **Beautiful UI** - [Shadcn/UI](https://ui.shadcn.com)
Gorgeous, accessible components built on Radix UI primitives and Tailwind CSS.

## How It Works

### Content Creation Workflow
1. **Access Admin Panel** - Navigate to `/admin` and authenticate via magic link
2. **Create Content** - Choose from redirects, articles, images, galleries, or composite pages
3. **Customize & Configure** - Set custom slugs, metadata, and display options
4. **Deploy & Track** - Publish instantly and monitor performance in real-time

### Link Management Features
- **Bulk Operations** - Select multiple links for batch publish/unpublish/delete actions
- **Privacy Controls** - Make content public or private with granular access control
- **Landing Page Assignment** - Set featured content that represents your brand
- **Performance Monitoring** - Track clicks, referrers, and geographic distribution

### Advanced Page Building
- **Block-Based Architecture** - Combine different content types into rich experiences
- **Drag & Drop Reordering** - Arrange content blocks with intuitive visual editing
- **Custom Styling** - Add custom CSS for pixel-perfect brand alignment
- **Responsive Design** - All content automatically optimizes for mobile and desktop

## Technical Details

### Core Technologies
- **[Next.js 15](https://nextjs.org)** - Full-stack React framework with App Router
- **[TypeScript](https://typescriptlang.org)** - Type-safe development from database to UI
- **[Drizzle ORM](https://orm.drizzle.team)** - Type-safe database operations with PostgreSQL
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first styling with custom design system

### Advanced Features
- **[Lexical Editor](https://lexical.dev)** - Extensible rich text editing framework
- **[React Query](https://tanstack.com/query)** - Intelligent data fetching and caching
- **[Framer Motion](https://framer.com/motion)** - Smooth animations and micro-interactions
- **[Sharp](https://sharp.pixelplumbing.com)** - High-performance image processing

### Infrastructure & Deployment
- **Docker Support** - Containerized deployment for any cloud provider
- **Database Migrations** - Version-controlled schema evolution with Drizzle Kit
- **Performance Monitoring** - Built-in analytics and performance tracking
- **Security Headers** - Production-ready security configuration

## Contributing

We're always looking for contributors who appreciate well-crafted tools. 

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## About gremlinlabs

GremlinLink is a [gremlinlabs](https://github.com/gremlin-labs) creation. We build tools that are wildly useful, thoughtfully designed, and powerful enough to build empires with.

---

**Ready to transform your links into something special?**

```bash
git clone https://github.com/gremlin-labs/gremlinlink.git
cd gremlinlink
npm install && npm run dev
```

Made with 💚 mischief by gremlinlabs