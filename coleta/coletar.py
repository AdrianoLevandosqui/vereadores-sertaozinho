"""
Coletor de dados oficiais da Câmara Municipal de Sertãozinho/SP.

Fonte: https://www.camarasertaozinho.sp.gov.br/ (plataforma SoftCam / Clan Tecnologia)

Gera, em ../dados/:
  vereadores.csv     vereadores em exercício (id, nome, partido)
  sessoes.csv        sessões encontradas (data_hora, nome da sessão)
  presencas.csv      presença por sessão e vereador (PRESENTE / AUSENTE / JUSTIFICADA + motivo)
  votacoes.csv       uma linha por matéria votada em cada sessão (ementa, autoria, quórum, resultado)
  votos.csv          voto nominal de cada vereador em cada matéria/turno
  proposicoes.csv    proposições apresentadas (tipo, número, ementa, autoria, situação, link)
  brutos/            PDFs e HTML originais baixados (prova da origem)

Uso:  python -I coletar.py [ano ...]      (padrão: 2025 2026)
Requer pdftotext (Poppler) no PATH, ou na variável de ambiente PDFTOTEXT.
"""
import csv
import html
import math
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = "https://www.camarasertaozinho.sp.gov.br"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/130.0 Safari/537.36")
PAUSA = 0.6  # segundos entre requisições

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dados"))
BRUTOS = os.path.join(RAIZ, "brutos")

# Tipos de proposição de iniciativa parlamentar (slugs usados nas URLs do site)
TIPOS_PROPOSICAO = [
    "Anteprojetos", "Emenda-Impositiva-", "Emendas", "Emendas-a-LOA", "Indicacoes",
    "Mocoes", "Projetos-de-Decreto-Legislativo", "Projetos-de-Lei",
    "Projetos-de-Lei-Complementar", "Projetos-de-Resolucao",
    "Propostas-de-Emenda-a-LOM", "Requerimentos", "Subemendas", "Substitutivos",
]

PDFTOTEXT = os.environ.get("PDFTOTEXT") or shutil.which("pdftotext")
FALHAS = []  # URLs que não puderam ser baixadas


# ----------------------------------------------------------------- HTTP / arquivos
def baixar(url, destino, binario=False):
    """Baixa url para destino (cache: não baixa de novo se já existe)."""
    if os.path.exists(destino) and os.path.getsize(destino) > 0:
        with open(destino, "rb") as f:
            dados = f.read()
        return dados if binario else dados.decode("utf-8", "replace")
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/pdf,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9",
    })
    for tentativa in range(4):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                dados = r.read()
            break
        except Exception as e:  # noqa: BLE001
            if isinstance(e, urllib.error.HTTPError) and e.code == 404:
                FALHAS.append(url)
                return None  # não existe: não adianta tentar de novo
            print(f"  ! erro ({e}) em {url}, tentativa {tentativa + 1}", flush=True)
            time.sleep(30 * (tentativa + 1))
    else:
        FALHAS.append(url)
        print(f"  !! desisti de {url}", flush=True)
        return None
    # só guarda se for mesmo o documento esperado (um bloqueio pode responder "200" com outra página)
    problema = documento_invalido(destino, dados)
    if problema:
        FALHAS.append(url)
        trecho = re.sub(r"\s+", " ", dados[:400].decode("utf-8", "replace"))
        print(f"  !! resposta inesperada ({problema}) em {url}: {trecho[:300]}", flush=True)
        time.sleep(PAUSA)
        return None
    with open(destino, "wb") as f:
        f.write(dados)
    time.sleep(PAUSA)
    return dados if binario else dados.decode("utf-8", "replace")


