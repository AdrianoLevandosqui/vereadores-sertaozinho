"""
Encontra RUAS, BAIRROS e o TIPO DE PEDIDO no texto oficial (ementa) de cada proposta.

É uma leitura automática por padrões de texto, a mesma para todas as propostas:
- rua: "Rua/Avenida/Av./Praça/Alameda/Travessa/Estrada/Rodovia/Marginal" + nome, até
  um marcador como vírgula, "nº", "próximo", "entre", "no bairro"...
- bairro: "Jardim/Jd./Bairro/Vila/Conjunto Habitacional/Residencial/Loteamento/Distrito" + nome.
- tipo de pedido: palavras do texto (lista TIPOS_PEDIDO).
"""
import re
import unicodedata


def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    s = re.sub(r"[\"“”'`´º°ª]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


PREFIXO_RUA = r"(?:ruas?|avenidas?|av\.?|alameda|travessa|estrada|rodovia|pra[cç]as?|marginal)"
PREFIXO_BAIRRO = r"(?:jardim|jd\.?|bairro|vila|conjunto habitacional|residencial|loteamento|distrito(?: de)?|n[uú]cleo habitacional)"

# onde o nome do lugar termina
PARA = (r"(?=\s*(?:[,;:()\[\]]|\.\s|\.$|$|\s[-–]\s|\s+n[º°o]\.?\s*\d|\s+n\.?\s*\d|\s+numero|\s+número|\s+pr[oó]xim|"
        r"\s+entre\b|\s+esquina|\s+defronte|\s+em frente|\s+na altura|\s+altura|\s+localizad|"
        r"\s+no\b|\s+na\b|\s+nos\b|\s+nas\b|\s+em\b|\s+para\b|\s+que\b|\s+visando|\s+objetivando|"
        r"\s+onde|\s+pois|\s+devido|\s+bem como|\s+at[eé]\b|\s+com\b|\s+confl|\s+cruzamento|"
        r"\s+a partir|\s+e\s|\s+de frente|\s+sentido|\s+trecho|\s+junto|\s+sendo|\s+seguindo|\s+a qual|\s+o qual|\s+frente|\s+fazendo|\s+ligando|"
        r"\s+ao\b|\s+aos\b|\s+à\b|\s+às\b|\s+bairro|\s+jardim|"
        r"\s+d[aeo]s?\s+(?:bairro|jardim|conjunto|vila|distrito|residencial|loteamento|parque|n[uú]cleo)\b|"
        r"\s+e\s+(?:a|o|as|os|na|no|da|do|em|tamb|d[aá]|rua|ruas|avenida|av|estrada|rodovia|pra[cç]a|"
        r"jardim|vila|bairro|conjunto|cruz|distrito)\b|"
        r"\s+de nossa|\s+desta|\s+deste|\s+neste|\s+nesta|\s+sertaozinho|\s+sertãozinho))")

NOME = r"([A-ZÀ-Ýa-zà-ý0-9][A-ZÀ-Ýa-zà-ý0-9\.\"“”'ºª\- ]{1,70}?)"

RE_RUA = re.compile(r"\b(" + PREFIXO_RUA + r")\s+(?:d[aeo]s?\s+)?" + NOME + PARA, re.I)
RE_BAIRRO = re.compile(r"\b(" + PREFIXO_BAIRRO + r")\s+" + NOME + PARA, re.I)
RE_CRUZ = re.compile(r"\bcruz das posses\b", re.I)

# palavras que não são nome de rua/bairro (aparecem logo depois do prefixo em frases genéricas)
GENERICO = {"municipal", "municipais", "publica", "publicas", "publico", "publicos", "principal",
            "principais", "toda", "todas", "todo", "todos", "mesma", "mesmo", "citada", "citado",
            "referida", "referido", "acima", "local", "central", "centro", "da cidade", "de acesso",
            "que", "onde", "esta", "este", "essa", "esse", "nova", "novo", "seguintes", "seguinte",
            "do municipio", "de lazer", "e", "a", "o", "residencial", "comercial", "industrial",
            "residencial e comercial", "habitacional"}
# o nome não pode começar com estas palavras ("Praça na Rua X" não é uma praça chamada "na Rua X")
INICIO_INVALIDO = {"na", "no", "nas", "nos", "em", "de", "que", "para", "ao", "a", "o", "e", "com", "bem",
                   "sobre", "onde", "seguintes", "seguinte", "proxima", "proximo", "localizada", "localizado",
                   "sem"}

# abreviações com ponto ("Dr. José") não podem encerrar o nome: o ponto é tirado antes da leitura
RE_ABREV_PONTO = re.compile(r"\b(Dr|Dra|Prof|Profa|Cel|Sto|Sta|Pe|Eng|Des|Pres|Gov|Ver|Cap|Ten|Sgt|Maj|Gen|"
                            r"Mons|Me|Sr|Sra|Jr|Dom|Pça|Pca)\.\s*", re.I)
RE_CONJ_HAB = re.compile(r"\bConj\.?\s*Hab\.?\s*", re.I)
RE_PREFIXO_DOBRADO = re.compile(r"\b(rua|avenida)\s+(rua|avenida)\b", re.I)
PREFIXOS_BAIRRO_NOME = ("jardim ", "vila ", "conjunto habitacional ", "residencial ", "loteamento ",
                        "parque ", "nucleo habitacional ", "recreio ")

ABREV = [(r"^av\.?\s", "avenida "), (r"^jd\.?\s", "jardim "), (r"^r\.\s", "rua "), (r"^pca\s", "praca "),
         (r"\bdr\.?\s", "doutor "), (r"\bprof\.?\s", "professor "), (r"\bprofa\.?\s", "professora "),
         (r"\bcel\.?\s", "coronel "), (r"\bsto\.?\s", "santo "), (r"\bsta\.?\s", "santa "),
         (r"\bpe\.?\s", "padre "), (r"\beng\.?\s", "engenheiro ")]

TIPOS_PEDIDO = {
    "lombada": ("Lombada ou redutor de velocidade", ["redutor", "lombada", "lombofaixa", "faixa elevada"]),
    "sinalizacao": ("Sinalização, faixas e placas", ["sinaliza", "pintura de solo", "faixa de pedestre", "faixas de pedestre", "placa"]),
    "semaforo": ("Semáforo", ["semaforo", "semaforico"]),
    "iluminacao": ("Iluminação", ["ilumina", "lampada", "poste", "luminaria"]),
    "poda": ("Poda ou retirada de árvore", ["poda", "arvore", "galho"]),
    "asfalto": ("Asfalto, buracos e pavimentação", ["recape", "asfalt", "pavimenta", "tapa buraco", "tapa-buraco", "buraco", "nivelamento"]),
    "limpeza": ("Limpeza, mato e entulho", ["limpeza", "capina", "rocad", "rocag", "entulho", "terreno baldio", "mato alto", "lixo"]),
    "drenagem": ("Bueiros, galerias e enchentes", ["bueiro", "boca de lobo", "bocas de lobo", "galeria", "drenagem", "enchente", "alagamento", "aguas pluviais"]),
    "calcada": ("Calçadas e guias", ["calcada", "guia rebaixada", "rebaixamento de guia", "sarjeta"]),
    "onibus": ("Ônibus e pontos de ônibus", ["ponto de onibus", "pontos de onibus", "abrigo", "linha de onibus", "transporte coletivo", "leva e traz"]),
    "lazer": ("Praças, parquinhos e áreas de lazer", ["playground", "parquinho", "academia ao ar livre", "brinquedo", "quadra", "bancos", "bebedouro"]),
    "seguranca": ("Segurança, rondas e câmeras", ["camera", "videomonitoramento", "ronda", "patrulhamento", "policiamento", "guarda civil"]),
    "agua": ("Água e esgoto", ["esgoto", "rede de agua", "vazamento", "falta de agua"]),
    "saude": ("Saúde", ["ubs", "unidade basica de saude", "posto de saude", "hospital", "upa", "santa casa",
                        "medico", "medica", "consulta", "exame", "vacina", "dengue", "saude"]),
    "escola": ("Escolas e creches", ["escola", "emei", "emef", "emeif", "creche", "aluno", "educacao"]),
    "transito": ("Trânsito e estacionamento", ["rotatoria", "mao unica", "sentido unico", "estacionamento", "vaga", "proibido estacionar", "mao dupla"]),
}


def chave_lugar(prefixo, nome):
    """Forma normalizada para juntar grafias diferentes do mesmo lugar."""
    p = norm(prefixo).rstrip(".")
    p = {"av": "avenida", "avenidas": "avenida", "ruas": "rua", "praca": "praca", "pracas": "praca",
         "jd": "jardim", "distrito de": "distrito"}.get(p, p)
    n = norm(nome).rstrip(".- ")
    for a, b in ABREV:
        n = re.sub(a, b, n)
    n = re.sub(r"[.\-]", " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    n = re.sub(r"^(d[aeo]s?)\s+", "", n)
    if len(n.split()) > 1 and not re.search(r"\b(de|do|da)\s+\d+$", n):
        n = re.sub(r"\s+\d+$", "", n)  # "gastao vidigal 833": é o número da casa, não parte do nome
    if p == "bairro":  # "Bairro Vila Garcia" e "Vila Garcia" são o mesmo lugar
        return (n if n.startswith(PREFIXOS_BAIRRO_NOME) else f"bairro {n}"), n
    return f"{p} {n}", n


def _valido(n):
    return (len(n) >= 3 and n not in GENERICO and not re.fullmatch(r"[\d\s]+", n)
            and len(n.split()) <= 8 and n.split()[0] not in INICIO_INVALIDO)


def _limpa_exibicao(nome):
    nome = nome.strip().strip("-– ")
    if len(nome.split()) > 1 and not re.search(r"\b(de|do|da)\s+\d+$", nome, re.I):
        nome = re.sub(r"\s+\d+$", "", nome)
    return nome


PREFIXO_EXIBICAO = {"ruas": "Rua", "rua": "Rua", "avenidas": "Avenida", "avenida": "Avenida",
                    "av": "Avenida", "av.": "Avenida", "pracas": "Praça", "praca": "Praça"}


def extrair(ementa):
    """Devolve (ruas, bairros, tipos): ruas/bairros como lista de (chave, como_esta_escrito)."""
    ruas, bairros = {}, {}
    texto = RE_ABREV_PONTO.sub(lambda m: m.group(1) + " ", ementa or "")
    texto = RE_CONJ_HAB.sub("Conjunto Habitacional ", texto)
    texto = RE_PREFIXO_DOBRADO.sub(lambda m: m.group(2), texto)  # "rua Rua X" -> "Rua X"
    for m in RE_RUA.finditer(texto):
        prefixo, nome = m.group(1), m.group(2)
        pref = PREFIXO_EXIBICAO.get(norm(prefixo), prefixo.strip().capitalize())
        nomes = [nome]
        if norm(prefixo) in ("ruas", "avenidas", "pracas"):
            # "nas ruas A, B e C": corta a lista no fim da frase e separa os nomes
            cauda = texto[m.start(2):m.start(2) + 300]
            cauda = re.split(r"\s+(?:no|na|em|para|visando|objetivando|localizad\w*|bem como|e d[aá] outras|"
                             r"do bairro|jardim|bairro|do parque|do loteamento|do conjunto|desta|deste|"
                             r"nesta|neste|de nossa|em nosso)\b|[.;(]", cauda, flags=re.I)[0]
            nomes = []
            for x in re.split(r",\s*|\s+e\s+|\s+com\s+(?:a\s+)?", cauda, flags=re.I):
                x = re.sub(r"^(?:ruas?|avenidas?|av\.?)\s+", "", x.strip(), flags=re.I)
                mm = re.match(NOME + PARA, x + " .", re.I)
                if mm:
                    nomes.append(mm.group(1))
        for nm in nomes:
            k, n = chave_lugar(pref, nm)
            if _valido(n):
                ruas.setdefault(k, f"{pref} {_limpa_exibicao(nm)}")
    for m in RE_BAIRRO.finditer(texto):
        k, n = chave_lugar(m.group(1), m.group(2))
        if _valido(n) and not n.startswith("industrial"):
            pref = m.group(1).strip().capitalize()
            # "Bairro Jardim X" é exibido só como "Jardim X"
            escrito = m.group(2).strip() if pref.lower() == "bairro" and n.startswith(PREFIXOS_BAIRRO_NOME)                 else f"{pref} {m.group(2).strip()}"
            bairros.setdefault(k, escrito[:1].upper() + escrito[1:])
    if RE_CRUZ.search(texto):
        bairros.setdefault("distrito cruz das posses", "Distrito de Cruz das Posses")
    e = norm(texto)
    tipos = [t for t, (_, pals) in TIPOS_PEDIDO.items() if any(p in e for p in pals)]
    return list(ruas.items()), list(bairros.items()), tipos
