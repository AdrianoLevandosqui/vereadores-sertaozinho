"""
Gera os arquivos JSON usados pelo site (../site/dados/) a partir de ../dados/.

Também CONFERE os totais: cada número que o site mostra com link para um relatório
oficial precisa ser igual ao número que está naquele relatório. Divergências são
listadas em ../dados/conferencia.txt e no final da execução.

Uso: python -I gerar_site.py
"""
import csv
import json
import os
import re
import shutil
import subprocess
import sys
import time
from collections import Counter, defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from classificar import GRUPOS, classificar  # noqa: E402
from coletar import BASE, PDFTOTEXT  # noqa: E402

AQUI = os.path.dirname(os.path.abspath(__file__))
DADOS = os.path.join(AQUI, "..", "dados")
SAIDA = os.path.join(AQUI, "..", "site", "dados")
ANOS = [2026, 2025]

# Notas escritas à mão, sempre com a fonte oficial (o texto descreve o que o documento diz).
NOTAS_VEREADOR = {
    "252": {
        "texto": "A ata da sessão de 09/06/2026 registra a ausência do vereador por causa de um ofício do "
                 "Tribunal Regional Eleitoral (TRE-SP) informando o reprocessamento do resultado das "
                 "eleições municipais de 2024, “com a alteração da relação dos eleitos”.",
        "fonte": "https://www.camarasertaozinho.sp.gov.br/atas/sessao_ordinaria/2026/2/0/1760",
    },
}

VOTO_COD = {"FAVORÁVEL": "F", "CONTRÁRIO": "C", "ABSTENÇÃO": "A", "NÃO REGISTRADO": "N",
            "PRESIDENTE": "P", "AUSENTE": "X"}
PRES_COD = {"PRESENTE": "P", "AUSENTE": "A", "JUSTIFICADA": "J"}


