#!/usr/bin/env python3
"""整理各縣市「最近網路上在談什麼」，輸出 data/heat.json。

來源只有兩種公開、不必登入的頁面：
  1. 自由時報站內搜尋的結果則數：近 WINDOW_DAYS 天同時提到「縣市名」與「領域關鍵字」的新聞有幾則
  2. PTT 各縣市地方板的文章標題與推文數（近 WINDOW_DAYS 天）
不含臉書、Threads、Dcard、Mobile01、LINE 社群：這些要登入或擋自動讀取，我們不繞過。

算法（關鍵字都在 data/heat-keywords.json）：
  - 新聞：每個領域用 3 個關鍵字各查一次，則數相加；領域占比 = 該領域則數 ÷ 12 個領域的總則數
  - PTT：標題歸到領域（一篇最多算 2 個），每篇的份量 = 1 + 推文數/10（推文數上限 100）。
          先排除買賣、徵求、食記等分類，以及選舉報導與社會事件。歸得進領域的文章不到 MIN_PTT 篇就不採用
  - 熱度 index = 新聞占比與 PTT 占比的平均（沒有 PTT 就只用新聞）
  - lift = 這個縣市的新聞占比 ÷ 各縣市同一領域新聞占比的平均。大於 1 表示比其他縣市更常被提到。
    關鍵字本身有多常見，各縣市都一樣，相除之後就抵銷了

用法：python3 scripts/build-heat.py [--counties taipei,tainan] [--max-seconds 150] [--offline]
抓過的頁面會存在快取資料夾（預設 ~/.cache/xian-kan-heat），中斷後重跑會接著抓。
全部縣市都抓完後才會寫出 data/heat.json。
"""
import datetime as dt
import html
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.environ.get("HEAT_CACHE", os.path.expanduser("~/.cache/xian-kan-heat"))
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
WINDOW_DAYS = 90
PTT_MAX_PAGES = 40
MIN_NEWS = 60   # 12 個領域加起來的新聞則數少於這個數字，就不顯示這個縣市的熱度
MIN_PTT = 15

# 縣市代碼 -> (搜尋用的縣市名, PTT 地方板)
SOURCES = {
    "taipei": ("台北", ["Taipei"]),
    "new-taipei": ("新北", ["BigBanciao"]),
    "taoyuan": ("桃園", ["Taoyuan", "ChungLi"]),
    "taichung": ("台中", ["TaichungBun"]),
    "tainan": ("台南", ["Tainan"]),
    "kaohsiung": ("高雄", ["Kaohsiung"]),
    "keelung": ("基隆", ["Keelung"]),
    "hsinchu-city": ("新竹市", ["Hsinchu"]),
    "hsinchu-county": ("新竹縣", ["Hsinchu"]),
    "miaoli": ("苗栗", ["Miaoli"]),
    "changhua": ("彰化", ["ChangHua"]),
    "nantou": ("南投", ["Nantou"]),
    "yunlin": ("雲林", ["Yunlin"]),
    "chiayi-city": ("嘉義市", ["Chiayi"]),
    "chiayi-county": ("嘉義縣", ["Chiayi"]),
    "pingtung": ("屏東", ["PingTung"]),
    "yilan": ("宜蘭", ["I-Lan"]),
    "hualien": ("花蓮", ["Hualien"]),
    "taitung": ("台東", ["Taitung"]),
    "penghu": ("澎湖", ["PH-sea"]),
    "kinmen": ("金門", ["Kinmen"]),
    "lienchiang": ("馬祖", ["Matsu"]),
}

