"""Fetch public-domain Wang Xianqian scans, verifying Commons size and SHA-1.

Usage: python3 scripts/fetch-shijing-scans.py [--check] [--number 6]
The PDFs are research inputs in ignored .cache, not deployed website assets.
"""
import argparse
import hashlib
import json
from pathlib import Path
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent.parent


def verify(item, target):
    if not target.exists() or target.stat().st_size != item["bytes"]:
        return False
    digest = hashlib.sha1()
    with target.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest() == item["sha1"]


def download(item, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    if verify(item, target):
        return
    if target.exists() and target.stat().st_size >= item["bytes"]:
        raise RuntimeError(f"Existing file has wrong checksum; preserve it for inspection: {target}")
    for attempt in range(4):
        start = target.stat().st_size if target.exists() else 0
        headers = {"User-Agent": "PhilologyResearch/1.0"}
        if start:
            headers["Range"] = f"bytes={start}-"
        request = urllib.request.Request(item["url"], headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                if start and response.status != 206:
                    raise RuntimeError("Server did not honor the requested resume range")
                if start and not response.headers.get("Content-Range", "").startswith(f"bytes {start}-"):
                    raise RuntimeError("Server returned the wrong resume range")
                with target.open("ab" if start else "wb") as stream:
                    while True:
                        chunk = response.read(1024 * 1024)
                        if not chunk:
                            break
                        stream.write(chunk)
        except urllib.error.HTTPError as error:
            if error.code not in (429, 503) or attempt == 3:
                raise
            delay = max(60, int(error.headers.get("Retry-After", "60")))
            print(f"HTTP {error.code}; respecting Retry-After ({delay}s)", flush=True)
            time.sleep(delay)
        if verify(item, target):
            return
    raise RuntimeError(f"Incomplete or changed scan: {target}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--number", type=int)
    args = parser.parse_args()
    manifest = json.loads((ROOT / "scripts/snapshots/shijing-wang-scans.json").read_text())
    items = [item for item in manifest["files"] if args.number is None or item["number"] == args.number]
    if not items:
        raise RuntimeError("Unknown scan number")
    for item in items:
        target = ROOT / item["localFile"]
        print(f"Checking/fetching book {item['number']:02d}: {item['pages']} PDF pages", flush=True)
        if not args.check:
            download(item, target)
        if not verify(item, target):
            raise RuntimeError(f"Missing or invalid scan: {target}")
        print(f"Verified book {item['number']:02d}: {item['bytes']} bytes, SHA-1 {item['sha1']}", flush=True)


if __name__ == "__main__":
    main()