def ler(nome):
    with open(os.path.join(DADOS, nome), encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def ler_opcional(nome):
    return ler(nome) if os.path.exists(os.path.join(DADOS, nome)) else []


def sem_acento(s):
    import unicodedata
    return " ".join(unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower().split())


def acha_tse(perfil, tse):
    """Candidato do TSE correspondente ao vereador: pelo nome completo; se não achar, pelo nome de urna."""
    alvo = sem_acento(perfil["nome"])
    for c in tse:
        if sem_acento(c["nome"]) == alvo:
            return c
    for c in tse:
        if sem_acento(c["nome_urna"]) in (alvo, sem_acento(perfil["nome_politico"])):
            return c
    return None


def grava(nome, obj):
    caminho = os.path.join(SAIDA, nome)
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    return os.path.getsize(caminho)


def br(dh):  # "2026-08-04 18:00:00" -> "04/08/2026"
    return f"{dh[8:10]}/{dh[5:7]}/{dh[0:4]}"


def copia_foto(perfil):
    """Copia a foto oficial (baixada pelo coletor) para site/fotos/; o site não carrega imagens de fora."""
    arq = perfil.get("foto_arquivo")
    if not arq:
        return ""
    destino = os.path.join(SAIDA, "..", "fotos", arq)
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    shutil.copyfile(os.path.join(DADOS, "brutos", "fotos", arq), destino)
    return f"fotos/{arq}"


def paginas_votacao(dh):
    """Para o PDF de votação da sessão, devolve a página onde começa cada matéria (1, 2, ...)."""
    pdf = os.path.join(DADOS, "brutos", "votacao_sessao",
                       dh.replace(":", "").replace(" ", "_") + ".pdf")
    txt = subprocess.run([PDFTOTEXT, "-enc", "UTF-8", "-raw", pdf, "-"],
                         capture_output=True, check=True).stdout.decode("utf-8", "replace")
    pags = []
    for n, pagina in enumerate(txt.split("\f"), 1):
        pags += [n] * pagina.count("RELATÓRIO DE VOTAÇÕES")
    return pags


def main():
    perfis = ler("perfis.csv")
    sessoes = ler("sessoes.csv")
    presencas = ler("presencas.csv")
    votacoes = ler("votacoes.csv")
    votos = ler("votos.csv")
    props = ler("proposicoes.csv")
    oficiais = defaultdict(dict)  # (id, ano) -> {indicador: (valor, fonte)}
    for t in ler("totais_oficiais.csv"):
        oficiais[(t["id"], int(t["ano"]))][t["indicador"]] = (int(t["valor"]), t["fonte"])

    global ANOS
    ANOS = sorted({int(s["data_hora"][:4]) for s in sessoes}, reverse=True)
    nome_id = {p["nome"]: p["id"] for p in perfis}
    problemas = []
    mesa = {m["id"]: m for m in ler_opcional("mesa.csv")}
    salario = (ler_opcional("salario.csv") or [None])[0]
    tse = ler_opcional("tse_2024.csv")
    from lugares import extrair as extrair_lugares

    # ---------------- sessões
    idx_sessao = {s["data_hora"]: i for i, s in enumerate(sessoes)}
    # conferência com as atas (conferir_presenca.py): link da ata e divergências por vereador
    conf_ata, notas_presenca = {}, {}
    caminho_conf = os.path.join(DADOS, "conferencia_presenca.csv")
    if os.path.exists(caminho_conf):
        for c in ler("conferencia_presenca.csv"):
            conf_ata[c["data_hora"]] = c["ata_url"]
            if c["ata_confere"] == "não":
                faltas = set(filter(None, c["faltas_sistema"].split("; ")))
                ata_aus = set(filter(None, c["ata_cita"].split("; ")))
                for v in faltas - ata_aus:
                    notas_presenca[(c["data_hora"], v)] = (
                        "A ata desta sessão registra “presença unânime” dos vereadores."
                        if c["ata_quorum"] == "unanime" else
                        "A ata desta sessão não cita este vereador entre os ausentes.")
                for v in ata_aus - faltas:
                    notas_presenca[(c["data_hora"], v)] = "A ata desta sessão cita este vereador entre os ausentes."
    else:
        print("  ! conferencia_presenca.csv não existe: rode conferir_presenca.py antes")
    grava("sessoes.json", [{"d": s["data_hora"], "n": s["sessao"], "a": conf_ata.get(s["data_hora"], "")}
                           for s in sessoes])

    # ---------------- votações (matérias), por ano, com página do PDF
    print("Localizando páginas nos PDFs de votação...", flush=True)
    por_sessao = defaultdict(list)
    for v in votacoes:
        por_sessao[v["sessao_data_hora"]].append(v)
    idx_vot = {}
    materias_ano = defaultdict(list)
    for dh in sorted(por_sessao):
        pags = paginas_votacao(dh)
        for v in por_sessao[dh]:
            seq = int(v["id_votacao"].split("#")[1])
            ano = int(dh[:4])
            idx_vot[v["id_votacao"]] = (ano, len(materias_ano[ano]))
            materias_ano[ano].append({
                "s": idx_sessao[dh], "m": v["materia"], "e": v["ementa"], "a": v["autoria"],
                "r": v["resultado"], "q": v["quorum"],
                "p": pags[seq - 1] if seq - 1 < len(pags) else 1,
            })
    for ano, lista in materias_ano.items():
        kb = grava(f"votacoes_{ano}.json", lista) // 1024
        print(f"  votacoes_{ano}.json: {len(lista)} matérias, {kb} KB")

    # votos agrupados por vereador e matéria (1º e 2º turno juntos)
    votos_ver = defaultdict(lambda: defaultdict(dict))  # nome -> id_votacao -> turno -> voto
    for v in votos:
        votos_ver[v["vereador"]][v["id_votacao"]][v["turno"]] = v["voto"]

    # ---------------- proposições classificadas
    grupos_por_id = {}
    for p in props:
        grupos_por_id[p["id"]] = classificar(p["tipo"], p["titulo"], p["ementa"])

    # ---------------- arquivo de cada vereador
    lista_ver = []
    for perfil in perfis:
        vid, nome = perfil["id"], perfil["nome"]
        pres_ver = [p for p in presencas if p["vereador"] == nome]
        datas = sorted(p["data_hora"] for p in pres_ver)
        saida = {"id": vid, "nome": nome, "nome_politico": perfil["nome_politico"],
                 "partido": perfil["partido"], "foto": copia_foto(perfil), "perfil": perfil["url"],
                 "em_exercicio": perfil["em_exercicio"] == "sim",
                 "primeira_sessao": br(datas[0]), "ultima_sessao": br(datas[-1]),
                 "entrou_depois": datas[0] > min(s["data_hora"] for s in sessoes),
                 "nota": NOTAS_VEREADOR.get(vid), "anos": {}}
        # cargo na Mesa, contatos do perfil oficial (só de quem está no cargo) e eleição de 2024 (TSE)
        if vid in mesa:
            saida["mesa"] = {"cargo": mesa[vid]["cargo"], "fonte": mesa[vid]["fonte"]}
        if perfil["em_exercicio"] == "sim":
            saida["contato"] = {k: perfil.get(k, "") for k in ("email", "celular", "telefone")}
        c = acha_tse(perfil, tse)
        if c:
            saida["tse"] = {k: c[k] for k in ("nome_urna", "partido", "votos_nominais", "votos_validos",
                                              "situacao", "cassacao", "destinacao_votos", "gerado_em", "fonte")}
        else:
            print(f"  ! {nome}: não achei no arquivo do TSE")
        for ano in ANOS:
            of = oficiais[(vid, ano)]
            # presença
            pa = [p for p in pres_ver if p["data_hora"].startswith(str(ano))]
            cont = Counter(p["situacao"] for p in pa)
            calc = {"presente": cont["PRESENTE"], "ausente": cont["AUSENTE"],
                    "justificada": cont["JUSTIFICADA"], "total": len(pa)}
            for k, val in calc.items():
                o = of.get(f"presenca:{k}", (None, None))[0]
                if o != val:
                    problemas.append(f"{nome} {ano} presença/{k}: site={val} oficial={o}")
            presenca = {
                "totais": calc,
                "fonte": of.get("presenca:total", (0, ""))[1],
                "sessoes": [[idx_sessao[p["data_hora"]], PRES_COD.get(p["situacao"], "?"),
                             p["justificativa"], notas_presenca.get((p["data_hora"], nome), "")]
                            for p in sorted(pa, key=lambda x: x["data_hora"])],
            }
            # votos (uma linha por matéria; 2 turnos ficam juntos)
            lista_votos, cont_v = [], Counter()
            for idv, turnos in votos_ver[nome].items():
                if not idv.startswith(str(ano)):
                    continue
                a, i = idx_vot[idv]
                cods = [VOTO_COD.get(turnos[t], "?") for t in ("ÚNICA", "PRIMEIRA", "SEGUNDA")
                        if t in turnos]
                lista_votos.append([i] + cods)
                # Mesma regra do relatório oficial do vereador: cada voto registrado diferente
                # conta uma vez por matéria (dois turnos iguais = 1; diferentes = 1 de cada);
                # "não registrado" só conta se não houver nenhum voto registrado.
                registrados = set(cods) - {"N"}
                for cod in (registrados or {"N"}):
                    cont_v[cod] += 1
            lista_votos.sort()
            contagem = {c: cont_v[c] for c in "FCAPN"}
            for val, cod in VOTO_COD.items():
                if cod in "FCAP":
                    o = of.get(f"votos:{val}", (None, None))[0]
                    if o != contagem[cod]:
                        problemas.append(f"{nome} {ano} votos/{val}: site={contagem[cod]} oficial={o}")
            # propostas
            minhas = [p for p in props if int(p["ano"]) == ano and nome in p["autoria"].split("; ")]
            por_tipo = Counter(p["tipo"] for p in minhas)
            oficiais_tipo = {k.split(":", 1)[1]: v for k, v in of.items()
                             if k.startswith("proposicoes:")}
            for tipo in set(por_tipo) | set(oficiais_tipo):
                o = oficiais_tipo.get(tipo, (0, None))[0]
                if o != por_tipo[tipo]:
                    problemas.append(f"{nome} {ano} propostas/{tipo}: site={por_tipo[tipo]} oficial={o}")
            propostas = []
            for p in sorted(minhas, key=lambda x: x["data_apresentacao"][6:10] +
                            x["data_apresentacao"][3:5] + x["data_apresentacao"][0:2] +
                            x["data_apresentacao"][11:], reverse=True):
                g, motivo = grupos_por_id[p["id"]]
                coaut = len(p["autoria"].split("; ")) - 1
                propostas.append({"g": g, "mo": motivo, "t": p["titulo"], "tp": p["tipo"],
                                  "d": p["data_apresentacao"][:10], "e": p["ementa"],
                                  "s": p["situacao"], "c": coaut, "u": p["url"],
                                  "k": extrair_lugares(p["ementa"])[2]})
            saida["anos"][ano] = {
                "presenca": presenca,
                "votos": {"contagem": contagem, "fonte": of.get("votos:FAVORÁVEL", (0, ""))[1],
                          "lista": lista_votos},
                "propostas": propostas,
                "propostas_oficial": {t: {"n": v[0], "u": v[1]} for t, v in oficiais_tipo.items()},
            }
        kb = grava(f"vereadores/{vid}.json", saida) // 1024
        # resumo do mandato inteiro (todos os anos), usado para ordenar a lista de vereadores
        soma = Counter()
        for d in saida["anos"].values():
            for k, v in d["presenca"]["totais"].items():
                soma["pres_" + k] += v
            for k, v in d["votos"]["contagem"].items():
                soma["voto_" + k] += v
            for p in d["propostas"]:
                soma["g_" + p["g"]] += 1
        resumo = {k: soma[k] for k in ("pres_presente", "pres_ausente", "pres_justificada", "pres_total",
                                       "voto_F", "voto_C", "voto_A", "g_melhoria", "g_pergunta",
                                       "g_homenagem", "g_lei", "g_outros")}
        lista_ver.append({**{k: saida[k] for k in ("id", "nome", "nome_politico", "partido", "foto",
                                                     "em_exercicio", "primeira_sessao", "ultima_sessao")},
                          "mesa": saida.get("mesa", {}).get("cargo", ""), "contato": saida.get("contato"),
                          "tse": {"v": int(saida["tse"]["votos_nominais"]), "s": saida["tse"]["situacao"]}
                          if saida.get("tse") else None, "entrou_depois": saida["entrou_depois"],
                          "r": resumo})
        print(f"  {nome}: {kb} KB", flush=True)

    # a página "Como ler" mostra as mesmas listas de palavras usadas na classificação
    import classificar as cl
    import lugares as lg
    regra = {k: getattr(cl, k) for k in
             ("MELHORIA", "LUGAR", "PEDE_ESTUDO", "PERGUNTA", "HOMENAGEM", "PROCEDIMENTO")}
    regra["TIPOS_PEDIDO"] = lg.TIPOS_PEDIDO
    grava("regra.json", regra)
    tot_grupos = Counter(g for g, _ in grupos_por_id.values())
    print("Propostas por grupo (todas, 2025-2026):", dict(tot_grupos))

    gera_busca_lugares(props, grupos_por_id, nome_id)

    # votações em que todos os que votaram votaram igual (a favor, contra ou abstenção);
    # "não registrado" e "presidente" não entram; cada turno conta como uma votação
    por_votacao = defaultdict(set)
    for v in votos:
        cod = VOTO_COD.get(v["voto"])
        if cod in ("F", "C", "A"):
            por_votacao[(v["id_votacao"], v["turno"])].add(cod)
    unan = {"total": len(por_votacao), "iguais": sum(1 for s in por_votacao.values() if len(s) == 1),
            "todos_favor": sum(1 for s in por_votacao.values() if s == {"F"})}

    lista_ver.sort(key=lambda v: (v["nome_politico"] or v["nome"]).lower())
    ultima = max(s["data_hora"] for s in sessoes)
    grava("indice.json", {
        "vereadores": lista_ver, "grupos": GRUPOS, "anos": ANOS, "ultima_sessao": br(ultima),
        "fonte_base": BASE, "gerado_em": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "salario": salario, "posse": "2025-01-01", "cadeiras": 19, "unanimidade": unan,
        # só propostas assinadas por pelo menos um vereador (as do Executivo e da Mesa ficam de fora)
        "grupos_total": dict(Counter(grupos_por_id[p["id"]][0] for p in props
                                     if any(a in nome_id for a in p["autoria"].split("; ")))),
        "temas": {k: v[0] for k, v in __import__("lugares").TIPOS_PEDIDO.items()},
    })

    with open(os.path.join(DADOS, "conferencia.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(problemas) or "Todos os totais conferem com os relatórios oficiais.")
    print(f"\nConferência: {len(problemas)} divergência(s)")
    for p in problemas[:60]:
        print("  ", p)


def gera_busca_lugares(props, grupos_por_id, nome_id):
    """busca.json: todas as propostas assinadas por vereadores, com ruas/bairros/tipo de pedido
    encontrados no texto; repeticoes.json: mesmo tipo de pedido para a mesma rua 2 vezes ou mais."""
    from lugares import TIPOS_PEDIDO, extrair

    lugares, idx_lugar, grafias = [], {}, defaultdict(Counter)

    def id_lugar(chave, escrito, tipo):
        grafias[chave][escrito] += 1
        if chave not in idx_lugar:
            idx_lugar[chave] = len(lugares)
            lugares.append({"c": chave, "t": tipo})
        return idx_lugar[chave]

    itens = []
    for p in props:
        autores = [a for a in p["autoria"].split("; ") if a]
        ids = [nome_id[a] for a in autores if a in nome_id]
        if not ids:
            continue  # só propostas assinadas por pelo menos um vereador
        ruas, bairros, tipos = extrair(p["ementa"])
        # entram todas as propostas de vereadores (a visão da cidade usa todas); a busca por lugar
        # olha só os pedidos (requerimentos e indicações) e as propostas que citam rua ou bairro
        itens.append({
            "id": p["id"], "tp": p["tipo"], "d": p["data_apresentacao"][:10], "t": p["titulo"],
            "e": p["ementa"], "a": ids, "o": [a for a in autores if a not in nome_id],
            "s": p["situacao"], "u": p["url"], "g": grupos_por_id[p["id"]][0],
            "r": [id_lugar(k, v, "rua") for k, v in ruas],
            "b": [id_lugar(k, v, "bairro") for k, v in bairros],
            "k": tipos,
        })
    for lg in lugares:  # nome exibido = grafia mais comum; contagem de propostas
        lg["n"] = grafias[lg["c"]].most_common(1)[0][0]
    cont = Counter(i for it in itens for i in it["r"] + it["b"])
    for i, lg in enumerate(lugares):
        lg["q"] = cont[i]

    # repetições: só pedidos (requerimentos e indicações); mesma rua + mesmo tipo de pedido
    grupos = defaultdict(list)
    for n, it in enumerate(itens):
        if it["tp"] not in ("Requerimentos", "Indicacoes"):
            continue
        for r in it["r"]:
            for k in it["k"]:
                grupos[(r, k)].append(n)
    rep = []
    for (r, k), ns in grupos.items():
        if len(ns) >= 2:
            ns.sort(key=lambda n: itens[n]["d"][6:10] + itens[n]["d"][3:5] + itens[n]["d"][:2])
            rep.append({"r": r, "k": k, "i": ns})
    rep.sort(key=lambda x: (-len(x["i"]), lugares[x["r"]]["n"].lower()))

    kb1 = grava("busca.json", {"lugares": lugares, "itens": itens,
                               "tipos_pedido": {k: v[0] for k, v in TIPOS_PEDIDO.items()}}) // 1024
    kb2 = grava("repeticoes.json", rep) // 1024
    print(f"busca.json: {len(itens)} propostas, {len(lugares)} lugares ({kb1} KB) | "
          f"repeticoes.json: {len(rep)} casos ({kb2} KB)")
    print("  maiores repetições:", [(lugares[x['r']]['n'], x['k'], len(x['i'])) for x in rep[:8]])


if __name__ == "__main__":
    main()