ELECTION = re.compile(r"選戰|造勢|站台|民調|參選|輔選|競選|競總|選舉|候選人|政見|拜票|掃街|提名|藍營|綠營|白營|國民黨|民進黨|民眾黨|罷免")
INCIDENT = re.compile(
    r"車禍|追撞|撞|酒駕|毒駕|肇事|身亡|命危|死亡|喪命|遺體|屍|落網|逮|羈押|收押|交保|起訴|判刑|判賠|判決|求刑|"
    r"竊|搶|砍|殺|性侵|猥褻|偷拍|涉貪|貪污|搜索|約談|火警|失火|起火|火燒|墜|溺|鬥毆|槍擊|走私|通緝|嫌犯"
)
PTT_SKIP_TAG = re.compile(r"交易|買賣|徵求|贈送|商業|廣告|公告|食記|徵才|揪團|售|租|轉讓|合購|團購|協尋|徵|賣|買|送|換")

OFFLINE = False
DEADLINE = float("inf")


def log(*a):
    print(*a, file=sys.stderr, flush=True)


class OutOfTime(Exception):
    pass


def cache_path(url):
    return os.path.join(CACHE, re.sub(r"[^A-Za-z0-9._-]", "_", url)[-200:])


def fetch(url, cookie=None, pause=1.0, empty_on_404=False):
    """抓一頁並快取。失敗（被擋、逾時、離線且沒快取）就丟 OutOfTime，讓這個縣市留到下次"""
    if time.time() > DEADLINE:
        raise OutOfTime()
    os.makedirs(CACHE, exist_ok=True)
    path = cache_path(url)
    if os.path.exists(path):
        return open(path, encoding="utf-8").read()
    if OFFLINE:
        raise OutOfTime()
    cmd = ["curl", "-sS", "-m", "20", "--compressed", "-A", UA, "-w", "\n%{http_code}", url]
    if cookie:
        cmd[1:1] = ["-b", cookie]
    out = subprocess.run(cmd, capture_output=True).stdout.decode("utf-8", "replace")
    body, _, code = out.rpartition("\n")
    time.sleep(pause)
    if code == "404" and empty_on_404:
        body, code = "", "200"
    if code != "200":
        log(f"  {code} {url}")
        if code in ("403", "429"):
            time.sleep(20)
        raise OutOfTime()
    open(path, "w", encoding="utf-8").write(body)
    return body


def parse_search_count(body):
    """從自由時報搜尋結果頁取出則數；看不出來就回傳 None"""
    m = re.search(r"約有\s*([\d,]+)\s*項結果", body)
    if m:
        return int(m[1].replace(",", ""))
    if body == "":  # 自由時報搜尋不到東西時回 404，fetch 把它存成空字串
        return 0
    return None


def news_count(place, word, start, end):
    q = urllib.parse.quote(f"{place} {word}")
    url = f"https://search.ltn.com.tw/list?keyword={q}&start_time={start:%Y%m%d}&end_time={end:%Y%m%d}&sort=date&type=all&page=1"
    n = parse_search_count(fetch(url, empty_on_404=True))
    if n is None:
        # 版面看不懂就不要當成 0，把快取刪掉、留到下次
        os.remove(cache_path(url))
        log(f"  看不出則數：{place} {word}")
        raise OutOfTime()
    return n


def parse_ptt_page(body, today, cutoff, state):
    """回傳 (這一頁窗內的文章 [(日期, 標題, 推文數)], 這一頁最新的日期, 上一頁網址)"""
    main = body.split('<div class="r-list-sep">')[0]  # 分隔線以下是置底文
    rows = re.findall(r'<div class="r-ent">(.*?)<div class="mark">', main, re.S)
    posts, days = [], []
    for row in reversed(rows):  # 由新到舊
        t = re.search(r'<a href="[^"]+">([^<]+)</a>', row)
        d = re.search(r'class="date">\s*(\d+)/(\d+)', row)
        if not t or not d:
            continue
        month, dayn = int(d[1]), int(d[2])
        if month > state["month"] + 6:  # 1 月再往前是去年 12 月
            state["year"] -= 1
        state["month"] = month
        try:
            day = dt.date(state["year"], month, dayn)
        except ValueError:
            continue
        days.append(day)
        if day < cutoff or day > today:
            continue
        rec = re.search(r'class="nrec">(?:<span[^>]*>([^<]*)</span>)?', row)
        raw = (rec[1] if rec and rec[1] else "0").strip()
        pushes = 100 if raw == "爆" else int(raw) if raw.isdigit() else 0
        posts.append((day, html.unescape(t[1]).strip(), pushes))
    prev = re.search(r'href="(/bbs/[^"]+/index\d+\.html)">&lsaquo; 上頁', body)
    return posts, (max(days) if days else None), ("https://www.ptt.cc" + prev[1] if prev else None)


