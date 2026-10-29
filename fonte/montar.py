"""Monta os assets da apresentação a partir de ~/arcor-pdv (KVs oficiais e conceitos da rodada 2).

Rodar com um Python que tenha PIL:  <python> -I fonte/montar.py
Gera assets/kv/<marca>.webp (e -p), assets/pecas/<marca>/<nn-id>.webp (e -p) e assets/pecas.js.
"""
import json
import os
import pathlib
from PIL import Image

RAIZ = pathlib.Path(__file__).resolve().parent.parent
PDV = pathlib.Path.home() / 'arcor-pdv'
CAT = json.load(open(PDV / 'catalogo.json'))
ORDEM = ['rocklets', 'tortuguita', '7belo', 'butter-toffees']
MAT = {'pvc': 'PVC', 'pet': 'PET cristal', 'vinil': 'vinil', 'papelao_e': 'papelão microondulado', 'mdf': 'MDF',
       'metalon_lona': 'metalon e lona', 'acm_lona': 'ACM e lona'}
PESO = {'leve': 'leve', 'media': 'média', 'pesada': 'pesada'}


def webp(src, dst, larg, q=82):
    im = Image.open(src).convert('RGB')
    if im.width > larg:
        im = im.resize((larg, round(im.height * larg / im.width)), Image.LANCZOS)
    im.save(dst, 'WEBP', quality=q, method=6)
    return im.size


dados = []
for mid in ORDEM:
    m = CAT['marcas'][mid]
    webp(PDV / 'kv' / f'{mid}.jpg', RAIZ / 'assets' / 'kv' / f'{mid}.webp', 1920, 84)
    webp(PDV / 'kv' / f'{mid}.jpg', RAIZ / 'assets' / 'kv' / f'{mid}-p.webp', 800, 80)
    os.makedirs(RAIZ / 'assets' / 'pecas' / mid, exist_ok=True)
    pecas = []
    for i, p in enumerate(m['pecas'], 1):
        nome = f"{i:02d}-{p['id']}"
        src = PDV / 'conceitos' / mid / f'{nome}.png'
        if not src.exists():
            continue
        tam = webp(src, RAIZ / 'assets' / 'pecas' / mid / f'{nome}.webp', 1400)
        webp(src, RAIZ / 'assets' / 'pecas' / mid / f'{nome}-p.webp', 520, 78)
        pecas.append({'n': i, 'id': p['id'], 'arq': nome, 'nome': p['nome'].replace(' ' + m['nome'], ''),
                      'peso': PESO[p['categoria']], 'medida': f"{p['larguraCm']:g} × {p['alturaCm']:g} × {p['profundidadeCm']:g} cm",
                      'material': MAT.get(p['material'], p['material']), 'tiragem': p['quantidade'], 'funcao': p['funcao'],
                      'w': tam[0], 'h': tam[1]})
    dados.append({'id': mid, 'nome': m['nome'], 'produto': m['produto'], 'cores': m['cores'], 'pecas': pecas})
(RAIZ / 'assets' / 'pecas.js').write_text('window.MARCAS=' + json.dumps(dados, ensure_ascii=False, indent=1) + ';\n')
print({d['id']: len(d['pecas']) for d in dados})
