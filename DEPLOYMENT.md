# 🚀 Netlify Deployment Guide for Levitate Labs

## Quick Deploy Steps

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/levitate-labs.git
git push -u origin main
```

### 2. Connect to Netlify
1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Select **GitHub** and authorize
4. Choose your `levitate-labs` repository
5. Netlify auto-detects Next.js settings ✅

### 3. Add Environment Variables

In Netlify: **Site Settings → Environment Variables → Add variable**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://eelwkowdkpmobbudqqlb.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbHdrb3dka3Btb2JidWRxcWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMTM5NTAsImV4cCI6MjA4Mzg4OTk1MH0.XekhAlo0IWQTOIEog0xlxk3lT5x836t7Zn1BbVulWgc` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbHdrb3dka3Btb2JidWRxcWxiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMxMzk1MCwiZXhwIjoyMDgzODg5OTUwfQ.BfBHkb0FMPqPNJ2N8JUOvEefd22L3LGY5kNSfYfr8mI` |
| `OPENROUTER_API_KEY` | `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` |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD` | `@Pushpal2004` |

### 4. Deploy
Click **"Deploy site"** - Netlify will build and deploy automatically!

---

## Your Actual Values (from .env.local)

Copy these directly into Netlify:

```
NEXT_PUBLIC_SUPABASE_URL=https://eelwkowdkpmobbudqqlb.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbHdrb3dka3Btb2JidWRxcWxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMTM5NTAsImV4cCI6MjA4Mzg4OTk1MH0.XekhAlo0IWQTOIEog0xlxk3lT5x836t7Zn1BbVulWgc

SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlbHdrb3dka3Btb2JidWRxcWxiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMxMzk1MCwiZXhwIjoyMDgzODg5OTUwfQ.BfBHkb0FMPqPNJ2N8JUOvEefd22L3LGY5kNSfYfr8mI

OPENROUTER_API_KEY=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

ADMIN_USERNAME=admin

ADMIN_PASSWORD=@Pushpal2004
```

---

## Supabase Setup (One-time)

Before deploying, set up your database:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project → **SQL Editor**
3. Paste contents of `supabase-schema.sql` 
4. Click **Run**

Create storage bucket:
1. Go to **Storage** → **New bucket**
2. Name: `client-assets`
3. Make it **public**

---

## Build Settings (Auto-detected)

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Publish directory | `.next` |
| Node version | `20` |

---

## After Deploy

Your site will be live at: `https://your-site-name.netlify.app`

### Custom Domain
1. **Domain settings** → **Add custom domain**
2. Add your domain (e.g., `levitatelabs.com`)
3. Point your DNS to Netlify

### URLs
- **Home**: `https://yourdomain.com`
- **Admin**: `https://yourdomain.com/admin`
- **Services**: `https://yourdomain.com/services/full-stack-app` (etc.)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails | Check Node version is 20 in Netlify settings |
| API routes 404 | Ensure `@netlify/plugin-nextjs` is in package.json |
| Supabase errors | Verify env variables don't have extra spaces |
| Images not loading | Check Supabase storage bucket is public |

---

**WhatsApp Support**: [+91 6299549112](https://wa.me/916299549112)
