"""
╔══════════════════════════════════════════════════════════════╗
║   LEVITATE LABS — Kaggle Gemma Server (Transformers)         ║
║                                                              ║
║   NO OLLAMA needed — uses HuggingFace directly (better!)    ║
║                                                              ║
║   BEFORE RUNNING:                                            ║
║   1. Kaggle → Settings → Accelerator → GPU T4               ║
║   2. Kaggle → Add-ons → Secrets → add HF_TOKEN              ║
║      (get free token at huggingface.co/settings/tokens)      ║
║   3. Accept Gemma license at huggingface.co/google/gemma-2-2b-it
║   4. Run this cell → wait ~5 min → copy the ngrok URL        ║
╚══════════════════════════════════════════════════════════════╝
"""

import subprocess, sys, os, threading, time

# ── STEP 1: Install only what Kaggle doesn't have ────────────
print("📦 Installing packages (fastapi, uvicorn, pyngrok)...")
subprocess.run(
    [sys.executable, "-m", "pip", "install", "-q",
     "fastapi", "uvicorn[standard]", "pyngrok", "requests", "accelerate"],
    check=True
)
print("✅ Done\n")

# ── STEP 2: Load model via HuggingFace Transformers ──────────
import torch
from transformers import pipeline, AutoTokenizer

# Model options (pick based on your VRAM):
#   "google/gemma-2-2b-it"   → 2B params, ~5GB VRAM, FASTEST   ← DEFAULT
#   "google/gemma-2-9b-it"   → 9B params, ~20GB VRAM (needs A100)
#   "google/gemma-3-4b-it"   → 4B params, ~10GB VRAM, good quality
#   "google/gemma-3-1b-it"   → 1B params, ~3GB VRAM, very fast but weaker
MODEL_ID = os.environ.get("GEMMA_MODEL", "google/gemma-2-2b-it")

# HuggingFace token (add as Kaggle secret "HF_TOKEN")
HF_TOKEN = os.environ.get("HF_TOKEN") or os.environ.get("HUGGINGFACE_TOKEN")
if not HF_TOKEN:
    try:
        from kaggle_secrets import UserSecretsClient
        HF_TOKEN = UserSecretsClient().get_secret("HF_TOKEN")
    except Exception:
        pass

if not HF_TOKEN:
    print("⚠️  HF_TOKEN not found. Go to Kaggle → Add-ons → Secrets → add HF_TOKEN")
    print("   Get a free token at: huggingface.co/settings/tokens")
    print("   Also accept Gemma license at: huggingface.co/google/gemma-2-2b-it\n")
    # Continue anyway — works if you previously logged in
else:
    print(f"✅ HF_TOKEN found")

print(f"\n🤖 Loading {MODEL_ID}...")
print(f"   GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU (slow!)'}")
print(f"   VRAM available: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB\n")

pipe = pipeline(
    "text-generation",
    model=MODEL_ID,
    device_map="auto",
    torch_dtype=torch.bfloat16,
    token=HF_TOKEN,
)
print(f"✅ {MODEL_ID} loaded and ready!\n")

# ── STEP 3: Build FastAPI server ─────────────────────────────
import requests as req_lib
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI(title="Levitate Labs Gemma Server")

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_ID,
        "provider": "kaggle-gpu-transformers",
        "service": "levitate-labs",
        "gpu": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "cpu"
    }

@app.get("/v1/models")
def list_models():
    return {
        "object": "list",
        "data": [{"id": "gemma-4", "object": "model", "owned_by": "levitate-labs"}]
    }

@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    body = await request.json()
    messages      = body.get("messages", [])
    max_new_tokens = min(int(body.get("max_tokens", 1500)), 3000)
    temperature   = float(body.get("temperature", 0.7))
    do_sample     = temperature > 0

    try:
        # transformers pipeline accepts the messages list directly (chat template)
        outputs = pipe(
            messages,
            max_new_tokens=max_new_tokens,
            temperature=temperature if do_sample else 1.0,
            do_sample=do_sample,
            return_full_text=False,
        )
        # Extract assistant reply
        generated = outputs[0]["generated_text"]
        if isinstance(generated, list):
            # chat format: last message is the assistant reply
            text = generated[-1].get("content", "")
        else:
            text = str(generated)
    except Exception as e:
        return JSONResponse(
            {"error": {"message": str(e), "type": "server_error"}},
            status_code=500
        )

    return JSONResponse({
        "id": "chatcmpl-kaggle-gemma",
        "object": "chat.completion",
        "model": "gemma-4",
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": text.strip()},
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": sum(len(m.get("content","").split()) for m in messages),
            "completion_tokens": len(text.split()),
            "total_tokens": sum(len(m.get("content","").split()) for m in messages) + len(text.split())
        }
    })

