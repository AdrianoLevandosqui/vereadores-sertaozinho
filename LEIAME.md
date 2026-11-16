# Vereadores de Sertãozinho — dados oficiais

Site estático em `site/`, que mostra presença, propostas e votos de cada vereador. Os dados vêm só dos documentos públicos da Câmara Municipal de Sertãozinho.

## Site no ar

https://adrianolevandosqui.github.io/vereadores-sertaozinho/ (GitHub Pages, branch `gh-pages`).

Para coletar, conferir e publicar de uma vez (Git Bash, na pasta do projeto):

```
bash coleta/publicar.sh               # coleta só o que mudou, confere e publica
bash coleta/publicar.sh --sem-coleta  # só gera e publica o que já foi baixado
```

O script **não publica** se a conferência com os relatórios oficiais tiver qualquer divergência.
A coleta precisa rodar deste computador (ou de outra conexão comum): o site da Câmara mostra uma página
"Bot Verification" para servidores de datacenter, como os do GitHub Actions. Não rode durante sessões
(segundas e terças à noite, e eventuais sessões extraordinárias).

## Atualizar os dados (passo a passo)

Requer Python 3 e `pdftotext` (vem com o Git para Windows ou com o Poppler).

```
cd coleta
python -I coletar.py 2025 2026     # baixa só o que ainda não está em dados/brutos/
python -I conferir_presenca.py     # compara a presença com as atas e as listas assinadas
python -I gerar_site.py            # gera site/dados/*.json e confere os totais
```

`conferir_presenca.py` grava `dados/conferencia_presenca.csv`, com o resultado sessão por sessão. As divergências com a ata aparecem como aviso na própria falta, no site.

O `gerar_site.py` compara cada total exibido com o relatório oficial para onde o link aponta. O resultado fica em `dados/conferencia.txt` e precisa dizer "Todos os totais conferem".

Para pegar sessões e propostas novas, apague antes os arquivos do ano corrente em cache: `dados/brutos/presenca_vereador/*_2026.pdf`, `dados/brutos/votacao_vereador/*_2026.pdf`, `dados/brutos/html/proposicoes/*_2026_*.html` e `dados/brutos/html/perfis/*_2026.html`. Faça isso **fora do horário de sessão**, para não pegar uma sessão pela metade.

## Ver o site no computador

```
cd site
python -m http.server 8765
```

Depois abra http://127.0.0.1:8765. O site precisa de um servidor, porque abrir o arquivo direto não carrega os dados.

## Arquivos

- `coleta/coletar.py`: baixa os documentos da Câmara e gera os CSVs em `dados/`.
- `coleta/classificar.py`: regra que separa as propostas em grupos (explicada no próprio site, em `#regra`).
- `coleta/lugares.py`: lê ruas, bairros e o tipo de pedido no texto oficial (busca e pedidos repetidos).
- `coleta/conferir_presenca.py`: conferência da presença com as atas e as listas assinadas.
- `coleta/gerar_site.py`: gera os JSON do site, copia as fotos e confere os totais.
- `site/`: o site, uma página só (`index.html` + `app.js`), em HTML, CSS e JS puros, sem dependências. A navegação usa `#`: `#v286` (vereador), `#v286-2025` (outro ano), `#como-ler`, `#regra`.

## Página privada publicada

https://claude.ai/artifact/7Z7MZ8a7hncZkPDmcGumD1. Para atualizar, publique de novo os arquivos de `site/` no mesmo artifact.
