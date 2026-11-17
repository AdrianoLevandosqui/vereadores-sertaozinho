// Radar STZ — site em uma página só.
// Rotas pelo # do endereço: (início), #lugares, #repetidos, #propostas, #propostas-<grupo>, #vereadores,
// #v<ID>, #v<ID>-<ano>, #como-ler, #regra, #regra-lugares, #conferencia.
"use strict";

// ------------------------------------------------------------------ constantes
const ORDEM_GRUPOS = ["melhoria", "pergunta", "homenagem", "lei", "outros"];
const ROTULO_CURTO = { melhoria: "Pedido", pergunta: "Cobrança", homenagem: "Homenagem", lei: "Proposta de lei", outros: "Outro" };
const DESCR_GRUPO = {
  melhoria: "Tapar buraco, pôr lombada, trocar lâmpada, podar árvore, reformar praça. É um pedido: quem decide se faz é a Prefeitura.",
  pergunta: "Pedidos de informação e de explicação à Prefeitura.",
  homenagem: "Parabéns e aplausos, pesar por falecimento, título de cidadão, medalha, nome de rua e data comemorativa.",
  lei: "Projetos que criam ou mudam uma regra, um programa ou uma obrigação na cidade.",
  outros: "Dinheiro do orçamento para entidades, sugestões de programas, apoio ou protesto e pedidos sobre o andamento da Câmara.",
};
const ICONE_GRUPO = { melhoria: "pin", pergunta: "ask", homenagem: "medal", lei: "law", outros: "dots" };
const ICONE_TEMA = {
  lombada: "bump", sinalizacao: "sign", semaforo: "light", iluminacao: "bulb", poda: "tree", asfalto: "road",
  limpeza: "leaf", drenagem: "drop", calcada: "walk", onibus: "bus", lazer: "park", seguranca: "shield",
  agua: "tap", saude: "cross", escola: "book", transito: "car",
};
// ícones de linha (desenho próprio, 24x24)
const ICONES = {
  pin: '<path d="M12 21s-7-6-7-11a7 7 0 1114 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.4"/>',
  ask: '<path d="M4 5h16v11H9l-5 4z"/><path d="M10 9.2a2 2 0 113 1.7c-.6.4-1 .8-1 1.6M12 14.5h.01"/>',
  medal: '<circle cx="12" cy="15" r="5"/><path d="M9 10.5L6 3h4l2 5 2-5h4l-3 7.5M12 13v4"/>',
  law: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h7"/>',
  dots: '<circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>',
  bump: '<path d="M3 17h18"/><path d="M6 17c1.5-5 10.5-5 12 0"/><path d="M9 10l-1-2M15 10l1-2M12 9V6"/>',
  sign: '<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  light: '<rect x="8" y="2" width="8" height="20" rx="3"/><circle cx="12" cy="7" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="17" r="1.6"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 00-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0012 3z"/>',
  tree: '<path d="M12 21v-6"/><path d="M12 15a5 5 0 01-4.5-7.2A4.5 4.5 0 0112 3a4.5 4.5 0 014.5 4.8A5 5 0 0112 15z"/><path d="M7 21h10"/>',
  road: '<path d="M8 3L4 21M16 3l4 18M12 4v3M12 11v3M12 18v3"/>',
  leaf: '<path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 14z"/><path d="M5 19c3-4 6-7 10-9"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"/>',
  walk: '<path d="M4 20h16M6 20v-5h4v5M10 15V9h4v11M14 9V4h4v16"/>',
  bus: '<rect x="4" y="4" width="16" height="13" rx="2"/><path d="M4 11h16M8 17v3M16 17v3M8 14h.01M16 14h.01"/>',
  park: '<path d="M4 21V9l8-5 8 5v12"/><path d="M8 21v-6h8v6M8 11h8"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  tap: '<path d="M4 9h9a3 3 0 013 3v1M4 6v6M16 16s2 2.2 2 3.3a2 2 0 01-4 0c0-1.1 2-3.3 2-3.3z"/>',
  cross: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21V5M9 7h6"/>',
  car: '<path d="M5 13l2-6h10l2 6M4 13h16v5H4zM7 18v2M17 18v2"/><circle cx="8" cy="15.5" r=".8"/><circle cx="16" cy="15.5" r=".8"/>',
  vote: '<path d="M4 12l5 5L20 6"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
};
// fundos suaves dos crachás (só decoração: não indicam nada)
const TONS = ["#eaf2fc", "#fdeee6", "#efedfb", "#e5f3e5", "#fcedf3", "#fff4d6", "#e3f5f6", "#f0f0ea", "#f3eafb", "#e9f5ee"];
const POR_PAGINA = 20;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const TSE_FONTE = "https://dadosabertos.tse.jus.br/dataset/resultados-2024";
const AVISO_REPETIDO = `<p class="aviso"><strong>Pedido repetido não prova que a Prefeitura ignorou o pedido.</strong>
  Pode ter sido atendido e o problema voltado, pode ser outro trecho da mesma rua (avenidas longas aparecem muito),
  a Prefeitura pode ter respondido explicando o que dá ou não para fazer, ou vereadores diferentes podem ter pedido a mesma coisa.
  Veja a situação de cada pedido.</p>`;

// ------------------------------------------------------------------ estado
let IDX, SESSOES, V, ANO, BUSCA, REPET, REGRA, TIMER = null;
const MATERIAS = {};
let ORDEM = "nome", PARTIDO = "", ULTIMA_BUSCA = "", TIPO_REP = "";
let ORIGEM_FOLHA = "";

