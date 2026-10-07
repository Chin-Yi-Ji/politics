#!/usr/bin/env python3
"""由資料檔產生 docs/DATA-STATUS.md：逐縣市列出每位候選人有幾個領域的政見卡與來源情況。

用法：python3 scripts/data-status.py
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = ROOT / "data"
load = lambda p: json.loads((D / p).read_text(encoding="utf-8"))
counties, cands, sources, domains = load("counties.json"), load("candidates.json"), load("sources.json"), load("domains.json")
LABEL = {"ready": "已齊（第一手來源）", "ready-extended": "已齊（含新聞報導）", "collecting": "整理中"}

out, total, with_cards = [], 0, 0
for co in counties:
    if co["id"] == "demo":
        continue
    pf = D / "policies" / f"{co['id']}.json"
    file = json.loads(pf.read_text(encoding="utf-8")) if pf.exists() else {"asOf": "", "cards": []}
    out.append(f"## {co['name']}：{LABEL[co['status']]}\n")
    if co.get("pendingNote"):
        out.append(co["pendingNote"] + "\n")
    out.append("| 候選人 | 政黨 | 政見卡 | 來源 | 備註 |\n|---|---|---|---|---|")
    for c in [x for x in cands if x["countyId"] == co["id"]]:
        cards = [k for k in file["cards"] if k["candidateId"] == c["id"]]
        kinds = {o["sourceType"] for k in cards for o in k["originals"]}
        first, media = bool(kinds - {"media"}), "media" in kinds
        kind = "官方來源＋新聞報導" if first and media else "官方來源" if first else "新聞報導" if media else "無"
        s = sources.get(c["id"], {})
        links = " ".join(f"[{o['label']}]({o['url']})" for o in s.get("official", []))
        note = (links + " " + s.get("note", "")).strip()
        out.append(f"| {c['name']} | {c['party']} | {len(cards)} / {len(domains)} | {kind} | {note} |")
        total += len(cards)
        with_cards += bool(cards)
    out.append("")

n = {k: sum(1 for c in counties if c["status"] == k and c["id"] != "demo") for k in LABEL}
asof = max(json.loads(p.read_text(encoding="utf-8"))["asOf"] for p in (D / "policies").glob("*.json"))
n_all = sum(1 for c in cands if c["countyId"] != "demo")
head = f"""# 資料現況

{asof} 整理。這份報告由 `scripts/data-status.py` 從資料檔產生，逐縣市列出每位候選人目前有幾個領域的政見卡，以及來源情況。目前共 {total} 張政見卡，涵蓋 {n_all} 位候選人中的 {with_cards} 位。

- **已齊（第一手來源）**（{n['ready']} 個縣市）：主要候選人都有可逐字查證的官方政見。
- **已齊（含新聞報導）**（{n['ready-extended']} 個縣市）：至少一位主要候選人沒有官方政見頁，改用新聞報導補齊。嚴格模式（`SOURCE_MODE=strict`）下這些縣市不開放。
- **整理中**（{n['collecting']} 個縣市）：盲選與對照表都不開放，只顯示候選人名冊。

靠新聞報導整理的候選人，卡片數反映的是「報導寫到多少」，不是他的政見多寡。現任首長只收「接下來要做」的承諾，不收政績，所以卡片通常比挑戰者少。
"""
(ROOT / "docs" / "DATA-STATUS.md").write_text(head + "\n" + "\n".join(out), encoding="utf-8")
print(f"{total} 張卡、{with_cards}/{n_all} 位候選人；", n)
