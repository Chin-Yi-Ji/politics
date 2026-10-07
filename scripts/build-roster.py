"""由媒體整理的登記名單產生 data/counties.json 與 data/candidates.json。

來源（2026-10-07 擷取）：
- 公視新聞網 https://news.pts.org.tw/article/801606 （2026-09-06 更新）
- TVBS 新聞網 https://news.tvbs.com.tw/politics/4017384 （2026-09-07 更新）

正式名單以中選會公告為準：直轄市長 11/12、縣市長 11/17。
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PTS = "https://news.pts.org.tw/article/801606"
TVBS = "https://news.tvbs.com.tw/politics/4017384"

# (id, 名稱, 類型, [(姓名, 政黨, 備註)])
ROSTER = [
    ("taipei", "臺北市", "直轄市", [
        ("蔣萬安", "中國國民黨", None), ("沈伯洋", "民主進步黨", None),
        ("郭璽", "台灣麻將最大黨", None), ("蕭文乾", "臺灣SoR無法黨", None),
        ("唐新民", "三勢團結促進聯盟", "公視名單有列、TVBS 名單未列，待中選會公告核對"),
        ("林志成", "無黨籍", None)]),
    ("new-taipei", "新北市", "直轄市", [
        ("李四川", "中國國民黨", None), ("蘇巧慧", "民主進步黨", None), ("蘇輝湟", "無黨籍", None)]),
    ("taoyuan", "桃園市", "直轄市", [
        ("張善政", "中國國民黨", None), ("黃世杰", "民主進步黨", None)]),
    ("taichung", "臺中市", "直轄市", [
        ("江啓臣", "中國國民黨", "TVBS 寫作「江啟臣」"), ("何欣純", "民主進步黨", None),
        ("洪麗華", "司法正義黨", None)]),
    ("tainan", "臺南市", "直轄市", [
        ("謝龍介", "中國國民黨", None), ("陳亭妃", "民主進步黨", None),
        ("葉人文", "無黨籍", None), ("蕭燐洪", "臺灣SoR無法黨", None)]),
    ("kaohsiung", "高雄市", "直轄市", [
        ("柯志恩", "中國國民黨", None), ("賴瑞隆", "民主進步黨", None), ("張靜", "司法改革黨", None),
        ("王肇民", "無黨籍", None), ("洪方隆", "無黨籍", None)]),
    ("keelung", "基隆市", "市", [
        ("謝國樑", "中國國民黨", None), ("童子瑋", "民主進步黨", None), ("魏造文", "無黨籍", None)]),
    ("hsinchu-city", "新竹市", "市", [
        ("高虹安", "無黨籍", None), ("莊競程", "民主進步黨", None), ("何志勇", "無黨籍", None)]),
    ("hsinchu-county", "新竹縣", "縣", [
        ("徐欣瑩", "中國國民黨", None), ("鄭朝方", "民主進步黨", None), ("朱定瑀", "無黨籍", None)]),
    ("miaoli", "苗栗縣", "縣", [
        ("鍾東錦", "中國國民黨", None), ("陳品安", "民主進步黨", None)]),
    ("changhua", "彰化縣", "縣", [
        ("魏平政", "中國國民黨", None), ("陳素月", "民主進步黨", None),
        ("邱建富", "無黨籍", None), ("陳重嘉", "無黨籍", None)]),
    ("nantou", "南投縣", "縣", [
        ("許淑華", "中國國民黨", None), ("溫世政", "民主進步黨", "TVBS 寫作「温世政」")]),
    ("yunlin", "雲林縣", "縣", [
        ("張嘉郡", "中國國民黨", None), ("劉建國", "民主進步黨", None),
        ("吳炳輝", "無黨籍", None), ("林佳瑜", "無黨籍", None)]),
    ("chiayi-county", "嘉義縣", "縣", [
        ("蔡易餘", "民主進步黨", None), ("吳品叡", "無黨籍", None)]),
    ("chiayi-city", "嘉義市", "市", [
        ("王美惠", "民主進步黨", None), ("張啓楷", "台灣民眾黨", None),
        ("黃宏成台灣阿成世界偉人財神總統", "無黨籍", "此為兩家媒體名單所載全名"),
        ("陳愷璜", "無黨籍", None), ("王義成", "無黨籍", None)]),
    ("pingtung", "屏東縣", "縣", [
        ("蘇清泉", "中國國民黨", None), ("周春米", "民主進步黨", None)]),
    ("yilan", "宜蘭縣", "縣", [
        ("吳宗憲", "中國國民黨", None), ("林國漳", "民主進步黨", None), ("陳宏毅", "無黨籍", None),
        ("劉燦輝", "無黨籍", None), ("楊鉯婷", "無黨籍", None)]),
    ("hualien", "花蓮縣", "縣", [
        ("游淑貞", "中國國民黨", None), ("張峻", "無黨籍", None),
        ("魏嘉賢", "無黨籍", None), ("羅佩秦", "台灣工黨", None)]),
    ("taitung", "臺東縣", "縣", [
        ("吳秀華", "中國國民黨", None), ("陳瑩", "民主進步黨", None),
        ("王志偉", "無黨籍", None), ("李吳穎智", "無黨籍", None)]),
    ("penghu", "澎湖縣", "縣", [
        ("陳振中", "中國國民黨", None), ("吳淑瑾", "民主進步黨", None), ("周倪安", "台灣團結聯盟", "媒體名單寫作「台聯黨」"),
        ("許智富", "無黨籍", None), ("陳盡川", "無黨籍", None), ("葉竹林", "無黨籍", None)]),
    ("kinmen", "金門縣", "縣", [
        ("陳玉珍", "中國國民黨", None), ("張火木", "無黨籍", None), ("李文良", "無黨籍", None),
        ("梁文韜", "無黨籍", None), ("洪和成", "無黨籍", None), ("黃世團", "無黨籍", None),
        ("張國威", "無黨籍", None)]),
    ("lienchiang", "連江縣", "縣", [
        ("王忠銘", "中國國民黨", None), ("曹爾元", "無黨籍", None)]),
]

counties, candidates = [], []
for cid, name, kind, people in ROSTER:
    counties.append({"id": cid, "name": name, "type": kind, "status": "collecting"})
    for i, (pname, party, note) in enumerate(people, start=1):
        row = {
            "id": f"{cid}-{i:02d}",
            "countyId": cid,
            "name": pname,
            "party": party,
            "ballotNumber": None,
            "rosterSources": [PTS, TVBS],
        }
        if note:
            row["note"] = note
        candidates.append(row)

# 示範用的虛構縣市，正式站不顯示
counties.append({"id": "demo", "name": "示範市", "type": "示範", "status": "ready", "demo": True})
for i, (pname, party) in enumerate([("候選人甲", "示範黨"), ("候選人乙", "範例黨"), ("候選人丙", "無黨籍")], start=1):
    candidates.append({"id": f"demo-{i:02d}", "countyId": "demo", "name": pname, "party": party,
                       "ballotNumber": i, "rosterSources": []})

(ROOT / "data" / "counties.json").write_text(json.dumps(counties, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(ROOT / "data" / "candidates.json").write_text(json.dumps(candidates, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
real = [c for c in candidates if c["countyId"] != "demo"]
print(f"{len(counties) - 1} 縣市、{len(real)} 位候選人")