// ------------------------------------------------------------------ utilidades
const $ = id => document.getElementById(id);
const sem = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const svg = (nome, t = 22) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ICONES.dots}</svg>`;
const vereador = id => IDX.vereadores.find(v => v.id === id);
const nomeDe = id => { const v = vereador(id); return v ? (v.nome_politico || v.nome) : id; };
const tomDe = id => TONS[Math.max(0, IDX.vereadores.findIndex(v => v.id === id)) % TONS.length];
const av = id => { const v = vereador(id); return v ? foto(v, "av", 34) : `<span class="av"></span>`; };
const mesAno = d => `${MESES[+d.slice(3, 5) - 1]} ${d.slice(6, 10)}`;
const ordData = d => d.slice(6, 10) + d.slice(3, 5) + d.slice(0, 2);

function paginar(host, itens, render, passo = POR_PAGINA) {
  let feito = 0;
  host.innerHTML = '<ul class="itens"></ul>';
  const ul = host.firstChild;
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "mais-itens";
  const mais = () => {
    ul.insertAdjacentHTML("beforeend", itens.slice(feito, feito + passo).map(render).join(""));
    feito += passo;
    if (feito >= itens.length) btn.remove();
    else btn.textContent = `Mostrar mais ${Math.min(passo, itens.length - feito)} de ${n(itens.length - feito)}`;
  };
  btn.addEventListener("click", mais);
  if (itens.length > passo) host.appendChild(btn);
  if (!itens.length) ul.innerHTML = `<li class="fraco">Nada encontrado.</li>`;
  mais();
}

// Resumo automático: tira o começo burocrático ("Requer informações do Executivo Municipal sobre a
// possibilidade de serem realizados estudos objetivando...") e deixa o pedido. O texto oficial aparece junto.
function resumo(t) {
  let s = String(t || "").trim().replace(/^[("“]+/, "").replace(/[)"”]+\.?$/, "").trim();
  const antes = s;
  const regras = [
    /^(?:requer|requerem|solicita|solicitam)(?:-se)?\s+(?:a\s+|o\s+)?(?:envio\s+de\s+of[ií]cio\s+)?(?:informa[çc](?:ão|ões|ao|oes)\s+)?(?:e\s+provid[eê]ncias\s+)?(?:(?:d[oa]s?|a[oa]?s?|junto\s+a[oa]?|ao\s+excelent[ií]ssimo\s+senhor)\s+)?(?:excelent[ií]ssimo\s+senhor\s+)?(?:poder\s+)?(?:executivo|prefeito)(?:\s+municipal)?(?:\s+de\s+sert[aã]ozinho)?[^,]{0,140}?(?:,\s*)?(?:sobre|acerca|quanto|referente|para\s+que|a\s+respeito|que\s+informe|que)\b\s*(?:d[aeo]s?\s+)?/i,
    /^indic[ao]\s+(?:ao\s+)?(?:excelent[ií]ssimo\s+senhor\s+prefeito(?:\s+municipal)?|(?:poder\s+)?executivo(?:\s+municipal)?)[^,]{0,80}?(?:,\s*)?(?:sobre\s+)?(?:a\s+possibilidade\s+de\s+)?/i,
    /^(?:a\s+)?(?:possibilidade|possiblidade|possibiidade|viabilidade)\s+(?:t[eé]cnica\s+)?(?:de\s+|da\s+)?/i,
    /^(?:serem?\s+)?(?:realizad[oa]s?|desenvolvid[oa]s?|realiza[çc][aã]o\s+de|realizar)\s+/i,
    /^(?:de\s+)?(?:estudos?|estudo\s+t[eé]cnico)(?:\s+t[eé]cnicos?)?(?:\s+e\s+operacionais)?\s*,?\s*(?:objetivando|visando|para)\s*,?\s*(?:[àa]s?\s+|[ao]s?\s+)?/i,
    /^(?:objetivando|visando)\s*(?:[àa]s?\s+|[ao]s?\s+)?/i,
  ];
  for (const r of regras) s = s.replace(r, "");
  s = s.trim();
  if (s === antes || s.length < 15) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// situação curta: "18/03/2025 12:12 - Respondida (Resposta do Executivo...)" -> "Respondida"
function situacaoCurta(s) {
  if (!s) return "";
  return s.replace(/^\d\d\/\d\d\/\d{4}\s+\d\d:\d\d\s*-\s*/, "").replace(/\s*\(.*$/, "").trim();
}
const stt = s => s ? `<span class="stt" title="${esc(s)}">${esc(situacaoCurta(s))}</span>` : "";

// anel de presença: presente (tinta), falta justificada (amarelo), ausente sem justificativa (vermelho)
function anel(t, href) {
  const tot = t.total || 1, C = 2 * Math.PI * 30;
  const seg = (v, cor, off) => v ? `<circle cx="38" cy="38" r="30" fill="none" stroke="${cor}" stroke-width="9"
    stroke-dasharray="${Math.max(0.5, v / tot * C - (v < tot ? 2 : 0))} ${C}" stroke-dashoffset="${-off / tot * C}" transform="rotate(-90 38 38)"/>` : "";
  const pct = Math.round(t.presente / tot * 100);
  return `<a class="anel" href="${esc(href)}" aria-label="${t.presente} presenças em ${t.total} sessões, ${pct} por cento">
    <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="30" fill="none" stroke="#eef1f4" stroke-width="9"/>
    ${seg(t.presente, "var(--presente)", 0)}${seg(t.justificada, "var(--justificada)", t.presente)}${seg(t.ausente, "var(--ausente)", t.presente + t.justificada)}</svg>
    <b>${pct}%</b></a>`;
}

async function carregaBusca() {
  if (!BUSCA) [BUSCA, REPET] = await Promise.all([json("dados/busca.json"), json("dados/repeticoes.json")]);
  if (BUSCA._prep) return;
  for (const it of BUSCA.itens) {
    it._busca = sem(`${it.e} ${it.r.concat(it.b).map(i => BUSCA.lugares[i].n).join(" ")}`);
    it._ord = ordData(it.d);
    it._lugar = ["Requerimentos", "Indicacoes"].includes(it.tp) || it.r.length > 0 || it.b.length > 0;
  }
  for (const lg of BUSCA.lugares) lg._busca = sem(lg.n);
  for (const r of REPET) {
    r.itens = r.i.map(i => BUSCA.itens[i]);
    const b = {};
    for (const it of r.itens) for (const x of it.b) b[x] = (b[x] || 0) + 1;
    const top = Object.entries(b).sort((x, y) => y[1] - x[1])[0];
    r.bairro = top ? BUSCA.lugares[top[0]].n : "";
    r.autores = [...new Set(r.itens.flatMap(it => it.a))];
  }
  BUSCA._prep = true;
}

// ------------------------------------------------------------------ cartões de proposta
// it: item do busca.json ({tp,d,t,e,a,o,s,u,g,k}) ou proposta do arquivo do vereador ({tp,d,t,e,s,u,g,k,c,mo})
function cartao(it, opc = {}) {
  const tema = (it.k || [])[0];
  const r = resumo(it.e);
  const quem = opc.autores && it.a ? `<span class="quem">${it.a.slice(0, 3).map(a =>
      `${av(a)}<a href="#v${encodeURIComponent(a)}">${esc(nomeDe(a))}</a>`).join("")}${it.a.length > 3 ? `<span class="fraco">+${it.a.length - 3}</span>` : ""}</span>`
    : (it.c ? `<span class="fraco">Assinada com mais ${it.c} vereador${it.c > 1 ? "es" : ""}</span>` : "<span></span>");
  return `<li class="it k-${it.g}"><span class="ic">${svg(tema ? ICONE_TEMA[tema] : ICONE_GRUPO[it.g])}</span><div>
    <p class="tx">${esc(r || it.e)}</p>
    ${r ? `<p class="of"><span>Texto oficial:</span> ${esc(it.e)}</p>` : ""}
    <div class="mt"><span class="lab">${esc(tema ? IDX.temas[tema] : ROTULO_CURTO[it.g])}</span>${stt(it.s)}<span>${esc(it.d)}</span><span>·</span><span>${esc(it.t)}</span></div>
    ${opc.porque && it.mo ? `<p class="porque">Por que está neste grupo: ${esc(it.mo)}</p>` : ""}
    <div class="ft">${quem}<a class="ext" href="${esc(it.u)}">Abrir na Câmara ↗</a></div></div></li>`;
}

function chipsTemas(host, itens, aoEscolher) {
  const cont = {};
  for (const it of itens) for (const k of it.k || []) cont[k] = (cont[k] || 0) + 1;
  const temas = Object.entries(cont).sort((a, b) => b[1] - a[1]);
  if (temas.length < 2) { host.innerHTML = ""; host.style.display = "none"; return; }
  host.style.display = "";
  host.innerHTML = `<div class="chips"><button class="chip" type="button" data-t="" aria-pressed="true">Tudo<small>${n(itens.length)}</small></button>${
    temas.map(([k, q]) => `<button class="chip" type="button" data-t="${k}" aria-pressed="false">${esc(IDX.temas[k] || k)}<small>${n(q)}</small></button>`).join("")}</div>`;
  host.onclick = e => {
    const b = e.target.closest("[data-t]"); if (!b) return;
    host.querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", x === b));
    aoEscolher(b.dataset.t);
  };
}

// ------------------------------------------------------------------ painel (folha que sobe)
let ultimoFoco = null;
function abrirFolha({ k, icone, titulo, sub }) {
  ultimoFoco = document.activeElement;
  $("fo-topo").className = "fo-topo" + (k ? " k-" + k : "");
  $("fo-ic").innerHTML = svg(icone, 24);
  $("fo-t").textContent = titulo; $("fo-s").textContent = sub || "";
  $("fo-f").innerHTML = ""; $("fo-f").style.display = "none";
  $("fo-b").innerHTML = ""; $("fo-b").scrollTop = 0;
  $("folha").classList.add("on"); $("veu").classList.add("on");
  document.body.style.overflow = "hidden";
  $("fo-x").focus();
}
function fecharFolha() {
  if (!$("folha").classList.contains("on")) return;
  $("folha").classList.remove("on"); $("veu").classList.remove("on");
  document.body.style.overflow = "";
  if (ultimoFoco && document.contains(ultimoFoco)) ultimoFoco.focus();
  if (ORIGEM_FOLHA) { const volta = ORIGEM_FOLHA; ORIGEM_FOLHA = ""; history.replaceState(null, "", "#" + volta); }
}

function abrirGrupo(g, vid) {
  const todos = BUSCA.itens.filter(it => it.g === g && (!vid || it.a.includes(vid))).sort((a, b) => b._ord.localeCompare(a._ord));
  abrirFolha({ k: g, icone: ICONE_GRUPO[g], titulo: IDX.grupos[g],
    sub: `${n(todos.length)} ${vid ? "de " + nomeDe(vid) : "de todos os vereadores"} desde 2025` });
  const desenha = t => paginar($("fo-b"), t ? todos.filter(it => (it.k || []).includes(t)) : todos, it => cartao(it, { autores: !vid }));
  chipsTemas($("fo-f"), todos, desenha);
  desenha("");
}

function abrirCaso(r) {
  const tema = IDX.temas[r.k] || BUSCA.tipos_pedido[r.k];
  abrirFolha({ k: "melhoria", icone: ICONE_TEMA[r.k], titulo: BUSCA.lugares[r.r].n,
    sub: `${tema} · pedido ${r.itens.length} vezes${r.bairro ? " · " + r.bairro : ""}` });
  $("fo-b").innerHTML = `${caixaCobre(r)}${AVISO_REPETIDO}<p class="h3">Os ${r.itens.length} pedidos, do mais recente ao mais antigo</p><div id="caso-lista"></div>`;
  paginar($("caso-lista"), [...r.itens].sort((a, b) => b._ord.localeCompare(a._ord)), it => cartao(it, { autores: true }));
  ligaCobre(r);
}

// "Cobre uma resposta": mensagem pronta (só com os números oficiais) para o vereador que pediu
function caixaCobre(r) {
  const quem = r.autores.filter(id => (vereador(id) || {}).contato);
  if (!quem.length) return "";
  const cont = id => r.itens.filter(it => it.a.includes(id)).length;
  quem.sort((a, b) => cont(b) - cont(a));
  return `<div class="cobre"><h3>Cobre uma resposta</h3>
    <p>A mensagem já vem pronta, só com os números oficiais. Escolha o vereador, ajuste o texto se quiser e envie.</p>
    <label class="campo" for="cob-v">Para quem
      <select id="cob-v">${quem.map(id => `<option value="${esc(id)}">${esc(nomeDe(id))} (${cont(id)} ${cont(id) === 1 ? "pedido" : "pedidos"} para esta rua)</option>`).join("")}</select></label>
    <label class="campo" for="cob-t">Mensagem<textarea id="cob-t" rows="7"></textarea></label>
    <div class="acoes" id="cob-a"></div><div class="ct" id="cob-c"></div></div>`;
}
function ligaCobre(r) {
  const sel = $("cob-v"), ta = $("cob-t");
  if (!sel) return;
  const rua = BUSCA.lugares[r.r].n, tema = (IDX.temas[r.k] || "").toLowerCase();
  const site = /^https?:/.test(location.protocol) && !/claude/.test(location.hostname) ? `${location.origin}${location.pathname}#repetidos` : "";
  const msg = id => {
    const c = r.itens.filter(it => it.a.includes(id)).length;
    return `Olá, ${nomeDe(id)}. Moro em Sertãozinho. A Câmara já recebeu ${r.itens.length} pedidos sobre ${tema} para a ${rua}${r.bairro ? ", " + r.bairro : ""}, desde ${mesAno(r.itens[0].d)}. ` +
      `${c === 1 ? "Um deles saiu" : c + " deles saíram"} do seu gabinete. O que a Prefeitura respondeu? O que ainda dá para fazer?` + (site ? `\n\nFonte: ${site}` : "");
  };
  const links = () => {
    const c = vereador(sel.value).contato || {}, t = encodeURIComponent(ta.value);
    $("cob-a").innerHTML = (c.email ? `<a class="botao" href="mailto:${esc(c.email)}?subject=${encodeURIComponent(rua + ": pedidos sobre " + tema)}&body=${t}">Enviar por e-mail</a>` : "") +
      `<a class="botao verde" href="https://wa.me/?text=${t}">Mandar no WhatsApp</a><button class="botao claro" type="button" id="cob-cp">Copiar mensagem</button>`;
    $("cob-c").innerHTML = [c.email ? `E-mail oficial: <b>${esc(c.email)}</b>` : "", c.celular ? `Celular no perfil oficial: <b>${esc(c.celular)}</b>` : "",
      c.telefone ? `Telefone: <b>${esc(c.telefone)}</b>` : ""].filter(Boolean).join(" · ");
    $("cob-cp").onclick = async e => {
      try { await navigator.clipboard.writeText(ta.value); e.target.textContent = "Copiado"; }
      catch (_) { ta.focus(); ta.select(); e.target.textContent = "Selecionado: copie com o dedo"; }
    };
  };
  const preenche = () => { ta.value = msg(sel.value); links(); };
  sel.addEventListener("change", preenche); ta.addEventListener("input", links); preenche();
}

