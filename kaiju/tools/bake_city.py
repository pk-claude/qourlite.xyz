"""Bake Overture Maps buildings for one city into kaiju/data/<id>.json.

Usage: python bake_city.py <id> "<Display Name>" <lat> <lon> <half_size_m>
Needs: pyarrow, shapely. Reads the public Overture S3 bucket anonymously.

Output tiles: {p: flat [x,z,...] outer ring (metres, x east, z south),
o: hole rings, y0: bottom, h: top, g: group (same physical building), n: name}.
Buildings with building_part data (setback towers) are emitted as their parts.
Large footprints are split into TILE-sized pieces so damage stays local.
"""
import sys, json, math, hashlib
import pyarrow.dataset as ds, pyarrow.compute as pc, pyarrow.fs as pfs
import shapely
from shapely.geometry import Polygon, box

RELEASE = "2026-09-23.1"
TILE = 30.0
FLOOR = 3.5

cid, cname, lat, lon, half = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
mlat = 111320.0
mlon = 111320.0 * math.cos(math.radians(lat))
dlat, dlon = half / mlat * 1.05, half / mlon * 1.05

fs = pfs.S3FileSystem(anonymous=True, region="us-west-2")


def fetch(kind, cols):
    d = ds.dataset(f"overturemaps-us-west-2/release/{RELEASE}/theme=buildings/type={kind}/", filesystem=fs, format="parquet")
    f = ((pc.field("bbox", "xmin") < lon + dlon) & (pc.field("bbox", "xmax") > lon - dlon) &
         (pc.field("bbox", "ymin") < lat + dlat) & (pc.field("bbox", "ymax") > lat - dlat))
    return d.to_table(filter=f, columns=cols).to_pylist()


def local(wkb):
    g = shapely.transform(shapely.from_wkb(wkb), lambda a: (a - [lon, lat]) * [mlon, -mlat])
    return [p for p in (g.geoms if hasattr(g, "geoms") else [g]) if p.geom_type == "Polygon"]


def fallback_height(p, nf):
    if nf:
        return nf * FLOOR
    return 10 + int(hashlib.md5(p.wkb).hexdigest()[:6], 16) % 18


def ring(r):
    return [round(v, 1) for xy in list(r.coords)[:-1] for v in xy]


def tiles(p):
    x0, z0, x1, z1 = p.bounds
    if max(x1 - x0, z1 - z0) <= 45:
        return [p]
    nx, nz = math.ceil((x1 - x0) / TILE), math.ceil((z1 - z0) / TILE)
    sx, sz = (x1 - x0) / nx, (z1 - z0) / nz
    out = []
    for i in range(nx):
        for j in range(nz):
            q = p.intersection(box(x0 + i * sx, z0 + j * sz, x0 + (i + 1) * sx, z0 + (j + 1) * sz))
            out += [g for g in (q.geoms if hasattr(q, "geoms") else [q]) if g.geom_type == "Polygon" and g.area > 8]
    return out


buildings = fetch("building", ["id", "geometry", "height", "num_floors", "names"])
parts = {}
for pt in fetch("building_part", ["building_id", "geometry", "height", "min_height", "min_floor", "num_floors"]):
    parts.setdefault(pt["building_id"], []).append(pt)

out, group = [], 0
for b in buildings:
    polys = local(b["geometry"])
    if not polys:
        continue
    c = polys[0].centroid
    if abs(c.x) > half or abs(c.y) > half or sum(p.area for p in polys) < 25:
        continue
    h = b["height"] or fallback_height(polys[0], b["num_floors"])
    name = (b["names"] or {}).get("primary") if b["names"] else None
    # (polygon, bottom, top) solids for this building
    solids = []
    for pt in parts.get(b["id"], []):
        top = pt["height"] or (pt["num_floors"] * FLOOR if pt["num_floors"] else h)
        bot = pt["min_height"] or (pt["min_floor"] * FLOOR if pt["min_floor"] else 0)
        if top > bot + 1:
            solids += [(p, bot, top) for p in local(pt["geometry"])]
    if not solids:
        solids = [(p, 0, h) for p in polys]
    pieces = [(q, bot, top) for p, bot, top in solids for q in tiles(p.simplify(0.6, preserve_topology=True))]
    group += 1
    for q, bot, top in pieces:
        q = shapely.geometry.polygon.orient(q.simplify(0.3, preserve_topology=True), 1.0)
        if q.is_empty or q.geom_type != "Polygon" or q.area < 8:
            continue
        t = {"p": ring(q.exterior), "h": round(float(top), 1)}
        if bot > 0:
            t["y0"] = round(float(bot), 1)
        holes = [ring(i) for i in q.interiors if Polygon(i).area > 20]
        if holes:
            t["o"] = holes
        if len(pieces) > 1:
            t["g"] = group
        if name and h > 120:
            t["n"] = name
        out.append(t)

# streets: centre lines of drivable/pedestrian roads, clipped to the square
ROAD = ["motorway", "trunk", "primary", "secondary", "tertiary", "residential", "unclassified",
        "living_street", "service", "pedestrian", "unknown"]
d = ds.dataset(f"overturemaps-us-west-2/release/{RELEASE}/theme=transportation/type=segment/", filesystem=fs, format="parquet")
f = ((pc.field("bbox", "xmin") < lon + dlon) & (pc.field("bbox", "xmax") > lon - dlon) &
     (pc.field("bbox", "ymin") < lat + dlat) & (pc.field("bbox", "ymax") > lat - dlat))
square = box(-half, -half, half, half)
roads = []
for r in d.to_table(filter=f, columns=["subtype", "class", "geometry", "level_rules"]).to_pylist():
    if r["subtype"] != "road" or r["class"] not in ROAD:
        continue
    if any((lv.get("value") or 0) < 0 and not lv.get("between") for lv in (r["level_rules"] or [])):
        continue  # tunnels
    g = shapely.transform(shapely.from_wkb(r["geometry"]), lambda a: (a - [lon, lat]) * [mlon, -mlat]).intersection(square)
    for line in (g.geoms if hasattr(g, "geoms") else [g]):
        if line.geom_type == "LineString" and line.length > 2:
            roads.append([ROAD.index(r["class"])] + [round(v, 1) for xy in line.simplify(0.5).coords for v in xy])

out.sort(key=lambda t: -t["h"])
json.dump({"id": cid, "name": cname, "lat": lat, "lon": lon, "half": half,
           "source": f"Overture Maps Foundation {RELEASE} (ODbL; includes OpenStreetMap contributors)",
           "tiles": out, "roadClasses": ROAD, "roads": roads}, open(f"{sys.argv[0].rsplit('/', 2)[0]}/data/{cid}.json", "w"), separators=(",", ":"))
names = []
for t in out:
    if t.get("n") and t["n"] not in names:
        names.append(t["n"])
print(cid, len(roads), "roads,", len(out), "tiles,", group, "buildings; tallest:", names[:5])