def documento_invalido(destino, dados):
    """Motivo pelo qual a resposta não é o documento esperado, ou '' se estiver certa."""
    ext = os.path.splitext(destino)[1].lower()
    if ext == ".pdf":
        return "" if dados[:5] == b"%PDF-" else "não é PDF"
    if ext == ".zip":
        return "" if dados[:2] == b"PK" else "não é ZIP"
    if ext in (".jpg", ".jpeg", ".png"):
        return "" if dados[:3] in (b"\xff\xd8\xff", b"\x89PN") else "não é imagem"
    if ext == ".html":
        texto = dados.decode("utf-8", "replace")
        return "" if "camarasertaozinho" in texto and "</html>" in texto.lower() else "não é página da Câmara"
    return ""


def pdf_texto(caminho):
    if not PDFTOTEXT:
        sys.exit("pdftotext não encontrado. Instale o Poppler ou defina PDFTOTEXT.")
    out = subprocess.run([PDFTOTEXT, "-enc", "UTF-8", "-raw", caminho, "-"],
                         capture_output=True, check=True)
    return out.stdout.decode("utf-8", "replace")


def limpa(s):
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def grava_csv(nome, linhas, campos):
    caminho = os.path.join(RAIZ, nome)
    with open(caminho, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=campos)
        w.writeheader()
        w.writerows(linhas)
    print(f"-> {caminho}: {len(linhas)} linhas", flush=True)


CABECALHO_PDF = re.compile(
    r"^(Câmara Municipal de Sertãozinho|Estado de São Paulo|Avenida Egisto Sicchieri.*|"
    r"WhatsApp da Ouvidoria.*|www\.camarasertaozinho\.sp\.gov\.br)$")


def linhas_pdf(texto):
    """Linhas do PDF sem os cabeçalhos/rodapés repetidos de cada página."""
    return [l.strip() for l in texto.splitlines()
            if l.strip() and not CABECALHO_PDF.match(l.strip()) and l.strip() != "\f"]


# Linha "NN. Nome Do Vereador VALOR EM MAIÚSCULAS"
LINHA_NOMINAL = re.compile(r"^(\d{2})\.\s+(.+?)(?:\s+([A-ZÀ-Ý][A-ZÀ-Ý ]+))?$")


def separa_nominal(linhas, i):
    """Lê uma linha nominal a partir de linhas[i]; o valor pode vir na linha seguinte.
    Retorna (nome, valor, proximo_indice) ou None."""
    m = LINHA_NOMINAL.match(linhas[i])
    if not m:
        return None
    nome, valor = m.group(2).strip(), (m.group(3) or "").strip()
    j = i + 1
    if not valor and j < len(linhas) and re.fullmatch(r"[A-ZÀ-Ý][A-ZÀ-Ý ]+", linhas[j]):
        valor, j = linhas[j], j + 1
    return nome, valor, j


# ----------------------------------------------------------------- vereadores
def coleta_vereadores():
    pag = baixar(f"{BASE}/camara/membros/exercicio/0",
                 os.path.join(BRUTOS, "html", "vereadores_exercicio.html"))
    regs = re.findall(
        r'membros/show/(\d+)" class="dados-vereador-legislatura">.*?nome-vereador">(.*?)</div>\s*'
        r'<div class="vereador-description">(.*?)</div>', pag, re.S)
    return [{"id": i, "nome": limpa(n), "partido": limpa(p),
             "url": f"{BASE}/camara/membros/show/{i}"} for i, n, p in regs]