// ------------------------------------------------------------------ página inicial
const ORDENS = {
  nome: ["Nome (A–Z)", null],
  faltas: ["Quem mais faltou", v => v.r.pres_ausente * 1000 + v.r.pres_justificada],
  lei: ["Mais propostas de lei", v => v.r.g_lei],
  homenagem: ["Mais homenagens", v => v.r.g_homenagem],
  melhoria: ["Mais pedidos para os bairros", v => v.r.g_melhoria],
  nao: ["Quem mais votou “não” ou se absteve", v => v.r.voto_C + v.r.voto_A],
};

function abrirInicio(alvo) {
  if (!$("s-bairro")) montaInicio();
  else if (!TIMER) heroi();
  document.title = "Radar STZ — o que fazem os vereadores de Sertãozinho";
  const sec = { lugares: "s-bairro", repetidos: "s-repetidos", propostas: "s-propostas", vereadores: "s-vereadores" }[alvo.split("-")[0]];
  if (sec) $(sec).scrollIntoView({ block: "start" }); else window.scrollTo(0, 0);
  const m = alvo.match(/^propostas-(\w+)$/);
  if (m && ORDEM_GRUPOS.includes(m[1])) carregaBusca().then(() => { ORIGEM_FOLHA = "propostas"; abrirGrupo(m[1]); });
}

