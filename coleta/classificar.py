"""
Regra única para separar as propostas em grupos que qualquer pessoa entenda.

A regra olha só para duas coisas do registro oficial: o TIPO do documento
(requerimento, moção, projeto de lei...) e PALAVRAS do texto oficial (ementa).
As regras são testadas na ordem abaixo; vale a primeira que se encaixar.
A mesma regra é aplicada a todos os vereadores.
"""
import re
import unicodedata

GRUPOS = {
    "melhoria": "Pedidos de melhoria nos bairros",
    "pergunta": "Perguntas e cobranças à Prefeitura",
    "homenagem": "Homenagens",
    "lei": "Propostas de lei",
    "outros": "Outros",
}


def _norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"\s+", " ", s)


def _tem(texto, palavras):
    return any(re.search(r"\b" + p, texto) for p in palavras)


# Palavras que indicam obra, conserto ou serviço em um lugar da cidade
MELHORIA = [
    "redutor", "lombada", "sinaliza", "faixa de pedestre", "faixa elevada", "semaforo",
    "pintura de solo", "iluminac", "ilumina", "lampada", "poste", "poda", "arvore",
    "recape", "asfalt", "pavimenta", "tapa-buraco", "tapa buraco", "buraco", "operacao tapa",
    "limpeza", "capina", "rocada", "rocag", "rocar", "entulho", "terreno baldio", "bueiro", "boca de lobo",
    "galeria", "drenagem", "enchente", "alagamento", "esgoto", "calcada", "guia rebaixada",
    "sarjeta", "ponto de onibus", "abrigo de onibus", "academia ao ar livre",
    "playground", "parquinho", "quadra", "campo de futebol", "vestiario", "praca",
    "reforma", "construc", "ampliac", "manutenc", "instalac",
    "lixeira", "camera", "videomonitoramento", "estacionamento", "rotatoria", "cruzamento",
    "ciclovia", "ciclofaixa", "rede de agua", "vazamento", "pista de caminhada",
    "interligac", "nivelamento", "alargamento", "duplicac", "bebedouro", "banheiro",
    "revitaliza", "moderniza", "conserto", "reparo", "troca de", "substituic",
]
# Lugares da cidade: junto com "possibilidade/estudos", indicam pedido de melhoria num local
LUGAR = [
    "rua ", "avenida", "av[.] ", "bairro", "jardim ", "vila ", "parque", "praca",
    "distrito", "cruz das posses", "loteamento", "conjunto habitacional", "residencial",
    "estrada", "rodovia", "escola", "creche", "emei", "emef", "ubs", "posto de saude",
    "unidade de saude", "cemiterio", "centro esportivo", "ginasio", "terminal", "rodoviaria",
]
PEDE_ESTUDO = ["possibilidade", "viabilidade", "estudo", "estude"]
PERGUNTA = ["informac", "esclarec", "solicita (copia|relacao)", "cobra", "fiscaliza"]
HOMENAGEM = [
    "aplauso", "congratula", "parabeniz", "homenage", "reconhecimento", "louvor",
    "condolenc", "pesar", "falecimento", "titulo de cidada", "cidadao sertanezino",
    "cidada sertanezina", "cidadao benemerito", "medalha", "condecorac", "diploma",
    "denomina", "da nome", "institui o dia", "institui a semana", "institui o mes",
    "calendario oficial", "data comemorativa",
]
PROCEDIMENTO = [  # pedidos sobre o andamento dos trabalhos da própria Câmara
    "urgencia", "retirada", "pedido de vista", "adiamento", "licenca", "sessao solene",
    "uso da tribuna", "tribuna livre", "convoca", "arquivamento", "prorroga",
]
TIPOS_LEI = {"Projetos-de-Lei", "Projetos-de-Lei-Complementar", "Propostas-de-Emenda-a-LOM",
             "Emendas", "Subemendas", "Substitutivos", "Anteprojetos"}
TIPOS_ORCAMENTO = {"Emendas-a-LOA", "Emenda-Impositiva-"}


def classificar(tipo, titulo, ementa):
    """Retorna (grupo, motivo). O motivo é mostrado no site ao lado de cada proposta."""
    t = _norm(f"{titulo} {ementa}")
    e = _norm(ementa)

    if tipo in TIPOS_ORCAMENTO:
        return "outros", "É uma emenda ao orçamento: indica dinheiro da cidade para uma entidade ou área."
    if tipo == "Mocoes":
        if _tem(e, HOMENAGEM):
            return "homenagem", "É uma moção de aplauso, parabéns, homenagem ou pesar."
        return "outros", "É uma moção (manifestação oficial da Câmara) que não é de homenagem ou pesar, como apoio ou protesto."
    if tipo == "Projetos-de-Decreto-Legislativo":
        if _tem(e, HOMENAGEM):
            return "homenagem", "Dá título de cidadão, medalha ou outra honraria."
        return "outros", "É um decreto legislativo (decisão da própria Câmara) que não é homenagem."
    if tipo in TIPOS_LEI:
        if _tem(e, ["denomina", "da nome"]):
            return "homenagem", "É um projeto de lei que dá nome a uma rua, praça ou prédio público."
        if _tem(e, ["institui o dia", "institui a semana", "institui o mes", "calendario oficial",
                    "data comemorativa"]):
            return "homenagem", "É um projeto de lei que cria uma data comemorativa."
        if tipo in {"Emendas", "Subemendas", "Substitutivos"}:
            return "lei", "Pede mudança no texto de um projeto que está sendo analisado pela Câmara."
        return "lei", "É uma proposta de lei (ou de mudança na Lei Orgânica, a lei principal da cidade)."
    if tipo == "Projetos-de-Resolucao":
        return "outros", "É uma resolução: trata do funcionamento da própria Câmara (por exemplo, criar uma comissão)."
    if tipo in {"Requerimentos", "Indicacoes"}:
        nome = "um requerimento" if tipo == "Requerimentos" else "uma indicação"
        if tipo == "Requerimentos" and _tem(e, PROCEDIMENTO) and not _tem(e, MELHORIA):
            return "outros", "É um pedido sobre o andamento dos trabalhos da Câmara (urgência, retirada, vista, licença etc.)."
        if _tem(e, MELHORIA):
            return "melhoria", f"É {nome} que fala de obra, conserto ou serviço público."
        if _tem(e, PEDE_ESTUDO) and _tem(e, LUGAR):
            return "melhoria", f"É {nome} que pede à Prefeitura para estudar uma mudança em um lugar da cidade."
        if _tem(e, PEDE_ESTUDO) or tipo == "Indicacoes":
            return "outros", "Sugere à Prefeitura criar ou estudar um programa ou ação, sem citar obra ou lugar específico."
        if _tem(e, PERGUNTA):
            return "pergunta", "É um requerimento que pede informações ou explicações à Prefeitura."
        return "outros", "É um requerimento que não se encaixou nas outras regras."
    return "outros", "Tipo de documento que não se encaixou nas outras regras."
