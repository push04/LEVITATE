from __future__ import annotations

import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "security-audit"
RAW_MATCHES_JSON = OUT_DIR / "raw-matches.json"
INVENTORY_JSON = OUT_DIR / "inventory.json"


def _git_ls_files() -> list[str]:
    out = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
    return [p.decode("utf-8", errors="replace") for p in out.split(b"\x00") if p]


def _safe_read_text(path: Path, max_bytes: int = 2_000_000) -> str | None:
    try:
        size = path.stat().st_size
    except OSError:
        return None

    if size == 0:
        return ""
    if size > max_bytes:
        return None

    try:
        data = path.read_bytes()
    except OSError:
        return None

    # crude binary detection
    if b"\x00" in data:
        return None
    sample = data[:4096]
    if sample:
        nontext = sum(1 for b in sample if b < 9 or (13 < b < 32))
        if (nontext / len(sample)) > 0.2:
            return None

    return data.decode("utf-8", errors="replace")


def _redact(value: str) -> str:
    value = value.strip()
    if not value:
        return value
    if len(value) <= 8:
        return "*" * len(value)
    return f"{value[:4]}…{value[-4:]}"


@dataclass(frozen=True)
class Rule:
    id: str
    title: str
    category: str
    severity: str
    regex: re.Pattern[str]


def _rules() -> list[Rule]:
    # High-confidence secret formats first (minimize noise)
    return [
        Rule(
            id="secret.private_key_block",
            title="Private key material in repo",
            category="Secrets",
            severity="CRITICAL",
            regex=re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
        ),
        Rule(
            id="secret.aws_access_key_id",
            title="AWS Access Key ID format detected",
            category="Secrets",
            severity="CRITICAL",
            regex=re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
        ),
        Rule(
            id="secret.google_api_key",
            title="Google API key format detected",
            category="Secrets",
            severity="HIGH",
            regex=re.compile(r"\bAIza[0-9A-Za-z\-_]{35}\b"),
        ),
        Rule(
            id="secret.github_pat",
            title="GitHub token format detected",
            category="Secrets",
            severity="CRITICAL",
            regex=re.compile(
                r"\b(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{20,})\b"
            ),
        ),
        Rule(
            id="secret.slack_token",
            title="Slack token format detected",
            category="Secrets",
            severity="CRITICAL",
            regex=re.compile(r"\bxox[baprs]-[0-9A-Za-z-]{10,}\b"),
        ),
        Rule(
            id="secret.sendgrid",
            title="SendGrid API key format detected",
            category="Secrets",
            severity="CRITICAL",
            regex=re.compile(r"\bSG\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"),
        ),
        Rule(
            id="secret.stripe_live",
            title="Stripe live key format detected",
            category="Secrets",
            severity="CRITICAL",
            regex=re.compile(r"\b(?:sk_live|rk_live)_[0-9a-zA-Z]{16,}\b"),
        ),
        Rule(
            id="secret.twilio_sid_key",
            title="Twilio SID/API key format detected",
            category="Secrets",
            severity="HIGH",
            regex=re.compile(r"\b(?:AC|SK)[0-9a-fA-F]{32}\b"),
        ),
        Rule(
            id="secret.openai_key_like",
            title="OpenAI key-like token detected",
            category="Secrets",
            severity="CRITICAL",
            regex=re.compile(r"\bsk-[A-Za-z0-9]{20,}\b"),
        ),
        Rule(
            id="secret.db_uri",
            title="Database connection URI detected",
            category="Secrets",
            severity="HIGH",
            regex=re.compile(
                r"\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis)://[^\s'\"]+\b"
            ),
        ),
        Rule(
            id="secret.jwt",
            title="JWT-like token detected",
            category="Secrets",
            severity="MEDIUM",
            regex=re.compile(
                r"\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\b"
            ),
        ),
        # Code execution / injection primitives
        Rule(
            id="inj.eval",
            title="Dynamic code execution (eval) usage",
            category="Injection",
            severity="HIGH",
            regex=re.compile(r"\beval\s*\("),
        ),
        Rule(
            id="inj.new_function",
            title="Dynamic code execution (new Function) usage",
            category="Injection",
            severity="HIGH",
            regex=re.compile(r"\bnew\s+Function\s*\("),
        ),
        Rule(
            id="inj.child_process",
            title="Command execution primitive (child_process) usage",
            category="Injection",
            severity="HIGH",
            # Avoid false positives on regex `.exec(...)` and object `.spawn(...)`.
            regex=re.compile(r"\bchild_process\b|(?<!\.)\bexec(?:Sync)?\s*\(|(?<!\.)\bspawn\s*\("),
        ),
        # XSS sinks
        Rule(
            id="xss.dangerouslySetInnerHTML",
            title="React dangerouslySetInnerHTML usage",
            category="XSS",
            severity="HIGH",
            regex=re.compile(r"\bdangerouslySetInnerHTML\b"),
        ),
        Rule(
            id="xss.innerHTML",
            title="DOM sink (innerHTML/document.write) usage",
            category="XSS",
            severity="MEDIUM",
            regex=re.compile(r"\binnerHTML\b|\bdocument\.write\b"),
        ),
        # Auth/session storage smells
        Rule(
            id="auth.localstorage_token",
            title="Token stored in localStorage/sessionStorage",
            category="Auth",
            severity="HIGH",
            regex=re.compile(
                r"\b(?:localStorage|sessionStorage)\.setItem\([^)]*(token|jwt)[^)]*\)"
            ),
        ),
    ]