function montaInicio() {
  const total = Object.values(IDX.grupos_total).reduce((a, b) => a + b, 0);
  $("app").innerHTML = `
  <section class="abre">
    <span class="ao-vivo"><i></i><span id="vivo"></span></span>
    <h1 class="lede"><b>Raio-X da Câmara de Sertãozinho.</b> O que cada vereador fez desde a posse, com o documento oficial de cada número.</h1>
    <div id="medidor"></div>
    <div class="stats">
      <a class="stat" href="#propostas"><b>${n(total)}</b><span>propostas dos vereadores desde 2025</span></a>
      <a class="stat k-melhoria" href="#propostas-melhoria"><b>${n(IDX.grupos_total.melhoria || 0)}</b><span>pedidos para os bairros</span></a>
      <a class="stat k-homenagem" href="#propostas-homenagem"><b>${n(IDX.grupos_total.homenagem || 0)}</b><span>homenagens</span></a>
      <a class="stat k-lei" href="#propostas-lei"><b>${n(IDX.grupos_total.lei || 0)}</b><span>propostas de lei</span></a>
    </div>
    <p class="upd" id="upd"></p>
  </section>

  <section class="secao" id="s-bairro" aria-labelledby="h-b">
    <span class="olho">Comece por aqui</span>
    <h2 id="h-b">O que foi pedido para o seu bairro?</h2>
    <p class="sub">Digite o nome do bairro ou da rua. Sem nada digitado, aparece a cidade inteira.</p>
    <label class="busca-grande" for="bq">${svg("search")}
      <input id="bq" type="search" list="bl" placeholder="Seu bairro ou sua rua" autocomplete="off" aria-label="Bairro ou rua"></label>
    <datalist id="bl"></datalist>
    <ul class="chips" id="bchips"></ul>
    <div id="bres" aria-live="polite"><p class="carregando">Carregando os pedidos…</p></div>
  </section>

  <section class="secao" id="s-repetidos" aria-labelledby="h-r">
    <span class="olho">Cruzamento de dados</span>
    <h2 id="h-r">Pedidos que voltam para a mesma rua</h2>
    <p class="sub">Quando o mesmo tipo de pedido é feito várias vezes para a mesma rua, ele aparece aqui. O site da Câmara não mostra esse cruzamento: o Radar compara os pedidos um por um.</p>
    <div id="rfiltros"></div>
    <div class="reps" id="reps"><p class="carregando">Carregando…</p></div>
    <p class="fraco" style="margin-top:12px">Pedido repetido não prova que a Prefeitura ignorou: pode ser outro trecho da rua ou um problema que voltou. Abra o caso e leia os pedidos.
      <a href="#regra-lugares">Como o cruzamento é feito</a>.</p>
  </section>

  <section class="secao" id="s-propostas" aria-labelledby="h-p">
    <span class="olho">O trabalho da Câmara</span>
    <h2 id="h-p">Pedido, lei ou homenagem?</h2>
    <p class="sub">São ${n(total)} propostas assinadas por vereadores desde 2025, separadas com a <a href="#regra">mesma regra para todos</a>. Toque em um grupo para ler uma por uma.</p>
    <div class="divisao" role="img" aria-label="Divisão das propostas por grupo">${ORDEM_GRUPOS.map(g =>
      `<i class="k-${g}" style="flex:${IDX.grupos_total[g] || 0} 1 0"></i>`).join("")}</div>
    <ul class="legenda">${ORDEM_GRUPOS.map(g => `<li class="k-${g}">${esc(IDX.grupos[g])}: ${n(IDX.grupos_total[g] || 0)}</li>`).join("")}</ul>
    <div class="cats">${ORDEM_GRUPOS.map(g => `<a class="cat k-${g}" href="#propostas-${g}">
      <span class="ci">${svg(ICONE_GRUPO[g], 26)}</span><span class="cv">${n(IDX.grupos_total[g] || 0)}</span>
      <span class="cn">${esc(IDX.grupos[g])}</span><span class="cd">${esc(DESCR_GRUPO[g])}</span><span class="ir">Ver todas →</span></a>`).join("")}</div>
  </section>

  <section class="secao" id="s-vereadores" aria-labelledby="h-v">
    <span class="olho">Um por um</span>
    <h2 id="h-v">Os ${IDX.vereadores.length} vereadores</h2>
    <p class="sub" id="vsub"></p>
    <div class="ferramentas">
      <label class="campo" for="q">Buscar por nome<input id="q" type="search" placeholder="Ex.: Niltinho, Edna, Juan" autocomplete="off"></label>
      <label class="campo" for="partido">Partido<select id="partido"></select></label>
      <label class="campo" for="ordem">Ordenar por<select id="ordem"></select></label>
    </div>
    <p id="conta" aria-live="polite"></p>
    <ul class="grade" id="grade"></ul>
    <p class="fraco" style="margin-top:14px">Os números dos crachás somam 2025 e 2026. Toque em “Página completa” para ver cada número com o link do documento oficial.
      Ordenar não é nota: quem preside a sessão quase não vota, e quem entrou no meio do mandato teve menos sessões.</p>
  </section>

  <section class="secao" id="s-como" aria-labelledby="h-c">
    <span class="olho">Transparência</span>
    <h2 id="h-c">De onde vêm os números</h2>
    <p class="sub">Tudo sai de documentos públicos da Câmara Municipal e do TSE, e antes de publicar o Radar confere os totais com os relatórios oficiais.</p>
    <div class="como">
      <div><h3>Presença</h3><p>Lista de presença de cada sessão ordinária e extraordinária, conferida com a lista assinada e com a ata.</p></div>
      <div><h3>Votos</h3><p>Relatório de votação de cada sessão. Os totais batem com o relatório oficial de cada vereador.</p></div>
      <div><h3>Pedido, lei ou homenagem</h3><p>Cada proposta é separada pelo tipo e pelas palavras do texto oficial, com a mesma regra para todos. Abra os grupos e leia uma por uma.</p></div>
      <div><h3>Pedido não é obra feita</h3><p>Um pedido de melhoria é só um pedido. A situação mostrada (apresentada, respondida…) é a que a Câmara registra.</p></div>
      <div><h3>Salário e eleição</h3><p>Subsídio do demonstrativo de salários da Câmara; votos de 2024 dos dados abertos do TSE.</p></div>
      <div><h3>Achou um erro?</h3><p>Cada cartão tem o link “Abrir na Câmara”. Se o registro oficial mudar, o número daqui muda na atualização seguinte. <a href="#conferencia">Veja a conferência</a>.</p></div>
    </div>
  </section>`;
  heroi();
  montaVereadores();
  carregaBusca().then(() => { montaBairro(); montaRepetidos(); })
    .catch(() => { for (const id of ["bres", "reps"]) if ($(id)) $(id).innerHTML = `<p>Não foi possível carregar os pedidos. Tente recarregar a página.</p>`; });
}

function heroi() {
  if (!$("medidor")) return;
  const s = IDX.salario;
  const ger = new Date(IDX.gerado_em.replace(/([+-]\d\d)(\d\d)$/, "$1:$2"));
  const quando = () => {
    const m = Math.max(0, Math.round((Date.now() - ger.getTime()) / 6e4));
    return m < 2 ? "agora mesmo" : m < 60 ? `há ${m} minutos` : m < 120 ? "há 1 hora" : m < 1440 ? `há ${Math.floor(m / 60)} horas` : m < 2880 ? "ontem" : `há ${Math.floor(m / 1440)} dias`;
  };
  $("vivo").textContent = `Dados conferidos ${quando()}`;
  $("upd").innerHTML = `Última conferência com a Câmara: ${ger.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })} às
    ${ger.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}, até a sessão de ${esc(IDX.ultima_sessao)}. O robô volta lá duas vezes por dia.`;
  if (!s) return;
  const mensal = Number(s.valor.replace(/\./g, "").replace(",", "."));
  $("medidor").innerHTML = `<div class="medidor"><span class="ml">Salário pago aos ${IDX.cadeiras} vereadores desde a posse</span>
    <b class="mv" id="tique">R$ 0</b>
    <span class="ms">e subindo agora · estimativa: ${IDX.cadeiras} subsídios de <a href="${esc(s.pagina)}">R$ ${esc(s.valor)}</a> por mês desde 1º de janeiro de 2025,
      proporcional ao tempo. Valor bruto, sem 13º nem outros pagamentos.</span></div>`;
  const posse = new Date(IDX.posse + "T00:00:00-03:00").getTime();
  const porMs = IDX.cadeiras * mensal * 12 / (365.25 * 864e5);
  const tique = () => { const el = $("tique"); if (el) el.textContent = brl.format((Date.now() - posse) * porMs); };
  clearInterval(TIMER); tique();
  TIMER = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : setInterval(tique, 120);
}

// ---------- bairro
function montaBairro() {
  const bairros = BUSCA.lugares.filter(l => l.t === "bairro").sort((a, b) => b.q - a.q);
  $("bl").innerHTML = BUSCA.lugares.filter(l => l.q > 0).sort((a, b) => b.q - a.q).slice(0, 600).map(l => `<option value="${esc(l.n)}">`).join("");
  $("bchips").innerHTML = bairros.slice(0, 10).map(l => `<li><button class="chip" type="button" data-b="${esc(l.n)}" aria-pressed="false">${esc(l.n)}</button></li>`).join("");
  let t;
  $("bq").addEventListener("input", e => { clearTimeout(t); t = setTimeout(() => mostraBairro(e.target.value), 200); });
  $("s-bairro").addEventListener("click", e => {
    const b = e.target.closest("[data-b]"); if (!b) return;
    $("bq").value = b.dataset.b; mostraBairro(b.dataset.b);
    $("bq").scrollIntoView({ block: "start", behavior: "smooth" });
  });
  $("bq").value = ULTIMA_BUSCA;
  mostraBairro(ULTIMA_BUSCA);
}

