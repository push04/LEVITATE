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
| `NEXT_PUBLIC_SUPABASE_URL` | `your_supabase_url` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `your_anon_key` |
| `SUPABASE_SERVICE_ROLE_KEY` | `your_service_role_key` |
| `OPENROUTER_API_KEY` | `your_openrouter_api_key` |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD` | `your_secure_password` |

### 4. Deploy
Click **"Deploy site"** - Netlify will build and deploy automatically!

---

## Your Actual Values (from .env.local)

Copy these directly into Netlify:

```
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY

SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

OPENROUTER_API_KEY=YOUR_OPENROUTER_API_KEY

ADMIN_USERNAME=admin

ADMIN_PASSWORD=your_secure_password
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
