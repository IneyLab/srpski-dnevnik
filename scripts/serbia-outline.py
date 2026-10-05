# Генерирует src/lib/serbia-outline.ts (контур Сербии и реки для /map) из данных Natural Earth.
# Natural Earth — общественное достояние: https://www.naturalearthdata.com/about/terms-of-use/
# Запуск: pip install shapely
#   скачать в папку SRC (по умолчанию ./ne):
#   https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson
#   https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_lake_centerlines.geojson
#   python scripts/serbia-outline.py [SRC]
import os, sys
SRC = sys.argv[1] if len(sys.argv) > 1 else 'ne'
import json, math
from shapely.geometry import shape
from shapely.ops import unary_union
d=json.load(open(os.path.join(SRC, 'ne_10m_admin_0_countries.geojson')))
g={}
for ft in d['features']:
    a=ft['properties']['ADM0_A3']
    if a in ('SRB','KOS'): g[a]=shape(ft['geometry'])
srb,kos=g['SRB'],g['KOS']
tol=0.012
union=unary_union([srb,kos]).buffer(0).simplify(tol, preserve_topology=True)
kos_s=kos.simplify(tol, preserve_topology=True)
# граница Сербия—Косово: общая часть контуров
border=srb.boundary.intersection(kos.boundary.buffer(1e-6)).simplify(tol)
minx,miny,maxx,maxy=union.bounds
LAT0=44.0; C=math.cos(math.radians(LAT0)); K=200; PAD=16
def P(lon,lat): return (round((lon-minx)*C*K+PAD,1), round((maxy-lat)*K+PAD,1))
def ring(coords): 
    pts=[P(x,y) for x,y in coords]
    return 'M'+' L'.join(f'{x} {y}' for x,y in pts)+'Z'
def poly(p): return ' '.join(ring(r.coords) for r in [p.exterior]+list(p.interiors))
def path(geom):
    if geom.geom_type=='Polygon': return poly(geom)
    return ' '.join(poly(p) for p in geom.geoms)
def lines(geom):
    parts=[geom] if geom.geom_type=='LineString' else list(geom.geoms)
    out=[]
    for l in parts:
        if l.geom_type!='LineString' or len(l.coords)<2: continue
        pts=[P(x,y) for x,y in l.coords]
        out.append('M'+' L'.join(f'{x} {y}' for x,y in pts))
    return ' '.join(out)
from shapely.ops import linemerge
try: border=linemerge(border)
except Exception: pass
rd=json.load(open(os.path.join(SRC, 'ne_10m_rivers_lake_centerlines.geojson')))
area=unary_union([srb,kos]).buffer(0.04)
RU={'Danube':'Дунав','Sava':'Сава','Tisa':'Тиса','Morava':'Велика Морава','Drina':'Дрина'}
rivers=[]
for ft in rd['features']:
    n=ft['properties'].get('name')
    if n in RU:
        gg=shape(ft['geometry']).intersection(area)
        if gg.is_empty: continue
        gg=linemerge(gg) if gg.geom_type=='MultiLineString' else gg
        gg=gg.simplify(tol)
        rivers.append((RU[n],lines(gg)))
W=round((maxx-minx)*C*K+2*PAD); H=round((maxy-miny)*K+2*PAD)
npts=lambda s: s.count('L')+s.count('M')
o=path(union); k=path(kos_s); b=lines(border)
rv='\n'.join(f"  {{ name: '{n}', d: '{d}' }}," for n,d in rivers)
print(W, H, npts(o), npts(k), npts(b), file=sys.stderr)
ts=f"""// Контур Сербии для карты (/map). Сгенерировано из Natural Earth 1:10m Cultural Vectors,
// Admin 0 – Countries (ne_10m_admin_0_countries) скриптом scripts/serbia-outline.py, упрощено (Douglas–Peucker, допуск {tol}°).
// Natural Earth — общественное достояние (public domain): https://www.naturalearthdata.com/about/terms-of-use/
// Проекция: равнопромежуточная, долгота × cos({LAT0}°). Координаты мест переводит project().
// Косово показано светлее и отделено штриховой линией, без подписи (нейтральный вариант, как в атласах).

export const MAP_W = {W}
export const MAP_H = {H}

const MIN_LON = {minx:.5f}
const MAX_LAT = {maxy:.5f}
const COS = Math.cos(({LAT0} * Math.PI) / 180)
const K = {K}
const PAD = {PAD}

/** Долгота и широта → точка на SVG-карте. */
export function project(lon: number, lat: number): {{ x: number; y: number }} {{
  return {{ x: (lon - MIN_LON) * COS * K + PAD, y: (MAX_LAT - lat) * K + PAD }}
}}

/** Внешний контур (Сербия вместе с Косово). */
export const OUTLINE =
  '{o}'

/** Косово (заливка светлее). */
export const KOSOVO =
  '{k}'

/** Крупные реки (Natural Earth, Rivers + lake centerlines 1:10m), обрезаны по контуру. */
export const RIVERS: {{ name: string; d: string }}[] = [
{rv}
]

/** Линия Сербия — Косово (штриховая). */
export const KOSOVO_LINE =
  '{b}'
"""
open(os.path.join(os.path.dirname(__file__), '..', 'src', 'lib', 'serbia-outline.ts'), 'w').write(ts)