function mostraBairro(texto) {
  ULTIMA_BUSCA = texto;
  const host = $("bres"), q = sem(texto.trim()), cidade = !q;
  $("bchips").querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", sem(x.dataset.b) === q));
  if (!cidade && q.length < 3) { host.innerHTML = `<div class="painel"><p class="fraco" style="margin:0">Continue digitando: são precisas pelo menos 3 letras.</p></div>`; return; }
  const base = BUSCA.itens.filter(it => it._lugar);
  const itens = (cidade ? base : base.filter(it => it._busca.includes(q))).sort((a, b) => b._ord.localeCompare(a._ord));
  if (!itens.length) { host.innerHTML = `<div class="painel"><p class="fraco" style="margin:0">Nada encontrado para “${esc(texto)}”. Confira a grafia ou tente só uma parte do nome.</p></div>`; return; }
  const quem = {}, temas = {};
  for (const it of itens) { for (const a of it.a) quem[a] = (quem[a] || 0) + 1; for (const k of it.k) temas[k] = (temas[k] || 0) + 1; }
  const top = Object.entries(quem).sort((a, b) => b[1] - a[1] || nomeDe(a[0]).localeCompare(nomeDe(b[0])));
  const mx = top[0][1];
  const linha = ([id, c]) => `<li>${av(id)}<a class="nm" href="#v${encodeURIComponent(id)}">${esc(nomeDe(id))} <span class="fraco" style="font-weight:400">· ${esc((vereador(id) || {}).partido || "")}</span></a>
    <b>${n(c)}</b><span class="br"><i style="width:${c / mx * 100}%"></i></span></li>`;
  const th = Object.entries(temas).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const reps = cidade ? [] : REPET.filter(r => BUSCA.lugares[r.r]._busca.includes(q) || sem(r.bairro).includes(q)).slice(0, 3);
  const bairros = BUSCA.lugares.filter(l => l.t === "bairro").sort((a, b) => b.q - a.q).slice(0, 5);
  host.innerHTML = `<div class="painel">
    <div class="ph"><span class="grande">${n(itens.length)}</span><p>${cidade ? "pedidos para <b>a cidade inteira</b> desde 2025" : `${itens.length === 1 ? "pedido cita" : "pedidos citam"} <b>${esc(texto.trim())}</b> desde 2025`}</p></div>
    <div class="duas">
      <div><p class="h3">${cidade ? "Quem mais pediu" : "Quem mais pediu aqui"}</p><ol class="rank">${top.slice(0, 5).map(linha).join("")}</ol>
        ${top.length > 5 ? `<details class="mais-ver"><summary>Ver os outros ${top.length - 5}</summary><ol class="rank" style="margin-top:10px">${top.slice(5).map(linha).join("")}</ol></details>` : ""}
        <p class="fraco">Um pedido pode ter sido assinado por mais de um vereador.</p></div>
      ${th.length ? `<div><p class="h3">O que mais pedem${cidade ? "" : " aqui"}</p><ul class="temas">${th.map(([k, c]) =>
        `<li><span class="ti">${svg(ICONE_TEMA[k], 18)}</span><span>${esc(IDX.temas[k] || k)}</span><b>${n(c)}</b></li>`).join("")}</ul>
        <p class="fraco">Assunto lido no texto oficial. Um pedido pode ter mais de um.</p></div>` : ""}
      ${cidade ? `<div><p class="h3">Bairros mais citados</p><ul class="temas">${bairros.map(l =>
        `<li><span class="ti">${svg("pin", 18)}</span><button class="chip" style="min-height:0;padding:4px 10px;text-align:left;white-space:normal" type="button" data-b="${esc(l.n)}">${esc(l.n)}</button><b>${n(l.q)}</b></li>`).join("")}</ul></div>` : ""}
    </div>
    ${reps.length ? `<p class="h3" style="margin-top:24px">Pedidos que voltam aqui</p><div class="reps">${reps.map(cartaoRep).join("")}</div>` : ""}
    <p class="h3" style="margin-top:24px">${cidade ? "Os pedidos mais recentes da cidade" : "Os pedidos mais recentes"}</p><div id="blist"></div></div>`;
  paginar($("blist"), itens, it => cartao(it, { autores: true }), 5);
}

// ---------- repetidos
function cartaoRep(r) {
  return `<button class="rp" type="button" data-rep="${REPET.indexOf(r)}"><span class="rn">${r.itens.length}<small>vezes</small></span>
    <span class="rr">${esc(BUSCA.lugares[r.r].n)}</span><span class="rb">${esc(r.bairro || "Sertãozinho")}</span>
    <span class="rm"><span class="lab k-melhoria">${esc(IDX.temas[r.k] || r.k)}</span><span>${r.autores.length} ${r.autores.length === 1 ? "vereador pediu" : "vereadores pediram"}</span>
      <span>·</span><span>de ${mesAno(r.itens[0].d)} a ${mesAno(r.itens[r.itens.length - 1].d)}</span></span>
    <span class="ir">Ver pedidos e cobrar →</span></button>`;
}
function montaRepetidos() {
  const cont = {};
  for (const r of REPET) cont[r.k] = (cont[r.k] || 0) + 1;
  $("rfiltros").innerHTML = `<div class="chips"><button class="chip" type="button" data-k="" aria-pressed="${!TIPO_REP}">Todos<small>${n(REPET.length)}</small></button>${
    Object.entries(cont).sort((a, b) => b[1] - a[1]).map(([k, c]) => `<button class="chip" type="button" data-k="${k}" aria-pressed="${k === TIPO_REP}">${esc(IDX.temas[k] || k)}<small>${n(c)}</small></button>`).join("")}</div>`;
  const desenha = () => {
    const lista = REPET.filter(r => !TIPO_REP || r.k === TIPO_REP);
    let feito = 0;
    const host = $("reps");
    host.innerHTML = "";
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "mais-itens"; btn.style.gridColumn = "1 / -1";
    const mais = () => {
      btn.remove();
      host.insertAdjacentHTML("beforeend", lista.slice(feito, feito + 9).map(cartaoRep).join(""));
      feito += 9;
      if (feito < lista.length) { btn.textContent = `Mostrar mais ruas (${n(lista.length - feito)} na fila)`; host.appendChild(btn); }
    };
    btn.addEventListener("click", mais);
    mais();
  };
  $("rfiltros").onclick = e => {
    const b = e.target.closest("[data-k]"); if (!b) return;
    TIPO_REP = b.dataset.k;
    $("rfiltros").querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", x === b));
    desenha();
  };
  desenha();
}

// ---------- vereadores (crachás)
function metrica(v) {
  const r = v.r;
  if (ORDEM === "faltas") return `${n(r.pres_ausente)} ${r.pres_ausente === 1 ? "falta" : "faltas"} sem justificativa e ${n(r.pres_justificada)} ${r.pres_justificada === 1 ? "justificada" : "justificadas"}, em ${n(r.pres_total)} sessões`;
  if (ORDEM === "nao") return `Votou contra ${n(r.voto_C)} ${r.voto_C === 1 ? "vez" : "vezes"} e se absteve ${n(r.voto_A)} ${r.voto_A === 1 ? "vez" : "vezes"}`;
  if (ORDEM in { lei: 1, homenagem: 1, melhoria: 1 }) return `${IDX.grupos[ORDEM]}: ${n(r["g_" + ORDEM])}`;
  return "";
}

