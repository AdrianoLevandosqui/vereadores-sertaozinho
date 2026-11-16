"""
Confere a presença (relatório do sistema de presença da Câmara, usado no site) com
duas outras publicações oficiais da Câmara, sessão por sessão:

  1. a LISTA DE PRESENÇA ASSINADA digitalmente (link "Presenças" na página da ata);
  2. o TEXTO DA ATA da sessão (escrito pela secretaria e assinado), que registra o quórum.

E confere o número de sessões com o Relatório de Atividades 2025 (Transparência).

Saída: ../dados/conferencia_presenca.csv (sessão a sessão) e um resumo no terminal.
Uso: python -I conferir_presenca.py
"""
import csv
import html
import os
import re
import sys
import unicodedata
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from coletar import BASE, BRUTOS, baixar, linhas_pdf, pdf_texto, separa_nominal  # noqa: E402

DADOS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "dados")
TIPOS_ATA = ["sessao_ordinaria", "sessao_extraordinaria"]


def sem_acento(s):
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()


def texto_html(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def lista_atas(anos):
    """Mapa 'AAAA-MM-DD HH:MM:00' -> URL da página da ata."""
    atas = {}
    for ano in anos:
        for tipo in TIPOS_ATA:
            pagina, total_pag = 1, 1
            while pagina <= total_pag:
                pag = baixar(f"{BASE}/atas/{tipo}/{ano}/{pagina}/0",
                             os.path.join(BRUTOS, "html", "atas", f"lista_{tipo}_{ano}_{pagina:02d}.html")) or ""
                m = re.search(r"\d+ - \d+ de <strong>(\d+)</strong>", pag)
                if m:
                    total_pag = max(total_pag, -(-int(m.group(1)) // 25))
                for url, d, mth, a, hm in re.findall(
                        rf'href="({re.escape(BASE)}/atas/{tipo}/{ano}/\d+/0/\d+)".*?'
                        r"Data e Hora: </strong>(\d\d)/(\d\d)/(\d{4}) (\d\d:\d\d)", pag, re.S):
                    atas.setdefault(f"{a}-{mth}-{d} {hm}:00", url)
                pagina += 1
    return atas





COMUNS = {"silva", "santos", "souza"}       # contam meio ponto (ajudam a desempatar)
IGNORAR = {"dos", "das", "de", "da", "do", "e"}
TOKENS = {}  # nome oficial -> palavras que identificam o vereador (inclui o nome político)


def casa_nome(trecho_nome, candidatos):
    """Vereador (entre os candidatos) com mais palavras em comum com o trecho; tolera erros de
    digitação da ata ("Meia" por "Meira"). Devolve None se não houver um vencedor claro."""
    pal = set(re.findall(r"[a-z]+", sem_acento(trecho_nome)))
    pont = sorted(((sum(0.5 if w in COMUNS else 1 for w in TOKENS[c] & pal), c) for c in candidatos),
                  reverse=True)
    if not pont or pont[0][0] < 1.5 or (len(pont) > 1 and pont[0][0] == pont[1][0]):
        return None
    return pont[0][1]


def separa_nomes(parte):
    """Divide a frase em pedaços; os que não contêm nome de vereador são descartados depois."""
    return [x for x in re.split(r"[,;:]\s*|\s+e\s+|\s+do vereador\s+|\s+da vereadora\s+|\s+dos vereadores\s+", parte)
            if len(x.strip()) > 3]


def ausentes_na_ata(txt, candidatos):
    """Lê a frase de quórum da ata. Devolve (tipo, trecho, ausentes segundo a ata)."""
    t = sem_acento(txt)
    m = re.search(r"verificado o quorum.{0,900}?(?=o senhor presidente|declara aberta|$)", t)
    trecho = m.group(0) if m else ""
    if not trecho:
        return "nao_encontrada", "", set()
    if "presenca unanime" in trecho:
        return "unanime", trecho, set()
    ma = re.search(r"ausencias? d[oa]s? vereador(?:es|a|as)?:?\s+(.*?)(?:\s+e a presenca|\.|$)", trecho)
    if ma:
        return "lista_ausentes", trecho, {c for c in (casa_nome(x, candidatos) for x in separa_nomes(ma.group(1))) if c}
    mp = re.search(r"presenca dos vereadores[^:]*:\s*(.*?)(?:\.|$)", trecho)
    if mp:
        presentes = {c for c in (casa_nome(x, candidatos) for x in separa_nomes(mp.group(1))) if c}
        return "lista_presentes", trecho, set(candidatos) - presentes
    return "nao_entendida", trecho, set()


def main():
    anos = [2025, 2026]
    sessoes = list(csv.DictReader(open(os.path.join(DADOS, "sessoes.csv"), encoding="utf-8-sig")))
    pres = defaultdict(dict)  # data_hora -> vereador -> situação (sistema, como no site)
    for p in csv.DictReader(open(os.path.join(DADOS, "presencas.csv"), encoding="utf-8-sig")):
        pres[p["data_hora"]][p["vereador"]] = p["situacao"]
    politico = {p["nome"]: p["nome_politico"] for p in
                csv.DictReader(open(os.path.join(DADOS, "perfis.csv"), encoding="utf-8-sig"))}
    for nome in {n for d in pres.values() for n in d}:
        pal = set(re.findall(r"[a-z]+", sem_acento(nome + " " + politico.get(nome, ""))))
        TOKENS[nome] = {w for w in pal if w not in IGNORAR and len(w) >= 3}

    print("Listando atas...", flush=True)
    atas = lista_atas(anos)
    linhas, resumo = [], Counter()
    for s in sessoes:
        dh = s["data_hora"]
        sistema = pres[dh]
        faltas_sist = {n for n, sit in sistema.items() if sit != "PRESENTE"}
        reg = {"data_hora": dh, "sessao": s["sessao"], "faltas_sistema": "; ".join(sorted(faltas_sist)),
               "ata_url": atas.get(dh, ""), "assinada": "", "assinada_difere": "", "ata_quorum": "",
               "ata_cita": "", "ata_confere": "", "trecho_ata": ""}
        if dh not in atas:
            resumo["sem ata publicada"] += 1
            reg["ata_confere"] = "sem ata"
            linhas.append(reg)
            continue
        idd = atas[dh].rstrip("/").split("/")[-1]
        pag = baixar(atas[dh], os.path.join(BRUTOS, "html", "atas", f"ata_{idd}.html")) or ""
        # 1) lista de presença assinada
        m = re.search(r'href="([^"]+/assinatura/assinado/[^"]+\.pdf[^"]*)"[^>]*>\s*<i[^>]*></i>\s*<span>Presen', pag)
        if m:
            dest = os.path.join(BRUTOS, "presenca_assinada", f"{idd}.pdf")
            if baixar(html.unescape(m.group(1)), dest, binario=True) is not None:
                ls = linhas_pdf(pdf_texto(dest))
                assinada, i = {}, 0
                while i < len(ls):
                    r = separa_nominal(ls, i)
                    if r:
                        assinada[r[0]] = r[1]
                        i = r[2]
                    else:
                        i += 1
                # a lista assinada às vezes grafa o nome de outro jeito ("Antônio", nome político)
                assinada_casada = {}
                for nome_ass, sit in assinada.items():
                    alvo = nome_ass if nome_ass in sistema else casa_nome(nome_ass, list(sistema))
                    assinada_casada[alvo or f"? {nome_ass}"] = sit
                difs = [f"{n}: assinada={assinada_casada.get(n)} sistema={sistema.get(n)}"
                        for n in sorted(set(assinada_casada) | set(sistema))
                        if assinada_casada.get(n) != sistema.get(n)]
                reg["assinada"] = "sim"
                reg["assinada_difere"] = " | ".join(difs)
                resumo["assinada: igual" if not difs else "assinada: diferente"] += 1
        else:
            reg["assinada"] = "não"
            resumo["assinada: não publicada"] += 1
        # 2) texto da ata
        corpo = texto_html(pag)
        tipo, trecho, ausentes_ata = ausentes_na_ata(corpo, list(sistema))
        reg["ata_quorum"], reg["trecho_ata"] = tipo, trecho[:600]
        reg["ata_cita"] = "; ".join(sorted(ausentes_ata))
        ok = (ausentes_ata == faltas_sist) if tipo in ("unanime", "lista_ausentes", "lista_presentes") else None
        reg["ata_confere"] = {True: "sim", False: "não", None: "frase não entendida"}[ok]
        resumo[f"ata: {reg['ata_confere']}"] += 1
        linhas.append(reg)

    with open(os.path.join(DADOS, "conferencia_presenca.csv"), "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(linhas[0].keys()))
        w.writeheader()
        w.writerows(linhas)
    print("\nRESUMO", dict(resumo))
    for r in linhas:
        if r["ata_confere"] == "não" or r["assinada_difere"]:
            print(f"\n{r['data_hora']} | sistema faltas: {r['faltas_sistema'] or '-'}")
            if r["assinada_difere"]:
                print("   assinada difere:", r["assinada_difere"])
            if r["ata_confere"] == "não":
                print(f"   ata ({r['ata_quorum']}) cita: {r['ata_cita'] or '-'}")
                print("   trecho:", r["trecho_ata"][:300])


if __name__ == "__main__":
    main()