# ----------------------------------------------------------------- sessões
def coleta_datas_sessoes(vereadores, anos):
    """Usa o relatório de presença de cada vereador/ano para descobrir as sessões."""
    sessoes = {}
    for ano in anos:
        for v in vereadores:
            dest = os.path.join(BRUTOS, "presenca_vereador", f"{v['id']}_{ano}.pdf")
            if baixar(f"{BASE}/softcam/pautas_presenca_print_pdf.php?vereador={v['id']}&ano={ano}",
                      dest, binario=True) is None:
                continue
            ls = linhas_pdf(pdf_texto(dest))
            for k, l in enumerate(ls):
                m = re.match(r"^Data e Hora: (\d{2})/(\d{2})/(\d{4}) (\d{2}:\d{2})$", l)
                if m and k + 1 < len(ls) and ls[k + 1].startswith("Sessão:"):
                    dh = f"{m.group(3)}-{m.group(2)}-{m.group(1)} {m.group(4)}:00"
                    nome = ls[k + 1][len("Sessão:"):].strip()
                    # nome da sessão pode quebrar em várias linhas (até a linha "01. Nome ...")
                    j = k + 2
                    while (j < len(ls) and not re.match(r"^\d{2}\.", ls[j])
                           and not ls[j].startswith(("Data e Hora:", "Presente Ausente"))):
                        nome += " " + ls[j]
                        j += 1
                    sessoes.setdefault(dh, nome)
        print(f"  {ano}: {sum(1 for d in sessoes if d.startswith(str(ano)))} sessões", flush=True)
    return dict(sorted(sessoes.items()))


def arquivo_sessao(pasta, dh):
    return os.path.join(BRUTOS, pasta, dh.replace(":", "").replace(" ", "_") + ".pdf")


def coleta_presencas(sessoes):
    regs = []
    for dh, nome_sessao in sessoes.items():
        q = urllib.parse.quote(dh)
        dest = arquivo_sessao("presenca_sessao", dh)
        if baixar(f"{BASE}/softcam/pautas_presenca_print_pdf.php?data={q}", dest,
                  binario=True) is None:
            continue
        ls = linhas_pdf(pdf_texto(dest))
        i = 0
        while i < len(ls):
            r = separa_nominal(ls, i)
            if not r:
                i += 1
                continue
            nome, situacao, i = r
            just = ""
            # motivo da justificativa: linhas seguintes até o próximo "NN." ou totais
            while i < len(ls) and not LINHA_NOMINAL.match(ls[i]) and \
                    not ls[i].startswith("Presente Ausente"):
                just = (just + " " + ls[i]).strip()
                i += 1
            regs.append({"data_hora": dh, "sessao": nome_sessao, "vereador": nome,
                         "situacao": situacao, "justificativa": just,
                         "fonte": f"{BASE}/softcam/pautas_presenca_print_pdf.php?data={q}"})
    return regs


CAMPOS_CAB = ("Autoria:", "Data e Hora da Sessão:", "Destino:", "Quórum:", "Resultado:")


def coleta_votacoes(sessoes):
    materias, votos = [], []
    for dh in sessoes:
        q = urllib.parse.quote(dh)
        fonte = f"{BASE}/softcam/votacao_print_pdf.php?data={q}"
        dest = arquivo_sessao("votacao_sessao", dh)
        if baixar(fonte, dest, binario=True) is None:
            continue
        texto = pdf_texto(dest)
        blocos = texto.split("RELATÓRIO DE VOTAÇÕES")[1:]
        for seq, bloco in enumerate(blocos, 1):
            ls = linhas_pdf(bloco)
            if not ls:
                continue
            # cabeçalho: título + ementa até "Autoria:"; depois campos até "Votação Nominal"
            k = 0
            titulo_ementa = []
            while k < len(ls) and not ls[k].startswith(CAMPOS_CAB) and \
                    not ls[k].startswith("Votação Nominal"):
                titulo_ementa.append(ls[k])
                k += 1
            cab = []
            while k < len(ls) and not ls[k].startswith("Votação Nominal"):
                cab.append(ls[k])
                k += 1
            cab_txt = " ".join(cab)

            def campo(rotulo, seguintes):
                m = re.search(re.escape(rotulo) + r"\s*(.*?)\s*(?=" +
                              "|".join(re.escape(s) for s in seguintes) + r"|$)", cab_txt)
                return m.group(1).strip() if m else ""

            todos = ["Autoria:", "Data e Hora da Sessão:", "Data e Hora da Votação:",
                     "Destino:", "Quórum:", "Resultado:"]
            materia = titulo_ementa[0] if titulo_ementa else ""
            # título pode quebrar em 2 linhas (ex.: "PROJETO DE LEI N.º 0004, DE 29 DE" / "JANEIRO DE 2026")
            resto = titulo_ementa[1:]
            # ...ou no meio de um parêntese: "... - Pedido de Vista (José André Roberto" / "Mazer)"
            while resto and (re.search(r"\bDE$", materia) or
                             materia.count("(") > materia.count(")")):
                materia += " " + resto.pop(0)
            ementa = " ".join(resto).strip()
            m_par = re.fullmatch(r"\((.*)\)\.?", ementa, re.S)
            if m_par:
                ementa = m_par.group(1).strip()
            mid = f"{dh}#{seq:03d}"
            materias.append({
                "id_votacao": mid, "sessao_data_hora": dh, "materia": materia, "ementa": ementa,
                "autoria": campo("Autoria:", todos),
                "data_hora_votacao": campo("Data e Hora da Votação:", todos),
                "destino": campo("Destino:", todos), "quorum": campo("Quórum:", todos),
                "resultado": campo("Resultado:", todos), "fonte": fonte,
            })
            turno = "ÚNICA"
            while k < len(ls):
                m = re.match(r"^Votação Nominal(?: - (\w+))? \((\d+)\)", ls[k])
                if m:
                    turno = m.group(1) or "ÚNICA"
                    k += 1
                    continue
                r = separa_nominal(ls, k)
                if r:
                    nome, voto, k = r
                    votos.append({"id_votacao": mid, "sessao_data_hora": dh, "materia": materia,
                                  "turno": turno, "vereador": nome, "voto": voto})
                else:
                    k += 1
        print(f"  {dh}: {len(blocos)} matérias", flush=True)
    return materias, votos