function cracha(v) {
  const r = v.r, t = { presente: r.pres_presente, justificada: r.pres_justificada, ausente: r.pres_ausente, total: r.pres_total };
  const pg = `#v${encodeURIComponent(v.id)}`, s = IDX.salario;
  const gtot = ORDEM_GRUPOS.reduce((a, g) => a + r["g_" + g], 0);
  return `<li class="cracha" style="--tom:${tomDe(v.id)}">
    <div class="cr-topo"><div class="furo" aria-hidden="true"></div>
      <div class="cr-id">${foto(v, "cr-foto", 84)}<div><h3><a href="${pg}">${esc(v.nome_politico || v.nome)}</a></h3><p class="civil">${esc(v.nome)}</p></div></div>
      <div class="tags"><span class="pill">${esc(v.partido)}</span>${v.mesa ? `<span class="pill cl">${esc(v.mesa)} da Câmara</span>` : ""}
        ${v.em_exercicio && v.entrou_depois ? `<span class="pill cl">Nas sessões desde ${esc(v.primeira_sessao)}</span>` : ""}
        ${v.em_exercicio ? "" : `<span class="pill cl">Fora do cargo · sessões até ${esc(v.ultima_sessao)}</span>`}</div></div>
    <div class="cr-corpo">
      ${ORDEM !== "nome" ? `<p class="metrica">${esc(metrica(v))}</p>` : ""}
      <div class="pres">${anel(t, pg)}<p><b>${n(t.presente)} de ${n(t.total)}</b> sessões com presença
        <small>${n(t.justificada)} ${t.justificada === 1 ? "falta justificada" : "faltas justificadas"} · ${n(t.ausente)} sem justificativa</small></p></div>
      <div class="mini">${s ? `<a href="${esc(s.pagina)}"><b>R$ ${esc(s.valor)}</b><span>salário bruto por mês</span></a>` : ""}
        ${v.tse ? `<a href="${TSE_FONTE}"><b>${n(v.tse.v)}</b><span>votos na eleição de 2024</span></a>` : ""}</div>
      <div><p class="h3">O que propôs desde 2025</p>
        <div class="barra5" aria-hidden="true">${ORDEM_GRUPOS.map(g => r["g_" + g] ? `<i class="k-${g}" style="flex:${r["g_" + g]} 1 0"></i>` : "").join("")}</div>
        ${ORDEM_GRUPOS.map(g => `<button class="pick k-${g}" type="button" data-v="${esc(v.id)}" data-g="${g}" ${r["g_" + g] ? "" : "disabled"}>
          <i></i><span>${esc(IDX.grupos[g])}</span><b>${n(r["g_" + g])}</b><span class="ar" aria-hidden="true">›</span></button>`).join("")}
        <p class="fraco" style="margin:4px 0 0">${n(gtot)} no total, sozinho ou com outros vereadores.</p></div>
      <div><p class="h3">Como votou desde 2025</p>
        <div class="voto"><a href="${pg}"><b>${n(r.voto_F)}</b><span>votos a favor</span></a><a href="${pg}"><b>${n(r.voto_C + r.voto_A)}</b><span>contra ou abstenção</span></a></div>
        ${v.mesa === "Presidente" ? `<p class="fraco" style="margin:8px 0 0">Quem preside a sessão quase não vota.</p>` : ""}</div>
      <p class="pe"><a href="${pg}">Página completa, com os documentos →</a><a href="${esc(BASE)}/camara/membros/show/${esc(v.id)}">Perfil oficial ↗</a></p>
    </div></li>`;
}

function montaVereadores() {
  const u = IDX.unanimidade;
  if (u && u.total) $("vsub").innerHTML = `Desde 2025, em <b>${Math.floor(u.iguais / u.total * 100)} de cada 100 votações</b> todos os vereadores que votaram votaram igual
    (${n(u.iguais)} de ${n(u.total)}). Toque nos números do crachá para ver os detalhes.`;
  const partidos = {};
  for (const v of IDX.vereadores) partidos[v.partido] = (partidos[v.partido] || 0) + 1;
  $("partido").innerHTML = `<option value="">Todos</option>` + Object.keys(partidos).sort((a, b) => a.localeCompare(b, "pt"))
    .map(p => `<option value="${esc(p)}">${esc(p)} (${partidos[p]})</option>`).join("");
  $("ordem").innerHTML = Object.entries(ORDENS).map(([k, [rot]]) => `<option value="${k}">${esc(rot)}</option>`).join("");
  $("partido").value = PARTIDO; $("ordem").value = ORDEM;
  const desenha = () => {
    const q = sem($("q").value.trim());
    PARTIDO = $("partido").value; ORDEM = $("ordem").value;
    const f = ORDENS[ORDEM][1];
    const L = IDX.vereadores.filter(v => (!PARTIDO || v.partido === PARTIDO) && (!q || sem(`${v.nome_politico} ${v.nome}`).includes(q)))
      .sort((a, b) => (f ? f(b) - f(a) : 0) || (a.nome_politico || a.nome).localeCompare(b.nome_politico || b.nome, "pt"));
    $("grade").innerHTML = L.length ? L.map(cracha).join("") : `<li class="fraco">Nenhum vereador com esse nome. Apague a busca ou escolha “Todos”.</li>`;
    $("conta").textContent = L.length === IDX.vereadores.length ? `Mostrando os ${L.length} vereadores.` : `Mostrando ${L.length} de ${IDX.vereadores.length} vereadores.`;
  };
  ["q", "partido", "ordem"].forEach(id => $(id).addEventListener("input", desenha));
  $("grade").addEventListener("click", async e => {
    const p = e.target.closest(".pick");
    if (p && !p.disabled) { await carregaBusca(); abrirGrupo(p.dataset.g, p.dataset.v); }
  });
  desenha();
}

// ------------------------------------------------------------------ página do vereador
async function abrirVereador(id, anoPedido) {
  const main = $("app");
  if (!V || V.id !== id) {
    main.innerHTML = `<p class="carregando">Carregando…</p>`;
    try { V = await json(`dados/vereadores/${encodeURIComponent(id)}.json`); }
    catch (e) { main.innerHTML = `<p>Vereador não encontrado. <a href="#vereadores">Ver todos os vereadores</a>.</p>`; return; }
  }
  document.title = `${nomeCurto()} — Radar STZ`;
  const comDados = IDX.anos.filter(a => V.anos[a] && V.anos[a].presenca.totais.total > 0);
  ANO = IDX.anos.includes(anoPedido) ? anoPedido : (comDados[0] || IDX.anos[0]);
  desenhaVereador();
}
const nomeCurto = () => V.nome_politico || V.nome;

