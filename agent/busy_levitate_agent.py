"""
LEVITATE Sync Agent for Busy Accounting Software
Reads Busy .bds files directly and pushes data to your LEVITATE CRM.
No BusyNotify subscription needed.

Usage:
  busy_levitate_agent.exe --config config.json
  busy_levitate_agent.exe --setup   (interactive first-run wizard)
"""

import os
import sys
import json
import time
import hashlib
import logging
import argparse
import datetime
import requests
import traceback
from pathlib import Path

# pyodbc only needed when actually reading — imported lazily
try:
    import pyodbc
    PYODBC_OK = True
except ImportError:
    PYODBC_OK = False

# ─── Logging ────────────────────────────────────────────────────────────────

LOG_FILE = Path(os.path.dirname(sys.executable if getattr(sys, 'frozen', False) else __file__)) / "levitate_agent.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("levitate_agent")

# ─── Config helpers ─────────────────────────────────────────────────────────

DEFAULT_CONFIG = {
    "levitate_api_url": "https://your-levitate-domain.netlify.app",
    "levitate_api_key": "",
    "busy_data_dir": "C:\\BusyWin\\DATA\\COMP0001",
    "financial_year": "auto",          # "auto" = current FY, or "2024" etc.
    "sync_customers": True,
    "sync_invoices": True,
    "sync_interval_minutes": 60,       # 0 = run once and exit
    "last_sync_hash": "",              # internal state — do not edit
}

def load_config(path: Path) -> dict:
    if not path.exists():
        log.warning(f"Config not found at {path} — using defaults. Run --setup first.")
        return DEFAULT_CONFIG.copy()
    with open(path, "r", encoding="utf-8") as f:
        cfg = json.load(f)
    merged = {**DEFAULT_CONFIG, **cfg}
    return merged

def save_config(cfg: dict, path: Path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)

# ─── Busy DB helpers ─────────────────────────────────────────────────────────

BUSY_PASSWORD = "ILoveMyINDIA"

def get_fy_year(year_override: str) -> int:
    """Return the 4-digit start year of the current (or given) financial year."""
    if year_override and year_override != "auto":
        return int(year_override)
    today = datetime.date.today()
    # Indian FY: Apr 1 – Mar 31
    return today.year if today.month >= 4 else today.year - 1

def find_bds_file(busy_data_dir: str, fy_year: int) -> Path:
    """Locate the Busy database file for the given financial year."""
    base = Path(busy_data_dir)
    # Busy names files db1YYYY.bds where YYYY is the FY start year (e.g. db12024.bds)
    candidates = [
        base / f"db1{fy_year}.bds",
        base / f"db1{str(fy_year)[-2:]}.bds",   # older 2-digit naming: db124.bds
        base / "db1.bds",
    ]
    for c in candidates:
        if c.exists():
            return c
    # Fall back: pick any .bds in the folder
    bds_files = sorted(base.glob("*.bds"))
    if bds_files:
        log.warning(f"Exact FY file not found; using {bds_files[-1].name}")
        return bds_files[-1]
    raise FileNotFoundError(f"No .bds file found in {busy_data_dir}")

def open_busy_db(bds_path: Path):
    """Return a pyodbc connection to the Busy database."""
    if not PYODBC_OK:
        raise RuntimeError("pyodbc is not installed. Re-run setup.bat.")
    conn_str = (
        f"DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};"
        f"DBQ={bds_path};"
        f"PWD={BUSY_PASSWORD};"
    )
    return pyodbc.connect(conn_str, autocommit=True)

def read_customers(conn) -> list[dict]:
    """Read party/customer master from Master1."""
    sql = """
        SELECT
            M.Code      AS party_code,
            M.Name      AS party_name,
            M.MasterType AS master_type,
            M.ParentGrp AS account_group,
            M.Mobile    AS mobile,
            M.Email     AS email,
            M.Address1  AS address,
            M.City      AS city,
            M.State     AS state,
            M.PinCode   AS pincode,
            M.GSTNo     AS gstin,
            M.CrLimit   AS credit_limit,
            M.OpBal     AS opening_balance
        FROM Master1 AS M
        WHERE M.MasterType IN (1, 2, 3)
    """
    # MasterType 1=Sundry Debtors group, 2=Sundry Creditors, 3=Customers
    # Some Busy versions use different type IDs — we cast broadly and filter by group
    try:
        cur = conn.cursor()
        cur.execute(sql)
        cols = [d[0] for d in cur.description]
        rows = []
        for row in cur.fetchall():
            rows.append(dict(zip(cols, row)))
        return rows
    except Exception:
        # Fallback: no column filters
        sql2 = "SELECT Code, Name, MasterType, ParentGrp FROM Master1"
        cur = conn.cursor()
        cur.execute(sql2)
        cols = [d[0] for d in cur.description]
        return [dict(zip(cols, row)) for row in cur.fetchall()]