# ----------------------------------------------------------------- proposições
def coleta_proposicoes(anos):
    regs, vistos = [], set()

    def busca(padrao, texto):
        m = re.search(padrao, texto, re.S)
        return limpa(m.group(1)) if m else ""

    for ano in anos:
        for tipo in TIPOS_PROPOSICAO:
            pagina, total_pag, total = 1, 1, 0
            while pagina <= total_pag:
                url = f"{BASE}/proposicoes/{tipo}/{ano}/{pagina}/0"
                pag = baixar(url, os.path.join(BRUTOS, "html", "proposicoes",
                                               f"{tipo}_{ano}_{pagina:03d}.html"))
                if pag is None:
                    pagina += 1
                    continue
                # paginação: "0 - 25 de <strong>N</strong>", "25 - 50 de <strong>N</strong>"...
                m = re.search(r"\d+ - \d+ de <strong>(\d+)</strong>", pag)
                if m:
                    total = int(m.group(1))
                    total_pag = max(total_pag, math.ceil(total / 25))
                blocos = pag.split('<div class="pbw_linhatitulo-3">')[1:]
                for bloco in blocos:
                    # atributos podem conter ">" dentro de aspas (tooltip onmouseover)
                    ml = re.search(r'<div><a href="([^"]+)"(?:[^>"]|"[^"]*")*>(.*?)</a></div>',
                                   bloco, re.S)
                    if not ml:
                        continue
                    link = ml.group(1)
                    pid = link.rstrip("/").split("/")[-1]
                    if pid in vistos:
                        continue
                    vistos.add(pid)
                    regs.append({
                        "tipo": tipo, "ano": ano, "id": pid,
                        "data_apresentacao": busca(r"<div><span>(.*?)</span></div>", bloco),
                        "titulo": limpa(ml.group(2)),
                        "ementa": busca(r'class="pbw_materia_infos">\s*<em>(.*?)</em>', bloco),
                        "autoria": busca(r"<strong>Autoria: </strong>(.*?)</span>", bloco),
                        "situacao": busca(r"<strong>Situação: </strong>(.*?)</span>", bloco),
                        "url": link,
                        "pdf": f"{BASE}/softcam/proposicao_print_pdf.php?item={pid}&assinatura=0",
                    })
                if not m and len(blocos) >= 25:  # sem contador visível: tenta a próxima página
                    total_pag = pagina + 1
                pagina += 1
            n = sum(1 for r in regs if r["tipo"] == tipo and r["ano"] == ano)
            aviso = "" if n == total else "  <-- DIFERENTE"
            print(f"  {tipo} {ano}: {n} (site informa {total}){aviso}", flush=True)
    return regs


