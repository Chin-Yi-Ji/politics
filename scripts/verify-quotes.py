#!/usr/bin/env python3
"""逐字比對：實際抓每一張政見卡的來源頁，確認網址打得開、原話逐字存在。

用法：python3 scripts/verify-quotes.py [縣市代碼 ...]
不給縣市就檢查全部。只用 Python 標準函式庫與 curl，規則和 src/lib/gates.ts 相同。
"""
import hashlib, html, json, pathlib, re, subprocess, sys, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = pathlib.Path.home() / ".cache" / "xian-kan-zhengjian"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

def normalize(text):
    text = unicodedata.normalize("NFKC", html.unescape(text))
    text = re.sub(r"<[^>]*>", "", text)
    text = re.sub(r"[\s​﻿]+", "", text)
    return re.sub(r"[「」『』“”\"']", "", text)

def fetch(url, refresh):
    CACHE.mkdir(parents=True, exist_ok=True)
    p = CACHE / (hashlib.sha1(url.encode()).hexdigest()[:16] + ".html")
    if p.exists() and not refresh:
        return p.read_text(encoding="utf-8", errors="replace"), "200"
    r = subprocess.run(["curl", "-sS", "-L", "--compressed", "--max-time", "25", "-A", UA,
                        "-H", "Accept-Language: zh-TW,zh;q=0.9", "-w", "\n%{http_code}", url], capture_output=True)
    body, _, code = r.stdout.decode("utf-8", errors="replace").rpartition("\n")
    if code.strip() == "200" and body.strip():
        p.write_text(body, encoding="utf-8")
    return body, code.strip() or "連線失敗"

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    refresh = "--refresh" in sys.argv
    files = sorted((ROOT / "data" / "policies").glob("*.json"))
    if args:
        files = [f for f in files if f.stem in args]
    pages, bad, total = {}, [], 0
    for f in files:
        data = json.loads(f.read_text(encoding="utf-8"))
        if data["countyId"] == "demo":
            continue
        for card in data["cards"]:
            for o in card["originals"]:
                total += 1
                url = o["sourceUrl"]
                if url not in pages:
                    body, code = fetch(url, refresh)
                    pages[url] = (normalize(body), code)
                text, code = pages[url]
                if code != "200":
                    bad.append((card["id"], f"來源網址回應 {code}", url, ""))
                elif normalize(o["quote"]) not in text:
                    bad.append((card["id"], "原話在來源頁面上找不到", url, o["quote"]))
    print(f"檢查 {total} 句原話、{len(pages)} 個來源頁，{len(bad)} 項沒過。")
    for cid, reason, url, quote in bad:
        print(f" - {cid}：{reason}\n   {quote}\n   {url}")
    sys.exit(1 if bad else 0)

if __name__ == "__main__":
    main()