def ptt_posts(board, today):
    cutoff = today - dt.timedelta(days=WINDOW_DAYS)
    out = []
    url = f"https://www.ptt.cc/bbs/{board}/index.html?d={today:%Y%m%d}"
    state = {"year": today.year, "month": today.month}
    for _ in range(PTT_MAX_PAGES):
        posts, newest, prev = parse_ptt_page(fetch(url, cookie="over18=1", pause=0.8), today, cutoff, state)
        out += posts
        if (newest and newest < cutoff) or not prev:
            break
        url = prev
    return out


def classify(title, keywords):
    """回傳 [(領域, [命中的關鍵字])]，最多 2 個領域"""
    hits = []
    for dom, words in keywords.items():
        found = [w for w in words if w in title]
        if found:
            hits.append((len(found), dom, found))
    hits.sort(key=lambda h: -h[0])
    return [(dom, found) for _, dom, found in hits[:2]]


def ptt_summary(posts, keywords, name_re):
    """把 PTT 文章歸到領域。回傳 (各領域統計, 概況)"""
    doms = {d: {"ptt": 0, "pushes": 0, "weight": 0.0, "terms": {}} for d in keywords}
    stat = {"posts": 0, "classified": 0}
    seen = set()
    for _, title, pushes in posts:
        tag = re.match(r"\s*(?:Re:\s*|Fw:\s*)*\[([^\]]+)\]", title)
        if tag and PTT_SKIP_TAG.search(tag[1]):
            continue
        base = re.sub(r"^\s*(?:Re:\s*|Fw:\s*)+", "", title)
        if ELECTION.search(base) or INCIDENT.search(base) or (name_re and name_re.search(base)):
            continue
        stat["posts"] += 1
        got = classify(base, keywords)
        if got:
            stat["classified"] += 1
        for dom, found in got:
            doms[dom]["ptt"] += 1
            doms[dom]["pushes"] += pushes
            doms[dom]["weight"] += 1 + min(pushes, 100) / 10
            if base not in seen:
                for w in found:
                    doms[dom]["terms"][w] = doms[dom]["terms"].get(w, 0) + 1
        seen.add(base)
    return doms, stat


def gather_county(cid, today, kw, name_re):
    """抓一個縣市的原始數字（還沒算占比）"""
    place, boards = SOURCES[cid]
    start = today - dt.timedelta(days=WINDOW_DAYS)
    news = {dom: {w: news_count(place, w, start, today) for w in words} for dom, words in kw["search"].items()}
    posts = []
    for board in boards:
        posts += ptt_posts(board, today)
    ptt, stat = ptt_summary(posts, kw["titles"], name_re)
    return {"place": place, "boards": boards, "news": news, "ptt": ptt, "pttStat": stat}