# ----------------------------------------------------------------- perfis e totais oficiais
VALORES_VOTO = ("FAVORÁVEL", "CONTRÁRIO", "ABSTENÇÃO", "NÃO REGISTRADO", "PRESIDENTE", "AUSENTE")


def ids_legislatura(ano_inicio=2025):
    """Mapa nome -> id de todos que aparecem na página da legislatura (inclui suplentes)."""
    pag = baixar(f"{BASE}/camara/membros/comissoes/0/{ano_inicio}",
                 os.path.join(BRUTOS, "html", f"legislatura_{ano_inicio}.html"))
    mapa = {}
    for i, bloco in re.findall(r'membros/show/(\d+)" class="dados-vereador-legislatura">(.*?)</a>',
                               pag or "", re.S):
        m = re.search(r'nome-vereador">(.*?)</div>', bloco, re.S)
        if m:
            mapa[limpa(m.group(1))] = i
    return mapa


def coleta_perfis(vereadores, presencas, anos):
    """Perfil (nome político, partido, foto) de cada vereador que aparece nas listas de presença,
    e os totais que a própria Câmara publica por vereador/ano (para conferência e links)."""
    em_exercicio = {v["nome"]: v["id"] for v in vereadores}
    nomes = sorted({p["vereador"] for p in presencas})
    leg = ids_legislatura()
    perfis, totais = [], []
    for nome in nomes:
        vid = em_exercicio.get(nome) or leg.get(nome)
        if not vid:
            print(f"  ! sem id para {nome}", flush=True)
            continue
        pag = baixar(f"{BASE}/camara/membros/show/{vid}",
                     os.path.join(BRUTOS, "html", "perfis", f"{vid}.html")) or ""
        foto = re.search(r'<img src="([^"]+)" alt="" />\s*</a>\s*<strong>Nome Completo', pag)
        foto_arquivo = ""
        if foto:
            # cópia local da foto oficial (miniatura "_thumb" quando existir), para o site
            # não depender de imagens de outro endereço
            url_foto = foto.group(1)
            base_foto, ext = os.path.splitext(url_foto)
            for u in (f"{base_foto}_thumb{ext}", url_foto):
                dest = os.path.join(BRUTOS, "fotos", f"{vid}{ext.lower()}")
                n_falhas = len(FALHAS)
                if baixar(u, dest, binario=True) is not None:
                    foto_arquivo = os.path.basename(dest)
                    break
                del FALHAS[n_falhas:]  # miniatura inexistente não é falha
        perfis.append({
            "id": vid, "nome": nome,
            "nome_politico": limpa(re.search(r"Nome Político: </strong>(.*?)<br", pag).group(1))
            if "Nome Político: </strong>" in pag else "",
            "partido": limpa(re.search(r'<div class="pbw_linhatitulo-1">\s*<div>(.*?)</div>',
                                       pag, re.S).group(1)) if "pbw_linhatitulo-1" in pag else "",
            "foto": foto.group(1) if foto else "",
            "foto_arquivo": foto_arquivo,
            # contatos publicados no perfil oficial
            "email": limpa((re.search(r"E-mail: </strong>(.*?)<br", pag) or [None, ""])[1]),
            "celular": limpa((re.search(r"Celular: </strong>(.*?)<br", pag) or [None, ""])[1]),
            "telefone": limpa((re.search(r"Telefone: </strong>(.*?)<br", pag) or [None, ""])[1]),
            "em_exercicio": "sim" if nome in em_exercicio else "não",
            "url": f"{BASE}/camara/membros/show/{vid}",
        })
        for ano in anos:
            # 1) propostas por tipo, como aparecem no perfil do ano
            url = f"{BASE}/camara/membros/show/{vid}/0/{ano}"
            pag = baixar(url, os.path.join(BRUTOS, "html", "perfis", f"{vid}_{ano}.html")) or ""
            for slug, n in re.findall(
                    rf'proposicoes/([^/"]+)/{ano}/1/{vid}" class="items-legislatura">\s*'
                    r'<strong>(\d+)</strong>', pag):
                totais.append({"id": vid, "ano": ano, "indicador": f"proposicoes:{slug}",
                               "valor": int(n),
                               "fonte": f"{BASE}/proposicoes/{slug}/{ano}/1/{vid}"})
            # 2) presença: totais do relatório oficial do vereador
            url = f"{BASE}/softcam/pautas_presenca_print_pdf.php?vereador={vid}&ano={ano}"
            dest = os.path.join(BRUTOS, "presenca_vereador", f"{vid}_{ano}.pdf")
            if baixar(url, dest, binario=True) is not None:
                # os totais podem cair na página seguinte: tira cabeçalhos/rodapés antes
                m = re.search(r"Presente Ausente Justificada Total\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)",
                              "\n".join(linhas_pdf(pdf_texto(dest))))
                if m:
                    for rot, val in zip(("presente", "ausente", "justificada", "total"), m.groups()):
                        totais.append({"id": vid, "ano": ano, "indicador": f"presenca:{rot}",
                                       "valor": int(val), "fonte": url})
            # 3) votos: contagem de cada tipo de voto no relatório oficial do vereador
            url = f"{BASE}/softcam/votacao_print_pdf.php?vereador={vid}&ano={ano}"
            dest = os.path.join(BRUTOS, "votacao_vereador", f"{vid}_{ano}.pdf")
            if baixar(url, dest, binario=True) is not None:
                txt = pdf_texto(dest)
                for val in VALORES_VOTO:
                    n = len(re.findall(rf"(?:^|\s){val}\s*$", txt, re.M))
                    totais.append({"id": vid, "ano": ano, "indicador": f"votos:{val}",
                                   "valor": n, "fonte": url})
        print(f"  {nome} ({vid})", flush=True)
    return perfis, totais