def _candidate_files(tracked: list[str]) -> list[Path]:
    files: set[Path] = set()
    for rel in tracked:
        files.add(ROOT / rel)

    # Include common local secret files even if ignored/untracked (audit-only)
    for extra in [
        ".env",
        ".env.local",
        ".env.production",
        ".env.development",
        ".env.example",
        ".npmrc",
    ]:
        p = ROOT / extra
        if p.exists():
            files.add(p)

    # WhatsApp web.js auth/cache dirs are sensitive even if untracked
    for extra_dir in [".wwebjs_auth", ".wwebjs_cache"]:
        d = ROOT / extra_dir
        if d.exists():
            for p in d.rglob("*"):
                if p.is_file():
                    files.add(p)

    return sorted(files)


def _inventory(tracked: list[str]) -> dict:
    tracked_set = set(tracked)
    counts_by_prefix: dict[str, int] = {}
    for p in tracked:
        prefix = p.split("/", 1)[0]
        counts_by_prefix[prefix] = counts_by_prefix.get(prefix, 0) + 1

    tracked_netlify = [p for p in tracked if p.startswith(".netlify/")]
    tracked_github = [p for p in tracked if p.startswith(".github/")]

    return {
        "root": str(ROOT),
        "tracked_files": len(tracked),
        "tracked_prefix_counts": dict(
            sorted(counts_by_prefix.items(), key=lambda x: (-x[1], x[0]))
        ),
        "tracked_netlify_files": len(tracked_netlify),
        "tracked_github_files": len(tracked_github),
        "tracked_has_package_lock": "package-lock.json" in tracked_set,
        "tracked_has_yarn_lock": "yarn.lock" in tracked_set,
        "tracked_has_pnpm_lock": "pnpm-lock.yaml" in tracked_set,
        "tracked_has_dockerfile": any(p.lower().endswith("dockerfile") for p in tracked),
        "tracked_has_docker_compose": any(
            p.lower().endswith("docker-compose.yml") for p in tracked
        ),
    }


def scan() -> list[dict]:
    tracked = _git_ls_files()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    INVENTORY_JSON.write_text(json.dumps(_inventory(tracked), indent=2), encoding="utf-8")

    rules = _rules()
    candidates = _candidate_files(tracked)

    matches: list[dict] = []

    netlify_allow = {".netlify/state.json", ".netlify/netlify.toml"}

    for path in candidates:
        rel = str(path.relative_to(ROOT)).replace("\\", "/")

        # Skip scanning massive generated deploy blobs by default; inventory separately.
        if rel.startswith(".netlify/deploy/"):
            continue

        # Skip vendored / generated content (noise + 3rd-party code).
        if "/node_modules/" in rel:
            continue
        if rel.startswith(".netlify/") and rel not in netlify_allow:
            continue

        text = _safe_read_text(path)
        if text is None:
            continue

        for line_no, line in enumerate(text.splitlines(), start=1):
            for rule in rules:
                m = rule.regex.search(line)
                if not m:
                    continue
                snippet = line.strip()
                if rule.category == "Secrets":
                    seg = m.group(0)
                    snippet = snippet.replace(seg, _redact(seg))
                matches.append(
                    {
                        "rule_id": rule.id,
                        "title": rule.title,
                        "category": rule.category,
                        "severity": rule.severity,
                        "file": rel,
                        "line": line_no,
                        "evidence": snippet[:500],
                    }
                )

    RAW_MATCHES_JSON.write_text(json.dumps(matches, indent=2), encoding="utf-8")
    return matches


def main() -> int:
    try:
        matches = scan()
    except subprocess.CalledProcessError as e:
        sys.stderr.write(e.output.decode("utf-8", errors="replace"))
        return 2

    print(f"Wrote: {RAW_MATCHES_JSON}")
    print(f"Wrote: {INVENTORY_JSON}")
    print(f"Raw matches: {len(matches)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
