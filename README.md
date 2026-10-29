# Arcor × 75 LAB · Do KV ao PDV

Demonstração da 75 LAB para a Arcor, linkada pela proposta técnica do RFQ de Criação e Ajuste de Artes: a estratégia de criação que leva o key visual oficial de Rocklets, Tortuguita, 7Belo e Butter Toffees às 55 peças de ponto de venda da rodada 2. Palco 1600×900, 15 telas.

- `fonte/montar.py` · gera KVs, peças e `assets/pecas.js` a partir de `~/arcor-pdv` (KVs oficiais e conceitos da rodada 2).
- `python3 -I fonte/build.py` · monta `index.html` e `assets/deck.css|js`.
- `node fonte/gerar-pdf.mjs http://localhost:4732/` · gera `arcor-kv-pdv-75lab.pdf`.