# ----------------------------------------------------------------- Mesa, salário, TSE
def coleta_mesa():
    """Cargos da Mesa Diretora atual (primeiro bloco da página /mesasdiretoras)."""
    url = f"{BASE}/mesasdiretoras"
    pag = baixar(url, os.path.join(BRUTOS, "html", "mesa.html")) or ""
    bloco = pag.split("Mesa Diretora:")[1] if "Mesa Diretora:" in pag else ""
    bloco = bloco.split("Mesa Diretora:")[0]
    titulo = limpa(bloco.split("</span>")[0]) if bloco else ""
    regs = []
    for vid, nome, cargo in re.findall(
            r'membros/show/(\d+)".*?nome-vereador">(.*?)</div>\s*<div class="vereador-description">(.*?)</div>',
            bloco, re.S):
        regs.append({"id": vid, "nome": limpa(nome), "cargo": limpa(cargo), "mesa": titulo, "fonte": url})
    return regs


def coleta_salario():
    """Valor do subsídio dos vereadores no 'Demonstrativo de cargos e salários' mais recente."""
    lista_url = f"{BASE}/imprensa/transparencia/Quadro-funcionarios---cargo-e-salario"
    pag = baixar(lista_url, os.path.join(BRUTOS, "html", "salario_lista.html")) or ""
    itens = re.findall(r'href="([^"]*Quadro-funcionarios---cargo-e-salario/1/\d+/(\d+))"[^>]*>(.*?)</a>', pag, re.S)
    demo = [(u, i, limpa(t)) for u, i, t in itens if "demonstrativo" in limpa(t).lower()]
    if not demo:
        print("  ! demonstrativo de salários não encontrado", flush=True)
        return []
    demo.sort(key=lambda x: (re.search(r"(20\d\d)\s", x[2] + " ") or [0, "0"])[1] + x[1], reverse=True)
    u, i, titulo = demo[0]
    pag = baixar(u, os.path.join(BRUTOS, "html", f"salario_{i}.html")) or ""
    m = re.search(r'href="([^"]+\.pdf[^"]*)"', pag)
    if not m:
        return []
    pdf = html.unescape(m.group(1))
    dest = os.path.join(BRUTOS, "salario", f"{i}.pdf")
    if baixar(pdf, dest, binario=True) is None:
        return []
    mv = re.search(r"Subs[ií]dio dos Vereadores[ .]*R\$\s*([\d.]+,\d\d)", pdf_texto(dest))
    if not mv:
        print("  ! valor do subsídio não encontrado no PDF", flush=True)
        return []
    return [{"valor": mv.group(1), "documento": titulo, "pagina": u, "pdf": pdf}]


