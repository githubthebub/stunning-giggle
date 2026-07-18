import json, sys, urllib.request, zipfile, pathlib

man = json.load(open(sys.argv[1]))
out = pathlib.Path("files"); out.mkdir(exist_ok=True)
for item in man["items"]:
    dest = out / item["name"]
    print("fetch", item["url"], "->", dest, flush=True)
    urllib.request.urlretrieve(item["url"], dest)
    print("  size:", dest.stat().st_size, flush=True)
with zipfile.ZipFile("assets.zip", "w", zipfile.ZIP_STORED) as z:
    for p in sorted(out.iterdir()):
        z.write(p, p.name)
print("zip size:", pathlib.Path("assets.zip").stat().st_size)
