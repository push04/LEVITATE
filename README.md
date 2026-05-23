# Levitate Labs Website

A modern agency website built with Next.js 16, Tailwind CSS v4, and Supabase.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Animations**: Framer Motion (optimized for performance)
- **Backend**: Supabase (database + file storage)
- **AI**: OpenRouter for chat widget
- **Deployment**: Netlify (serverless)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment to Netlify

### Option 1: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

### Option 2: Git Integration

1. Push your code to GitHub
2. Go to [Netlify Dashboard](https://app.netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect your GitHub repo
5. Netlify auto-detects Next.js settings

### Environment Variables on Netlify

In Netlify Dashboard → Site Settings → Environment Variables, add:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI chat |
| `ADMIN_USERNAME` | Admin dashboard username |
| `ADMIN_PASSWORD` | Admin dashboard password |

## Supabase Setup

Run the SQL schema to create all tables:

1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase-schema.sql`
3. Run the entire file

Create a storage bucket:
1. Go to Storage → New bucket
2. Name: `client-assets`
3. Make it public

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── api/             # API routes (serverless functions)
│   ├── admin/           # Admin dashboard
│   └── services/[slug]/ # Dynamic service pages
├── components/          # React components
│   ├── sections/        # Page sections (Hero, Services, etc.)
│   └── ui/              # Reusable UI components
├── data/                # Static data (services list)
└── lib/                 # Utilities (Supabase client)
```

## Features

- 20 detailed service pages with pricing
- Contact form with file upload
- AI chat widget
- Admin dashboard with leads management
- Dark/light theme toggle
- Fully responsive design
- SEO optimized

## License

Private - Levitate Labs