TSE_ZIP = "https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2024.zip"
TSE_PAGINA = "https://dadosabertos.tse.jus.br/dataset/resultados-2024"
TSE_MUNICIPIO = "71358"  # código TSE de Sertãozinho-SP


def coleta_tse():
    """Votos de cada candidato a vereador de Sertãozinho em 2024 (dados abertos do TSE)."""
    import io
    import zipfile
    dest = os.path.join(BRUTOS, "tse", "votacao_candidato_munzona_2024.zip")
    # o arquivo é grande (~50 MB) e muda pouco: baixa de novo só depois de 7 dias
    if os.path.exists(dest) and time.time() - os.path.getmtime(dest) > 7 * 86400:
        os.remove(dest)
    if baixar(TSE_ZIP, dest, binario=True) is None:
        return []
    z = zipfile.ZipFile(dest)
    r = csv.DictReader(io.TextIOWrapper(z.open("votacao_candidato_munzona_2024_SP.csv"), encoding="latin-1"),
                       delimiter=";")
    cand = {}
    for x in r:
        if x["CD_MUNICIPIO"] != TSE_MUNICIPIO or x["DS_CARGO"].upper() != "VEREADOR":
            continue
        c = cand.setdefault(x["SQ_CANDIDATO"], {
            "sq": x["SQ_CANDIDATO"], "nome": x["NM_CANDIDATO"], "nome_urna": x["NM_URNA_CANDIDATO"],
            "partido": x["SG_PARTIDO"], "votos_nominais": 0, "votos_validos": 0,
            "situacao": x["DS_SIT_TOT_TURNO"], "cassacao": x["DS_SITUACAO_CASSACAO"],
            "destinacao_votos": x["NM_TIPO_DESTINACAO_VOTOS"], "gerado_em": x["DT_GERACAO"],
            "fonte": TSE_PAGINA})
        c["votos_nominais"] += int(x["QT_VOTOS_NOMINAIS"] or 0)
        c["votos_validos"] += int(x["QT_VOTOS_NOMINAIS_VALIDOS"] or 0)
    return sorted(cand.values(), key=lambda c: -c["votos_nominais"])


def limpa_cache_volatil(anos):
    """Modo --atualizar: apaga do cache só o que pode ter mudado desde a última coleta
    (listas, perfis e relatórios do ano corrente, sessões recentes). O resto é reaproveitado."""
    import glob
    ano = max(anos)
    padroes = [
        "html/vereadores_exercicio.html", "html/legislatura_*.html", "html/mesa.html", "html/salario_*.html",
        "html/perfis/*.html", f"html/proposicoes/*_{ano}_*.html", "html/atas/lista_*.html",
        f"presenca_vereador/*_{ano}.pdf", f"votacao_vereador/*_{ano}.pdf",
    ]
    if time.localtime().tm_mon == 1:  # em janeiro, o ano anterior ainda pode receber ajustes
        padroes += [f"html/proposicoes/*_{ano - 1}_*.html", f"presenca_vereador/*_{ano - 1}.pdf",
                    f"votacao_vereador/*_{ano - 1}.pdf"]
    # relatórios das sessões dos últimos 21 dias podem ser corrigidos depois da sessão
    limite = time.strftime("%Y-%m-%d", time.localtime(time.time() - 21 * 86400))
    n = 0
    for p in padroes:
        for f in glob.glob(os.path.join(BRUTOS, p)):
            os.remove(f)
            n += 1
    for pasta in ("presenca_sessao", "votacao_sessao"):
        for f in glob.glob(os.path.join(BRUTOS, pasta, "*.pdf")):
            if os.path.basename(f)[:10] >= limite:
                os.remove(f)
                n += 1
    print(f"Modo atualizar: {n} arquivo(s) do cache apagado(s) para baixar de novo.", flush=True)


