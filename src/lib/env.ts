import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  GROQ_API_KEY: z.string().optional(),
  CEREBRAS_API_KEY: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  GH_OWNER: z.string().optional(),
  GH_WEBSITE_REPO: z.string().optional(),
  NETLIFY_TOKEN: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_PLATFORM_URL: z.string().url(),
  BUILD_CALLBACK_SECRET: z.string().min(1),
  NEXT_PUBLIC_WHATSAPP_CHANNEL_URL: z.string().url().optional(),
  NEXT_PUBLIC_DEMO_VIDEO_URL: z.string().url().optional(),
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),
  NEXT_PUBLIC_WHATSAPP_CHANNEL_COUNT: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
}
export const env = parsed.success ? parsed.data : ({} as z.infer<typeof envSchema>);