function situacaoTSE(t) {
  const s = String(t || "").toLowerCase().replace(/\bqp\b/, "QP (quociente partidário)");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function desenhaVereador() {
  const main = $("app"), d = V.anos[ANO], s = IDX.salario, tse = V.tse, c = V.contato;
  const tel = x => `<a href="tel:+55${esc(x.replace(/\D/g, ""))}">${esc(x)}</a>`;
  main.innerHTML = `
    <p class="fraco" style="margin-top:14px"><a href="#vereadores">← Todos os vereadores</a></p>
    <article class="ficha">
      <div class="cr-topo" style="--tom:${tomDe(V.id)}"><div class="furo" aria-hidden="true"></div>
        <div class="cr-id">${foto(V, "cr-foto", 96)}<div><h1>${esc(nomeCurto())}</h1><p class="civil">${esc(V.nome)}</p></div></div>
        <div class="tags"><span class="pill">${esc(V.partido)}</span>${V.mesa ? `<span class="pill cl">${esc(V.mesa.cargo)} da Câmara</span>` : ""}</div></div>
      <div class="cr-corpo">
        <div class="numeros" style="margin:0">
          ${s ? `<div class="numero"><a href="${esc(s.pagina)}">R$ ${esc(s.valor)}</a><span>subsídio (salário bruto) por mês, igual para todos</span></div>` : ""}
          ${tse ? `<div class="numero"><a href="${esc(tse.fonte)}">${n(tse.votos_nominais)}</a><span>votos na eleição de 2024 · ${esc(situacaoTSE(tse.situacao))}</span></div>` : ""}
        </div>
        ${s ? `<p class="fraco" style="margin:0">Subsídio: <a href="${esc(s.pagina)}">${esc(s.documento.replace(/\s\d\d\/\d\d\/\d{4}.*$/, ""))}</a> da Câmara.
          Votos: <a href="${esc(tse ? tse.fonte : TSE_FONTE)}">dados abertos do TSE</a>${tse ? ` (arquivo de ${esc(tse.gerado_em)})` : ""}.</p>` : ""}
        ${c && (c.email || c.celular || c.telefone) ? `<p class="contato"><strong>Contato no <a href="${esc(V.perfil)}">perfil oficial</a>:</strong>
          ${[c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : "", c.celular ? `celular ${tel(c.celular)}` : "", c.telefone ? `telefone ${tel(c.telefone)}` : ""].filter(Boolean).join(" · ")}</p>`
          : `<p class="fraco" style="margin:0"><a href="${esc(V.perfil)}">Perfil oficial na Câmara ↗</a></p>`}
      </div>
    </article>
    ${V.em_exercicio ? "" : `<p class="aviso">Não está na lista atual de vereadores em exercício. Aparece nas listas oficiais de presença das sessões de ${esc(V.primeira_sessao)} a ${esc(V.ultima_sessao)}.</p>`}
    ${V.em_exercicio && V.entrou_depois ? `<p class="aviso">Aparece nas listas oficiais de presença a partir da sessão de ${esc(V.primeira_sessao)}.</p>` : ""}
    ${V.nota ? `<p class="aviso">${esc(V.nota.texto)} <a href="${esc(V.nota.fonte)}">Ver a ata</a>.</p>` : ""}
    ${tse && tse.cassacao && !tse.cassacao.startsWith("#") ? `<p class="aviso">Nos dados abertos do TSE, esta candidatura aparece com situação de cassação “${esc(tse.cassacao)}”,
      votos com destinação “${esc(tse.destinacao_votos)}” (${n(tse.votos_nominais)} nominais, ${n(tse.votos_validos)} válidos) e resultado “${esc(tse.situacao)}”.</p>` : ""}
    <div class="anos" role="group" aria-label="Escolha o ano">${IDX.anos.map(a => `<button type="button" data-ano="${a}" aria-pressed="${a === ANO}">${a}</button>`).join("")}</div>
    <p class="fraco">Mostrando ${ANO}${ANO === IDX.anos[0] ? ` (até a sessão de ${esc(IDX.ultima_sessao)})` : ""}.</p>
    <nav class="ir-para" aria-label="Nesta página"><button type="button" data-ir="presenca">Presença</button><button type="button" data-ir="propostas">Propostas</button><button type="button" data-ir="votos">Votos</button></nav>
    <section class="bloco" id="presenca"></section><section class="bloco" id="propostas"></section><section class="bloco" id="votos"></section>`;
  main.querySelectorAll(".anos button").forEach(b => b.addEventListener("click", () => { location.hash = `v${V.id}-${b.dataset.ano}`; }));
  main.querySelectorAll("[data-ir]").forEach(b => b.addEventListener("click", () => $(b.dataset.ir).scrollIntoView({ behavior: "smooth", block: "start" })));
  if (!d || d.presenca.totais.total === 0) {
    $("presenca").innerHTML = `<h2>Presença nas sessões</h2><p>${esc(nomeCurto())} não aparece nas listas oficiais de presença de ${ANO}.</p>`;
    return;
  }
  secaoPresenca(d.presenca);
  secaoPropostas(d.propostas, d.propostas_oficial);
  secaoVotos(d.votos);
}

function secaoPresenca(p) {
  const t = p.totais, faltas = p.sessoes.filter(s => s[1] !== "P");
  $("presenca").innerHTML = `<h2>Presença nas sessões</h2>
    <div class="pres-topo">${anel(t, p.fonte)}<p class="frase">Em ${ANO}, ${esc(nomeCurto())} aparece na lista de presença de
      <a href="${esc(p.fonte)}">${n(t.total)} sessões</a> e esteve presente em <a href="${esc(p.fonte)}">${n(t.presente)}</a>.</p></div>
    <div class="numeros">
      <div class="numero"><a href="${esc(p.fonte)}">${n(t.presente)}</a><span>presente</span></div>
      <div class="numero"><a href="${esc(p.fonte)}">${n(t.justificada)}</a><span>falta justificada</span></div>
      <div class="numero"><a href="${esc(p.fonte)}">${n(t.ausente)}</a><span>ausente sem justificativa registrada</span></div>
    </div>
    <p class="fraco">Números do <a href="${esc(p.fonte)}">relatório oficial de presenças de ${esc(nomeCurto())} em ${ANO}</a> (PDF da Câmara).</p>
    <p class="h3" style="margin-top:20px">Faltas</p>
    ${faltas.length ? `<ul class="itens">${faltas.map(itemSessao).join("")}</ul>` : `<p>Nenhuma falta registrada em ${ANO}.</p>`}
    <details class="grupo" id="todas-sessoes"><summary><i></i><span class="gt">Ver todas as sessões de ${ANO}</span><b>${n(p.sessoes.length)}</b></summary><div class="dentro" id="ts-lista"></div></details>`;
  const det = $("todas-sessoes");
  det.addEventListener("toggle", () => { if (det.open && !$("ts-lista").childElementCount) paginar($("ts-lista"), p.sessoes, itemSessao); });
}

function itemSessao(s) {
  const [i, cod, just, nota] = s, sessao = SESSOES[i];
  return `<li class="it"><span class="ic">${svg("cal")}</span><div>
    <p class="tx">${esc(sessao.n)}</p>
    <div class="mt"><span class="etiqueta ${cod}">${esc(PRESENCA[cod] || cod)}</span><span>${dataBR(sessao.d)}</span></div>
    ${just ? `<p class="of"><span>Motivo registrado:</span> ${esc(just)}</p>` : ""}
    ${nota ? `<p class="aviso">${esc(nota)} O Radar mostra o que está na lista de presença; as duas são publicações oficiais da Câmara.</p>` : ""}
    <div class="ft"><a class="ext" href="${esc(urlPresencaSessao(sessao.d))}">Lista de presença ↗</a>${sessao.a ? `<a class="ext" href="${esc(sessao.a)}">Ata da sessão ↗</a>` : ""}</div></div></li>`;
}

function secaoPropostas(props, oficial) {
  const totalOficial = Object.values(oficial).reduce((a, o) => a + o.n, 0);
  const perfilAno = `${V.perfil}/0/${ANO}`;
  const por = {};
  for (const g of ORDEM_GRUPOS) por[g] = props.filter(p => p.g === g);
  $("propostas").innerHTML = `<h2>Propostas apresentadas</h2>
    <p class="frase">Em ${ANO}, ${esc(nomeCurto())} assinou <a href="${esc(perfilAno)}">${n(totalOficial)} propostas</a>, sozinho(a) ou com outros vereadores.</p>
    <div class="barra5" aria-hidden="true" style="height:10px">${ORDEM_GRUPOS.map(g => por[g].length ? `<i class="k-${g}" style="flex:${por[g].length} 1 0"></i>` : "").join("")}</div>
    <p class="fraco">Toque em um grupo para ler uma por uma. Os grupos seguem a <a href="#regra">mesma regra para todos</a>.</p>
    ${ORDEM_GRUPOS.map(g => `<details class="grupo k-${g}" data-grupo="${g}"><summary><i></i><span><span class="gt">${esc(IDX.grupos[g])}</span><small>${esc(DESCR_GRUPO[g])}</small></span><b>${n(por[g].length)}</b></summary>
      <div class="dentro">${por[g].length ? `<div class="temas-filtro"></div><div class="lista"></div>` : "<p>Nenhuma proposta neste grupo.</p>"}</div></details>`).join("")}
    <details class="grupo"><summary><i></i><span class="gt">Contagem oficial da Câmara, por tipo de documento</span><b></b></summary><div class="dentro">
      <p class="fraco">É a contagem do <a href="${esc(perfilAno)}">perfil oficial</a>. Cada número abre a lista oficial.</p>
      <table><tbody>${Object.entries(oficial).sort((a, b) => b[1].n - a[1].n).map(([tipo, o]) => `<tr><td><strong>${esc((TIPOS[tipo] || [tipo])[0])}</strong><br>
        <span class="fraco">${esc((TIPOS[tipo] || ["", ""])[1])}</span></td><td class="n"><a href="${esc(o.u)}">${n(o.n)}</a></td></tr>`).join("")}</tbody></table></div></details>`;
  $("propostas").querySelectorAll("details[data-grupo]").forEach(det => det.addEventListener("toggle", () => {
    if (!det.open || det.dataset.aberto || !por[det.dataset.grupo].length) return;
    det.dataset.aberto = "1";
    const itens = por[det.dataset.grupo], lista = det.querySelector(".lista");
    const desenha = t => paginar(lista, t ? itens.filter(p => (p.k || []).includes(t)) : itens, p => cartao(p, { porque: true }));
    chipsTemas(det.querySelector(".temas-filtro"), itens, desenha);
    desenha("");
  }));
}

function secaoVotos(v) {
  const c = v.contagem;
  const caixa = (cod, rot) => `<div class="numero"><a href="${esc(v.fonte)}">${n(c[cod])}</a><span>${rot}</span></div>`;
  $("votos").innerHTML = `<h2>Como votou</h2>
    <p class="frase">Veja como ${esc(nomeCurto())} votou nas sessões de ${ANO}:</p>
    <div class="numeros">${caixa("F", "votos a favor")}${caixa("C", "votos contra")}${caixa("A", "abstenções (não votou a favor nem contra)")}
      ${c.P ? caixa("P", "vezes presidindo a sessão (o registro mostra “Presidente” no lugar do voto)") : ""}</div>
    <p class="fraco">Números do <a href="${esc(v.fonte)}">relatório oficial de votações de ${esc(nomeCurto())} em ${ANO}</a> (PDF da Câmara).
      Assuntos votados em dois turnos contam uma vez quando o voto foi igual nos dois, como no relatório oficial.</p>
    ${c.N ? `<p class="aviso"><strong>Voto não registrado: ${n(c.N)}.</strong> O relatório da sessão mostra “NÃO REGISTRADO” no lugar do voto.
      Isso aparece principalmente em votações em bloco. Não quer dizer que o vereador faltou: a presença está acima.</p>` : ""}
    <div id="lista-votos"><button type="button" class="mais-itens" id="abrir-votos">Ver votação por votação</button></div>`;
  $("abrir-votos").addEventListener("click", () => carregarVotos(v));
}

async function carregarVotos(v) {
  const caixa = $("lista-votos");
  caixa.innerHTML = `<p class="carregando">Carregando as votações…</p>`;
  try { MATERIAS[ANO] = MATERIAS[ANO] || await json(`dados/votacoes_${ANO}.json`); }
  catch (e) { caixa.innerHTML = `<p>Não foi possível carregar as votações. Tente de novo.</p>`; return; }
  const mats = MATERIAS[ANO];
  // mesma regra do relatório oficial: cada voto registrado diferente conta uma vez por matéria
  const itens = v.lista.map(([i, ...cods]) => {
    const regs = new Set(cods.filter(x => x !== "N"));
    return { m: mats[i], cods, regs: regs.size ? regs : new Set(["N"]) };
  }).sort((a, b) => SESSOES[b.m.s].d.localeCompare(SESSOES[a.m.s].d));
  const cont = { todos: itens.length };
  for (const it of itens) for (const x of it.regs) cont[x] = (cont[x] || 0) + 1;
  const ops = [["todos", "Todas"], ["F", "A favor"], ["C", "Contra"], ["A", "Abstenção"], ["N", "Não registrado"], ["P", "Presidindo"]].filter(([k]) => cont[k]);
  caixa.innerHTML = `<p class="h3" style="margin-top:20px">Votação por votação em ${ANO}</p>
    <label class="campo" for="busca-votos">Procure por assunto, número ou nome<input id="busca-votos" type="search" placeholder="Ex.: lombada, IPTU, saúde, 0045" autocomplete="off"></label>
    <div class="chips filtro-votos">${ops.map(([k, r]) => `<button class="chip" type="button" data-f="${k}" aria-pressed="${k === "todos"}">${r}<small>${n(cont[k])}</small></button>`).join("")}</div>
    <p class="fraco" id="qtd-votos"></p><div id="votos-lista"></div>`;
  let filtro = "todos";
  const aplica = () => {
    const q = sem($("busca-votos").value.trim());
    const sel = itens.filter(it => (filtro === "todos" || it.regs.has(filtro)) && (!q || sem(`${it.m.m} ${it.m.e} ${it.m.a}`).includes(q)));
    $("qtd-votos").textContent = `${n(sel.length)} votação(ões) nesta lista.`;
    paginar($("votos-lista"), sel, itemVoto);
  };
  caixa.querySelectorAll("[data-f]").forEach(b => b.addEventListener("click", () => {
    filtro = b.dataset.f; caixa.querySelectorAll("[data-f]").forEach(x => x.setAttribute("aria-pressed", x === b)); aplica();
  }));
  $("busca-votos").addEventListener("input", aplica);
  aplica();
}

function itemVoto(it) {
  const m = it.m, s = SESSOES[m.s], ex = explicaTitulo(m.m);
  const voto = it.cods.length > 1
    ? `1º turno: <span class="etiqueta">${esc(VOTO[it.cods[0]])}</span> · 2º turno: <span class="etiqueta">${esc(VOTO[it.cods[1]])}</span>`
    : `<span class="etiqueta">${esc(VOTO[it.cods[0]] || it.cods[0])}</span>`;
  return `<li class="it"><span class="ic">${svg("vote")}</span><div>
    <p class="tx">${esc(m.m)}</p>${ex ? `<p class="of">${esc(ex)}</p>` : ""}${m.e ? `<p class="of">${esc(m.e)}</p>` : ""}
    <div class="mt"><span>${dataBR(s.d)}</span><span>·</span><span>${esc(s.n)}</span></div>
    ${m.a ? `<p class="of"><span>Autoria:</span> ${esc(m.a)}</p>` : ""}
    <p class="of"><span>Resultado:</span> ${esc(m.r || "não informado no relatório")}</p>
    <p style="margin:8px 0 0">Voto de ${esc(nomeCurto())}: ${voto}</p>
    <div class="ft"><span></span><a class="ext" href="${esc(urlVotacaoSessao(s.d, m.p))}">PDF da votação${m.p > 1 ? `, página ${m.p}` : ""} ↗</a></div></div></li>`;
}

// ------------------------------------------------------------------ como ler
async function abrirComoLer(ancora) {
  document.title = "Como ler — Radar STZ";
  $("app").innerHTML = $("tpl-como-ler").innerHTML;
  $("tipos").innerHTML = "<ul>" + Object.values(TIPOS).filter((t, i, a) => a.findIndex(x => x[0] === t[0]) === i)
    .map(([nome, txt]) => `<li><strong>${esc(nome)}:</strong> ${esc(txt)}</li>`).join("") + "</ul>";
  try {
    REGRA = REGRA || await json("dados/regra.json");
    const limpa = p => p.replace(/\\b/g, "").replace(/\[\.\]/g, ".").trim();
    const bloco = (letra, titulo, lista) => `<details><summary>Lista ${letra}: ${esc(titulo)} (${lista.length})</summary>
      <p>${lista.map(p => `<code>${esc(limpa(p))}</code>`).join(", ")}</p></details>`;
    $("listas").innerHTML = bloco("A", "homenagem, pesar, título, nome de rua, data comemorativa", REGRA.HOMENAGEM) +
      bloco("B", "andamento dos trabalhos da Câmara", REGRA.PROCEDIMENTO) + bloco("C", "obra, conserto ou serviço público", REGRA.MELHORIA) +
      bloco("D", "pedido de estudo", REGRA.PEDE_ESTUDO) + bloco("E", "lugares da cidade", REGRA.LUGAR) + bloco("F", "pedido de informação", REGRA.PERGUNTA);
    $("tipos-pedido").innerHTML = "<ul>" + Object.values(REGRA.TIPOS_PEDIDO)
      .map(([rot, pals]) => `<li><strong>${esc(rot)}:</strong> ${pals.map(p => `<code>${esc(p)}</code>`).join(", ")}</li>`).join("") + "</ul>";
  } catch (e) {
    $("listas").textContent = "Não foi possível carregar as listas de palavras.";
  }
  if (ancora && $(ancora)) $(ancora).scrollIntoView({ block: "start" }); else window.scrollTo(0, 0);
}

// ------------------------------------------------------------------ roteador
async function rota() {
  clearInterval(TIMER); TIMER = null;
  ORIGEM_FOLHA = ""; fecharFolha();
  const h = decodeURIComponent(location.hash.slice(1));
  const m = h.match(/^v(\d+)(?:-(\d{4}))?$/);
  if (m) {
    const mesmo = V && V.id === m[1] && $("presenca");
    await abrirVereador(m[1], Number(m[2]) || 0);
    if (!mesmo) window.scrollTo(0, 0);
  } else if (h === "como-ler") await abrirComoLer("");
  else if (h === "regra") await abrirComoLer("grupos");
  else if (h === "regra-lugares") await abrirComoLer("regra-lugares");
  else if (h === "conferencia") await abrirComoLer("conferencia");
  else abrirInicio(h);
}

(async () => {
  try {
    [IDX, SESSOES] = await Promise.all([json("dados/indice.json"), json("dados/sessoes.json")]);
  } catch (e) {
    $("app").innerHTML = "<p>Não foi possível carregar os dados. Tente recarregar a página.</p>";
    return;
  }
  rodape(IDX.ultima_sessao);
  $("fo-x").addEventListener("click", fecharFolha);
  $("veu").addEventListener("click", fecharFolha);
  document.addEventListener("keydown", e => { if (e.key === "Escape") fecharFolha(); });
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-rep]");
    if (b && BUSCA) abrirCaso(REPET[+b.dataset.rep]);
  });
  window.addEventListener("hashchange", rota);
  rota();
})();