# ── STEP 4: Start server + ngrok tunnel ──────────────────────
import uvicorn
from pyngrok import ngrok, conf

# Optional: set ngrok authtoken for longer sessions (free at ngrok.com)
NGROK_TOKEN = os.environ.get("NGROK_TOKEN")
if not NGROK_TOKEN:
    try:
        from kaggle_secrets import UserSecretsClient
        NGROK_TOKEN = UserSecretsClient().get_secret("NGROK_TOKEN")
    except Exception:
        pass

if NGROK_TOKEN:
    conf.get_default().auth_token = NGROK_TOKEN
    print("✅ ngrok authtoken set (longer session)")
else:
    print("ℹ️  No NGROK_TOKEN — sessions last ~2h. Add it to Kaggle secrets for permanent URL.")

# Start uvicorn in background thread
server_thread = threading.Thread(
    target=lambda: uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning"),
    daemon=True
)
server_thread.start()
time.sleep(2)

# Open public tunnel
try:
    tunnel = ngrok.connect(8000, "http")
    public_url = tunnel.public_url
    # ngrok sometimes gives http — force https
    public_url = public_url.replace("http://", "https://")
except Exception as e:
    print(f"❌ ngrok failed: {e}")
    print("   Paste your ngrok authtoken as Kaggle secret 'NGROK_TOKEN'")
    public_url = "http://localhost:8000 (ngrok failed — tunnel manually)"

print("\n" + "="*65)
print("🎉  LEVITATE LABS GEMMA SERVER IS LIVE!")
print("="*65)
print(f"\n   🌐  {public_url}")
print(f"\n   ➡  Add this to Netlify Dashboard → Environment Variables:")
print(f"\n       GEMMA_API_URL = {public_url}\n")
print("="*65)

# ── STEP 5: Auto-register URL in Levitate Labs ───────────────
# Option A: via the admin API
try:
    r = req_lib.post(
        "https://levitatelabs.online/api/admin/agents",
        json={"action": "update_gemma_url", "agentName": "system", "url": public_url},
        timeout=8
    )
    print(f"\n{'✅' if r.ok else '⚠️ '} Auto-registered in Levitate Labs: {r.status_code}")
except Exception as e:
    print(f"\n⚠️  Auto-register skipped ({e})")

# Option B: directly update Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
if not SUPABASE_URL:
    try:
        from kaggle_secrets import UserSecretsClient
        sc = UserSecretsClient()
        SUPABASE_URL = sc.get_secret("SUPABASE_URL")
        SUPABASE_KEY = sc.get_secret("SUPABASE_SERVICE_KEY")
    except Exception:
        pass

if SUPABASE_URL and SUPABASE_KEY:
    try:
        import json
        req_lib.patch(
            f"{SUPABASE_URL}/rest/v1/system_config?key=eq.gemma_status",
            data=json.dumps({"value": {"url": public_url, "model": MODEL_ID, "status": "online"}}),
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            timeout=5
        )
        print("✅ Supabase gemma_status updated — dashboard will show 'online'")
    except Exception as e:
        print(f"⚠️  Supabase update skipped: {e}")

# ── STEP 6: Keep alive ───────────────────────────────────────
print(f"\n🔁 Server running. Kaggle GPU session = up to 12h.")
print(f"   Keep this cell running. Rerun to get a new URL after restart.\n")

try:
    ping_count = 0
    while True:
        time.sleep(60)
        ping_count += 1
        try:
            req_lib.get("http://localhost:8000/health", timeout=3)
            if ping_count % 10 == 0:
                print(f"   ♥  Still alive — {ping_count} min | URL: {public_url}")
        except Exception:
            print("   ⚠️  Server ping failed — may have crashed")
except KeyboardInterrupt:
    print("\n⛔ Stopped by user.")
    try:
        ngrok.kill()
    except Exception:
        pass
