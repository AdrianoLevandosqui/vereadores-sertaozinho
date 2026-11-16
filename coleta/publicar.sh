#!/usr/bin/env bash
# Atualiza os dados e publica o site no GitHub Pages (branch gh-pages).
# Roda NESTE computador: o site da Câmara mostra "Bot Verification" para servidores de datacenter
# (como os do GitHub Actions), então a coleta precisa sair de uma conexão comum.
#
# Uso (Git Bash):   bash coleta/publicar.sh            -> coleta só o que mudou, confere e publica
#                   bash coleta/publicar.sh --sem-coleta -> só gera e publica o que já está baixado
#
# Segurança: se a conferência com os relatórios oficiais tiver QUALQUER divergência, nada é publicado.
set -euo pipefail
cd "$(dirname "$0")"
RAIZ="$(cd .. && pwd)"
LOG="$RAIZ/coleta/publicar.log"
exec > >(tee -a "$LOG") 2>&1
echo "==== $(date '+%d/%m/%Y %H:%M') ===="

PY="python -I -X utf8"
if [ "${1:-}" != "--sem-coleta" ]; then
  $PY coletar.py --atualizar
  $PY conferir_presenca.py
fi
$PY gerar_site.py
if ! grep -q "Todos os totais conferem" "$RAIZ/dados/conferencia.txt"; then
  echo "NÃO PUBLICADO: a conferência encontrou divergências (veja dados/conferencia.txt)."
  exit 1
fi

# publica o conteúdo de site/ na branch gh-pages (sem histórico: cada publicação substitui a anterior)
REMOTO="$(git -C "$RAIZ" remote get-url origin)"
TMP="$(mktemp -d)"
cp -r "$RAIZ/site/." "$TMP/"
rm -f "$TMP/_celular.html"
touch "$TMP/.nojekyll"
cd "$TMP"
git init -q -b gh-pages
git config user.name "$(git -C "$RAIZ" config user.name)"
git config user.email "$(git -C "$RAIZ" config user.email)"
git add -A
git commit -q -m "Dados atualizados em $(date '+%d/%m/%Y %H:%M')"
git push -q --force "$REMOTO" gh-pages
cd "$RAIZ"
rm -rf "$TMP"
echo "Publicado: $(date '+%d/%m/%Y %H:%M')"