# ----------------------------------------------------------------- main
def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    # padrão: do início da legislatura atual (2025) até o ano corrente
    anos = [int(a) for a in args] or list(range(2025, time.localtime().tm_year + 1))
    os.makedirs(BRUTOS, exist_ok=True)
    if "--atualizar" in sys.argv:
        limpa_cache_volatil(anos)

    print("Vereadores...", flush=True)
    vereadores = coleta_vereadores()
    if not vereadores:
        sys.exit("ERRO: nenhum vereador lido. O site da Câmara não respondeu como esperado (veja as mensagens acima).")
    grava_csv("vereadores.csv", vereadores, ["id", "nome", "partido", "url"])

    print("Sessões (via relatórios de presença por vereador)...", flush=True)
    sessoes = coleta_datas_sessoes(vereadores, anos)
    grava_csv("sessoes.csv", [{"data_hora": d, "sessao": n} for d, n in sessoes.items()],
              ["data_hora", "sessao"])

    print("Presenças por sessão...", flush=True)
    presencas = coleta_presencas(sessoes)
    grava_csv("presencas.csv", presencas,
              ["data_hora", "sessao", "vereador", "situacao", "justificativa", "fonte"])

    print("Perfis e totais oficiais por vereador...", flush=True)
    perfis, totais = coleta_perfis(vereadores, presencas, anos)
    grava_csv("perfis.csv", perfis,
              ["id", "nome", "nome_politico", "partido", "foto", "foto_arquivo", "email", "celular",
               "telefone", "em_exercicio", "url"])

    print("Mesa Diretora, salário e votos de 2024 (TSE)...", flush=True)
    grava_csv("mesa.csv", coleta_mesa(), ["id", "nome", "cargo", "mesa", "fonte"])
    grava_csv("salario.csv", coleta_salario(), ["valor", "documento", "pagina", "pdf"])
    grava_csv("tse_2024.csv", coleta_tse(),
              ["sq", "nome", "nome_urna", "partido", "votos_nominais", "votos_validos", "situacao",
               "cassacao", "destinacao_votos", "gerado_em", "fonte"])
    grava_csv("totais_oficiais.csv", totais, ["id", "ano", "indicador", "valor", "fonte"])

    print("Votações por sessão...", flush=True)
    materias, votos = coleta_votacoes(sessoes)
    grava_csv("votacoes.csv", materias,
              ["id_votacao", "sessao_data_hora", "materia", "ementa", "autoria",
               "data_hora_votacao", "destino", "quorum", "resultado", "fonte"])
    grava_csv("votos.csv", votos,
              ["id_votacao", "sessao_data_hora", "materia", "turno", "vereador", "voto"])

    print("Proposições...", flush=True)
    grava_csv("proposicoes.csv", coleta_proposicoes(anos),
              ["tipo", "ano", "id", "data_apresentacao", "titulo", "ementa", "autoria",
               "situacao", "url", "pdf"])
    grava_csv("falhas.csv", [{"url": u} for u in FALHAS], ["url"])
    print("Concluído." + (f" {len(FALHAS)} falha(s) - veja falhas.csv" if FALHAS else ""),
          flush=True)


if __name__ == "__main__":
    main()
