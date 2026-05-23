"""
╔══════════════════════════════════════════════════════════════╗
║   LEVITATE LABS — AI Server (Qwen2.5-3B, no token needed)   ║
║                                                              ║
║   Fully open model — NO HuggingFace token required           ║
║                                                              ║
║   BEFORE RUNNING:                                            ║
║   1. Kaggle → Settings → Accelerator → GPU T4 or P100       ║
║   2. Kaggle → Add-ons → Secrets → add NGROK_TOKEN           ║
║      (get free token at ngrok.com — enables static URL)      ║
║   3. Run this cell → wait ~3 min → server is live            ║
╚══════════════════════════════════════════════════════════════╝
"""

import subprocess, sys, os, threading, time

# ── STEP 1: Install dependencies ─────────────────────────────
print("📦 Installing packages...")
subprocess.run(
    [sys.executable, "-m", "pip", "install", "-q",
     "fastapi", "uvicorn[standard]", "pyngrok", "requests", "accelerate"],
    check=True
)
print("✅ Done\n")

# ── STEP 2: Load model — Qwen2.5-3B-Instruct (fully open) ───
import torch
from transformers import pipeline

# Qwen2.5-3B-Instruct: excellent quality, fully open, no HF token, ~7GB VRAM
# Alternatives (all ungated):
#   "Qwen/Qwen2.5-1.5B-Instruct"  → 1.5B, ~4GB VRAM, very fast
#   "Qwen/Qwen2.5-7B-Instruct"    → 7B, ~16GB VRAM (needs A100)
#   "microsoft/phi-2"              → 2.7B, good for code tasks
MODEL_ID = os.environ.get("AI_MODEL", "Qwen/Qwen2.5-3B-Instruct")

gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
vram_gb  = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0

print(f"🤖 Loading {MODEL_ID}...")
print(f"   GPU: {gpu_name}")
print(f"   VRAM: {vram_gb:.1f} GB\n")

pipe = pipeline(
    "text-generation",
    model=MODEL_ID,
    device_map="auto",
    torch_dtype=torch.bfloat16,
    # No token needed — model is fully open
)
print(f"✅ {MODEL_ID} loaded and ready!\n")

# ── STEP 3: FastAPI server ────────────────────────────────────
import requests as req_lib
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI(title="Levitate Labs AI Server")

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_ID,
        "provider": "kaggle-gpu-transformers",
        "service": "levitate-labs",
        "gpu": gpu_name
    }

@app.get("/v1/models")
def list_models():
    return {
        "object": "list",
        "data": [{"id": "levitate-ai", "object": "model", "owned_by": "levitate-labs"}]
    }

@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    body = await request.json()
    messages       = body.get("messages", [])
    max_new_tokens = min(int(body.get("max_tokens", 1500)), 3000)
    temperature    = float(body.get("temperature", 0.7))
    do_sample      = temperature > 0

    try:
        outputs = pipe(
            messages,
            max_new_tokens=max_new_tokens,
            temperature=temperature if do_sample else 1.0,
            do_sample=do_sample,
            return_full_text=False,
        )
        generated = outputs[0]["generated_text"]
        if isinstance(generated, list):
            text = generated[-1].get("content", "")
        else:
            text = str(generated)
    except Exception as e:
        return JSONResponse(
            {"error": {"message": str(e), "type": "server_error"}},
            status_code=500
        )

    return JSONResponse({
        "id": "chatcmpl-levitate",
        "object": "chat.completion",
        "model": MODEL_ID,
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": text.strip()},
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": sum(len(m.get("content", "").split()) for m in messages),
            "completion_tokens": len(text.split()),
            "total_tokens": sum(len(m.get("content", "").split()) for m in messages) + len(text.split())
        }
    })

# ── STEP 4: ngrok tunnel ─────────────────────────────────────
import uvicorn
from pyngrok import ngrok, conf

# Load NGROK_TOKEN from Kaggle secrets or env
NGROK_TOKEN = os.environ.get("NGROK_TOKEN")
if not NGROK_TOKEN:
    try:
        from kaggle_secrets import UserSecretsClient
        NGROK_TOKEN = UserSecretsClient().get_secret("NGROK_TOKEN")
    except Exception:
        pass

STATIC_DOMAIN = "jasiah-nonaromatic-tami.ngrok-free.dev"  # Free static domain

if NGROK_TOKEN:
    conf.get_default().auth_token = NGROK_TOKEN
    print(f"✅ ngrok authtoken set")
else:
    print("⚠️  No NGROK_TOKEN — add it to Kaggle Secrets for static URL")

# Start uvicorn in background thread
server_thread = threading.Thread(
    target=lambda: uvicorn.run(app, host="0.0.0.0", port=8000, log_level="warning"),
    daemon=True
)
server_thread.start()
time.sleep(3)

# Open ngrok tunnel — use static domain if we have auth token
try:
    if NGROK_TOKEN:
        tunnel = ngrok.connect(8000, "http", domain=STATIC_DOMAIN)
    else:
        tunnel = ngrok.connect(8000, "http")
    public_url = tunnel.public_url.replace("http://", "https://")
except Exception as e:
    print(f"❌ ngrok failed: {e}")
    public_url = f"https://{STATIC_DOMAIN} (tunnel may have failed)"

print("\n" + "="*65)
print("🎉  LEVITATE LABS AI SERVER IS LIVE!")
print("="*65)
print(f"\n   🌐  {public_url}")
print(f"\n   Model: {MODEL_ID}")
print(f"   GPU:   {gpu_name}")
print("="*65 + "\n")

# ── STEP 5: Auto-register URL ────────────────────────────────
# Update Levitate Labs so it knows the new Gemma URL
try:
    r = req_lib.post(
        "https://levitatelabs.online/api/admin/agents",
        json={"action": "update_gemma_url", "agentName": "system", "url": public_url},
        timeout=8
    )
    print(f"{'✅' if r.ok else '⚠️ '} Auto-registered in Levitate Labs ({r.status_code})")
except Exception as e:
    print(f"⚠️  Auto-register skipped: {e}")

# Also update via Supabase directly if credentials available
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
        print("✅ Supabase gemma_status updated")
    except Exception as e:
        print(f"⚠️  Supabase update skipped: {e}")

# ── STEP 6: Keep alive (ping every 60s) ──────────────────────
print(f"\n🔁 Server running. Kaggle GPU = up to 12h.")
print(f"   This cell must stay running. Don't close the notebook.\n")

try:
    ping_count = 0
    while True:
        time.sleep(60)
        ping_count += 1
        try:
            req_lib.get("http://localhost:8000/health", timeout=3)
            if ping_count % 10 == 0:
                print(f"   ♥  Still alive — {ping_count} min | {public_url}")
        except Exception:
            print("   ⚠️  Server ping failed — may have crashed")
except KeyboardInterrupt:
    print("\n⛔ Stopped.")
    try:
        ngrok.kill()
    except Exception:
        pass
