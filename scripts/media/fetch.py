import json
import os
import runpy
import urllib.request

D = os.path.dirname(os.path.abspath(__file__)) + "/"
CAT = runpy.run_path(D + "catalog.py")["CATALOG"]
ex = {e.get("id_num"): e for e in json.load(open(D + "ex.json", encoding="utf-8"))}
base = "https://raw.githubusercontent.com/everkinetic/data/master/dist/"
os.makedirs(D + "png", exist_ok=True)
os.makedirs(D + "md", exist_ok=True)
miss = []
for slug, name, m, sec, eq, eid in CAT:
    if not eid:
        continue
    e = ex[eid]
    for k in ("relaxation", "tension"):
        out = D + f"png/{eid}-{k}.png"
        if not os.path.exists(out):
            try:
                urllib.request.urlretrieve(base + f"png/{eid}-{k}.png", out)
            except Exception as er:
                miss.append((eid, k, str(er)))
    out = D + f"md/{eid}.md"
    if not os.path.exists(out):
        try:
            urllib.request.urlretrieve(base + f"md/{e['name']}.md", out)
        except Exception as er:
            miss.append((eid, "md", e["name"], str(er)))
print(len(CAT), "ejercicios; faltan:", miss)