def read_invoices(conn) -> list[dict]:
    """Read sales/purchase invoice headers from Tran1 + party info from Tran2."""
    sql = """
        SELECT
            T1.VchNo      AS bill_no,
            T1.VchDate    AS bill_date,
            T1.VchType    AS vch_type,
            T1.NetAmt     AS net_amount,
            T1.TaxAmt     AS tax_amount,
            T1.GrossAmt   AS gross_amount,
            T2.Name       AS party_name,
            T2.GSTNo      AS party_gstin
        FROM Tran1 AS T1
        LEFT JOIN Tran2 AS T2 ON T1.VchNo = T2.VchNo AND T2.RecType = 1
        WHERE T1.VchType IN (4, 5, 6, 22)
        ORDER BY T1.VchDate DESC
    """
    # VchType 4=Sales, 5=Purchase, 6=Credit Note, 22=Sales Return — adjust as needed
    try:
        cur = conn.cursor()
        cur.execute(sql)
        cols = [d[0] for d in cur.description]
        rows = []
        for row in cur.fetchall():
            d = dict(zip(cols, row))
            # Serialize dates
            if hasattr(d.get("bill_date"), "isoformat"):
                d["bill_date"] = d["bill_date"].isoformat()
            rows.append(d)
        return rows
    except Exception as e:
        log.warning(f"Invoice read error (non-fatal): {e}")
        return []

# ─── Payload helpers ─────────────────────────────────────────────────────────

def data_hash(customers: list, invoices: list) -> str:
    payload = json.dumps({"c": len(customers), "i": len(invoices)}, sort_keys=True)
    return hashlib.md5(payload.encode()).hexdigest()

def push_to_levitate(cfg: dict, customers: list, invoices: list) -> dict:
    url = cfg["levitate_api_url"].rstrip("/") + "/api/busy/ingest"
    headers = {
        "Content-Type": "application/json",
        "x-levitate-key": cfg["levitate_api_key"],
    }
    payload = {
        "customers": customers,
        "invoices": invoices,
        "agent_version": "1.0.0",
        "synced_at": datetime.datetime.utcnow().isoformat() + "Z",
    }
    resp = requests.post(url, json=payload, headers=headers, timeout=60)
    resp.raise_for_status()
    return resp.json()

# ─── Main sync ───────────────────────────────────────────────────────────────

def run_sync(cfg: dict, config_path: Path):
    log.info("=== LEVITATE Sync Agent starting sync ===")

    if not cfg.get("levitate_api_key"):
        log.error("levitate_api_key is empty. Run --setup to configure.")
        return

    try:
        fy = get_fy_year(cfg.get("financial_year", "auto"))
        bds_path = find_bds_file(cfg["busy_data_dir"], fy)
        log.info(f"Opening {bds_path}")
        conn = open_busy_db(bds_path)
    except Exception as e:
        log.error(f"Cannot open Busy database: {e}")
        return

    customers, invoices = [], []
    try:
        if cfg.get("sync_customers", True):
            customers = read_customers(conn)
            log.info(f"Read {len(customers)} customers from Master1")
        if cfg.get("sync_invoices", True):
            invoices = read_invoices(conn)
            log.info(f"Read {len(invoices)} invoices from Tran1")
    finally:
        conn.close()

    # Skip push if nothing changed
    h = data_hash(customers, invoices)
    if h == cfg.get("last_sync_hash"):
        log.info("No data changes since last sync — skipping push.")
        return

    try:
        result = push_to_levitate(cfg, customers, invoices)
        log.info(f"Pushed successfully: {result}")
        cfg["last_sync_hash"] = h
        save_config(cfg, config_path)
    except requests.HTTPError as e:
        log.error(f"HTTP error pushing to LEVITATE: {e.response.status_code} {e.response.text[:200]}")
    except Exception as e:
        log.error(f"Push failed: {e}")

# ─── Setup wizard ─────────────────────────────────────────────────────────────

def run_setup(config_path: Path):
    print("\n=== LEVITATE Sync Agent — First-Run Setup ===\n")
    cfg = load_config(config_path)

    def ask(prompt, default):
        val = input(f"{prompt} [{default}]: ").strip()
        return val if val else default

    cfg["levitate_api_url"] = ask("LEVITATE site URL", cfg["levitate_api_url"])
    cfg["levitate_api_key"] = ask("LEVITATE API key (from Admin → API Portal)", cfg["levitate_api_key"])
    cfg["busy_data_dir"]    = ask("Busy data folder", cfg["busy_data_dir"])
    cfg["financial_year"]   = ask("Financial year start (4-digit) or 'auto'", cfg["financial_year"])
    interval = ask("Sync interval in minutes (0 = run once)", str(cfg["sync_interval_minutes"]))
    cfg["sync_interval_minutes"] = int(interval)

    save_config(cfg, config_path)
    print(f"\nConfig saved to {config_path}")
    print("Run the agent again (without --setup) to start syncing.\n")

# ─── Entry point ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="LEVITATE Sync Agent for Busy Accounting")
    parser.add_argument("--config", default="config.json", help="Path to config.json")
    parser.add_argument("--setup", action="store_true", help="Run interactive setup wizard")
    parser.add_argument("--once", action="store_true", help="Sync once and exit (ignores sync_interval_minutes)")
    args = parser.parse_args()

    config_path = Path(args.config)

    if args.setup:
        run_setup(config_path)
        return

    cfg = load_config(config_path)

    interval = cfg.get("sync_interval_minutes", 60)

    if args.once or interval == 0:
        run_sync(cfg, config_path)
        return

    log.info(f"Running in loop mode — syncing every {interval} minutes. Ctrl+C to stop.")
    while True:
        try:
            run_sync(cfg, config_path)
        except Exception:
            log.error(f"Unhandled error:\n{traceback.format_exc()}")
        time.sleep(interval * 60)


if __name__ == "__main__":
    main()