def finalize(raw, kw):
    """raw: {縣市: gather_county 的結果}。算占比、lift，整理成網站要讀的格式"""
    domains = list(kw["search"])
    news_total = {cid: sum(sum(v.values()) for v in r["news"].values()) for cid, r in raw.items()}
    shares = {
        cid: {d: (sum(r["news"][d].values()) / news_total[cid] if news_total[cid] else 0) for d in domains}
        for cid, r in raw.items()
    }
    usable = [cid for cid in raw if news_total[cid] >= MIN_NEWS]
    baseline = {d: (sum(shares[c][d] for c in usable) / len(usable) if usable else 0) for d in domains}

    out = {}
    for cid, r in raw.items():
        ptt_total = sum(v["weight"] for v in r["ptt"].values())
        use_ptt = r["pttStat"]["classified"] >= MIN_PTT and ptt_total > 0
        rows = []
        for d in domains:
            parts = [shares[cid][d]] + ([r["ptt"][d]["weight"] / ptt_total] if use_ptt else [])
            top_words = [w for w, c in sorted(r["news"][d].items(), key=lambda kv: -kv[1]) if c > 0][:2]
            ptt_words = [w for w, _ in sorted(r["ptt"][d]["terms"].items(), key=lambda kv: -kv[1])][:2] if use_ptt else []
            rows.append({
                "id": d,
                "index": round(sum(parts) / len(parts), 4),
                "lift": round(shares[cid][d] / baseline[d], 2) if baseline[d] else 0,
                "news": sum(r["news"][d].values()),
                "ptt": r["ptt"][d]["ptt"],
                "pttPushes": r["ptt"][d]["pushes"],
                "terms": list(dict.fromkeys(top_words + ptt_words))[:3],
            })
        rows.sort(key=lambda x: -x["index"])
        out[cid] = {
            "enough": news_total[cid] >= MIN_NEWS,
            "usesPtt": use_ptt,
            "newsTotal": news_total[cid],
            "ptt": {"boards": r["boards"], "posts": r["pttStat"]["posts"], "classified": r["pttStat"]["classified"]},
            "domains": rows,
        }
    return out


def main():
    global OFFLINE, DEADLINE
    args = sys.argv[1:]
    OFFLINE = "--offline" in args
    if "--max-seconds" in args:
        DEADLINE = time.time() + int(args[args.index("--max-seconds") + 1])
    only = args[args.index("--counties") + 1].split(",") if "--counties" in args else list(SOURCES)
    today = dt.date.fromisoformat(args[args.index("--date") + 1]) if "--date" in args else dt.date.today()

    kw = json.load(open(os.path.join(ROOT, "data", "heat-keywords.json"), encoding="utf-8"))
    cands = json.load(open(os.path.join(ROOT, "data", "candidates.json"), encoding="utf-8"))
    names = sorted({c["name"] for c in cands} | {c["name"].replace("啓", "啟") for c in cands})
    name_re = re.compile("|".join(map(re.escape, names)))

    os.makedirs(CACHE, exist_ok=True)
    raw_path = os.path.join(CACHE, f"raw-{today:%Y%m%d}.json")
    raw = json.load(open(raw_path, encoding="utf-8")) if os.path.exists(raw_path) else {}
    for cid in only:
        if cid in raw:
            continue
        try:
            raw[cid] = gather_county(cid, today, kw, name_re)
            r = raw[cid]
            log(f"{cid}: 新聞 {sum(sum(v.values()) for v in r['news'].values())} 則，PTT {r['pttStat']['classified']}/{r['pttStat']['posts']} 篇")
            json.dump(raw, open(raw_path, "w", encoding="utf-8"), ensure_ascii=False)
        except OutOfTime:
            log(f"{cid}: 時間到或被擋，下次接著抓")
            if time.time() > DEADLINE:
                break

    missing = [c for c in SOURCES if c not in raw]
    if missing:
        print("還沒抓完，先不寫 data/heat.json：" + ",".join(missing))
        return
    result = {
        "generatedAt": today.isoformat(),
        "windowDays": WINDOW_DAYS,
        "from": (today - dt.timedelta(days=WINDOW_DAYS)).isoformat(),
        "to": today.isoformat(),
        "sources": ["自由時報站內搜尋的新聞則數", "PTT 各縣市地方板的文章標題與推文數"],
        "counties": finalize(raw, kw),
    }
    with open(os.path.join(ROOT, "data", "heat.json"), "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=1)
        f.write("\n")
    ok = sum(1 for c in result["counties"].values() if c["enough"])
    print(f"已寫出 data/heat.json：{len(result['counties'])} 個縣市，其中 {ok} 個資料量足夠")


if __name__ == "__main__":
    main()
