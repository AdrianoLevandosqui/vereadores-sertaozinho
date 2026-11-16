// Site em uma página só: lista de vereadores, página de cada vereador e "Como ler".
// Navegação pelo # do endereço: #v286, #v286-2025, #como-ler, #regra.
"use strict";

const ORDEM_GRUPOS = ["melhoria", "pergunta", "homenagem", "lei", "outros"];
const DESCR_GRUPO = {
  melhoria: "Obras, consertos e serviços: lombadas, sinalização, iluminação, asfalto, limpeza, praças, saúde, ônibus etc.",
  pergunta: "Pedidos de informação e de explicação à Prefeitura.",
  homenagem: "Aplausos e parabéns, pesar por falecimento, títulos de cidadão, medalhas, nomes de ruas e datas comemorativas.",
  lei: "Propostas de novas leis e de mudanças em leis ou em projetos de lei.",
  outros: "Dinheiro do orçamento para entidades, sugestões de programas, pedidos sobre o andamento da Câmara e o que não se encaixou nos outros grupos.",
};
const POR_PAGINA = 25;

const sem = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

let V, IDX, SESSOES, ANO;
const MATERIAS = {};

async function abrirVereador(id, anoPedido) {
  const main = document.getElementById("app");
  if (!V || V.id !== id) {
    main.innerHTML = `<p class="carregando">Carregando…</p>`;
    try {
      V = await json(`dados/vereadores/${encodeURIComponent(id)}.json`);
    } catch (e) {
      main.innerHTML = `<p>Vereador não encontrado. <a href="#">Ver a lista de vereadores</a>.</p>`;
      return;
    }
  }
  document.title = `${nomeCurto()} — o que fez como vereador(a) em Sertãozinho`;
  const anosComDados = IDX.anos.filter(a => V.anos[a] && V.anos[a].presenca.totais.total > 0);
  ANO = IDX.anos.includes(anoPedido) ? anoPedido : (anosComDados[0] || IDX.anos[0]);
  desenha();
}

function nomeCurto() { return V.nome_politico || V.nome; }

function desenha() {
  const main = document.getElementById("app");
  const d = V.anos[ANO];
  main.innerHTML = `
    <div class="cabeca">
      ${foto(V, true)}
      <div>
        <h1>${esc(nomeCurto())}</h1>
        <div class="fraco">${esc(V.nome)} · ${esc(V.partido)}</div>
        <div class="fraco"><a href="${esc(V.perfil)}">Perfil oficial na Câmara</a></div>
        ${V.mesa ? `<span class="pill">${esc(V.mesa.cargo)} da Câmara</span>` : ""}
      </div>
    </div>
    ${V.em_exercicio ? "" : `<p class="aviso">Não está na lista atual de vereadores em exercício da Câmara.
      Aparece nas listas oficiais de presença das sessões de ${esc(V.primeira_sessao)} a ${esc(V.ultima_sessao)}.</p>`}
    ${V.em_exercicio && V.entrou_depois ? `<p class="aviso">Aparece nas listas oficiais de presença a partir da sessão de ${esc(V.primeira_sessao)}.</p>` : ""}
    ${V.nota ? `<p class="aviso">${esc(V.nota.texto)} <a href="${esc(V.nota.fonte)}">Ver a ata</a>.</p>` : ""}
    ${caixaMandato()}
    <div class="anos" role="group" aria-label="Escolha o ano">
      ${IDX.anos.map(a => `<button type="button" data-ano="${a}" aria-pressed="${a === ANO}">${a}</button>`).join("")}
    </div>
    <p class="fraco">Mostrando o ano de <strong>${ANO}</strong>${ANO === IDX.anos[0] ? ` (até a sessão de ${esc(IDX.ultima_sessao)})` : ""}.</p>
    <nav class="fraco ir-para" aria-label="Nesta página">Ir para:
      <button type="button" class="link" data-ir="presenca">Presença</button> ·
      <button type="button" class="link" data-ir="propostas">Propostas</button> ·
      <button type="button" class="link" data-ir="votos">Votos</button></nav>
    <section id="presenca"></section>
    <section id="propostas"></section>
    <section id="votos"></section>`;
  main.querySelectorAll(".anos button").forEach(b => b.addEventListener("click", () => {
    location.hash = `v${V.id}-${b.dataset.ano}`;
  }));
  main.querySelectorAll("[data-ir]").forEach(b => b.addEventListener("click", () =>
    document.getElementById(b.dataset.ir).scrollIntoView({ behavior: "smooth", block: "start" })));
  if (!d || d.presenca.totais.total === 0) {
    document.getElementById("presenca").innerHTML = `<h2>Presença nas sessões</h2>
      <p>${esc(nomeCurto())} não aparece nas listas oficiais de presença de ${ANO}.</p>`;
    return;
  }
  secaoPresenca(d.presenca);
  secaoPropostas(d.propostas, d.propostas_oficial);
  secaoVotos(d.votos);
}

// ------------------------------------------------------------------ presença
function secaoPresenca(p) {
  const t = p.totais;
  const el = document.getElementById("presenca");
  const faltas = p.sessoes.filter(s => s[1] !== "P");
  el.innerHTML = `
    <h2>Presença nas sessões</h2>
    <div class="pres-topo">${anel(t, p.fonte)}<p class="frase">Em ${ANO}, ${esc(nomeCurto())} aparece na lista de presença de
      <a href="${esc(p.fonte)}">${n(t.total)} sessões</a> da Câmara e esteve presente em <a href="${esc(p.fonte)}">${n(t.presente)}</a>.</p></div>
    <div class="numeros">
      <div class="numero"><a href="${esc(p.fonte)}">${n(t.presente)}</a><span>presente</span></div>
      <div class="numero"><a href="${esc(p.fonte)}">${n(t.justificada)}</a><span>falta justificada</span></div>
      <div class="numero"><a href="${esc(p.fonte)}">${n(t.ausente)}</a><span>ausente sem justificativa registrada</span></div>
    </div>
    <p class="fraco">Esses números são os do <a href="${esc(p.fonte)}">relatório oficial de presenças de ${esc(nomeCurto())} em ${ANO}</a> (PDF da Câmara).</p>
    <h3>Faltas</h3>
    ${faltas.length ? `<ul class="itens">${faltas.map(itemSessao).join("")}</ul>`
                    : `<p>Nenhuma falta registrada em ${ANO}.</p>`}
    <details id="todas-sessoes"><summary><span class="titulo-grupo">Ver todas as sessões de ${ANO}</span><span class="qtd">${n(p.sessoes.length)}</span></summary>
      <div class="dentro"><ul class="itens"></ul></div></details>`;
  const det = el.querySelector("#todas-sessoes");
  det.addEventListener("toggle", () => {
    const ul = det.querySelector("ul");
    if (det.open && !ul.childElementCount) paginar(ul, p.sessoes, itemSessao);
  });
}

function itemSessao(s) {
  const [i, cod, just, nota] = s;
  const sessao = SESSOES[i];
  return `<li class="item">
    <div class="data">${dataBR(sessao.d)}</div>
    <div>${esc(sessao.n)}</div>
    <div><span class="etiqueta">${esc(PRESENCA[cod] || cod)}</span>${just ? ` <span class="meta">Motivo registrado: ${esc(just)}</span>` : ""}</div>
    ${nota ? `<p class="aviso">${esc(nota)} O site mostra o que está na lista de presença; as duas são publicações oficiais da Câmara.</p>` : ""}
    <div class="fonte"><a href="${esc(urlPresencaSessao(sessao.d))}">Ver lista de presença oficial desta sessão</a>${sessao.a ? ` · <a href="${esc(sessao.a)}">Ver ata da sessão</a>` : ""}</div>
  </li>`;
}

// ------------------------------------------------------------------ propostas
function secaoPropostas(props, oficial) {
  const el = document.getElementById("propostas");
  const totalOficial = Object.values(oficial).reduce((a, o) => a + o.n, 0);
  const perfilAno = `${V.perfil}/0/${ANO}`;
  const porGrupo = {};
  for (const g of ORDEM_GRUPOS) porGrupo[g] = props.filter(p => p.g === g);
  el.innerHTML = `
    <h2>Propostas apresentadas</h2>
    <p class="frase">Em ${ANO}, ${esc(nomeCurto())} assinou <a href="${esc(perfilAno)}">${n(totalOficial)} propostas</a>,
      sozinho(a) ou junto com outros vereadores.</p>
    <p class="fraco">Toque em um grupo para ler proposta por proposta. Os grupos são uma separação feita por este site,
      com a <a href="#regra">mesma regra para todos os vereadores</a>.</p>
    ${ORDEM_GRUPOS.map(g => `
      <details data-grupo="${g}">
        <summary><span><span class="titulo-grupo">${esc(IDX.grupos[g])}</span><small>${esc(DESCR_GRUPO[g])}</small></span>
          <span class="qtd">${n(porGrupo[g].length)}</span></summary>
        <div class="dentro">${porGrupo[g].length ? '<div class="filtros temas"></div><ul class="itens"></ul>' : "<p>Nenhuma proposta neste grupo.</p>"}</div>
      </details>`).join("")}
    <details>
      <summary><span class="titulo-grupo">Contagem oficial da Câmara, por tipo de documento</span></summary>
      <div class="dentro">
        <p class="fraco">É a contagem que aparece no <a href="${esc(perfilAno)}">perfil oficial do vereador</a>. Cada número abre a lista oficial.</p>
        <table><tbody>
        ${Object.entries(oficial).sort((a, b) => b[1].n - a[1].n).map(([tipo, o]) => `
          <tr><td><strong>${esc((TIPOS[tipo] || [tipo])[0])}</strong><br><span class="fraco">${esc((TIPOS[tipo] || ["", ""])[1])}</span></td>
          <td class="n"><a href="${esc(o.u)}">${n(o.n)}</a></td></tr>`).join("")}
        </tbody></table>
      </div>
    </details>`;
  el.querySelectorAll("details[data-grupo]").forEach(det => det.addEventListener("toggle", () => {
    const ul = det.querySelector("ul");
    if (det.open && ul && !det.dataset.aberto) {
      det.dataset.aberto = "1";
      abreGrupo(det.querySelector(".dentro"), porGrupo[det.dataset.grupo], itemProposta, p => p.k);
    }
  }));
}

function itemProposta(p) {
  const tipo = TIPOS[p.tp];
  return `<li class="item">
    <div class="data">${esc(p.d)}</div>
    <div class="tit">${esc(p.t)}</div>
    ${tipo ? `<div class="explica">${esc(tipo[1])}</div>` : ""}
    ${textoComResumo(p.e)}
    ${p.s ? `<div class="meta">Situação: ${esc(p.s)}</div>` : ""}
    ${p.c ? `<div class="meta">Assinada junto com mais ${p.c} vereador${p.c > 1 ? "es" : ""}.</div>` : ""}
    <div class="porque">Por que está neste grupo: ${esc(p.mo)}</div>
    <div class="fonte"><a href="${esc(p.u)}">Ver documento oficial</a></div>
  </li>`;
}

// ------------------------------------------------------------------ votos
function secaoVotos(v) {
  const el = document.getElementById("votos");
  const c = v.contagem;
  const caixa = (cod, rot) => `<div class="numero"><a href="${esc(v.fonte)}">${n(c[cod])}</a><span>${rot}</span></div>`;
  el.innerHTML = `
    <h2>Como votou</h2>
    <p class="frase">Veja como ${esc(nomeCurto())} votou nas sessões de ${ANO}:</p>
    <div class="numeros">
      ${caixa("F", "votos a favor")}
      ${caixa("C", "votos contra")}
      ${caixa("A", "abstenções (não votou a favor nem contra)")}
      ${c.P ? caixa("P", "vezes presidindo a sessão (o registro oficial mostra “Presidente” no lugar do voto)") : ""}
    </div>
    <p class="fraco">Esses números são os do <a href="${esc(v.fonte)}">relatório oficial de votações de ${esc(nomeCurto())} em ${ANO}</a> (PDF da Câmara).
      Assuntos votados em dois turnos contam uma vez quando o voto foi igual nos dois, como no relatório oficial.</p>
    ${c.N ? `<p class="aviso"><strong>Voto não registrado: <button type="button" class="link numero-link" id="ver-nr">${n(c.N)}</button>.</strong>
      Nesses casos, o relatório da sessão mostra “NÃO REGISTRADO” no lugar do voto. Isso aparece principalmente em
      votações em bloco, quando vários pedidos são votados de uma vez. Não quer dizer que o vereador faltou: a presença
      está na seção acima. Esses casos não aparecem no relatório de votos do vereador; cada um tem link para o relatório da sessão.</p>` : ""}
    <div id="lista-votos">
      <button type="button" class="mais-itens" id="abrir-votos">Ver votação por votação</button>
    </div>`;
  const abrir = filtro => carregarVotos(v, filtro);
  el.querySelector("#abrir-votos").addEventListener("click", () => abrir("todos"));
  const nr = el.querySelector("#ver-nr");
  if (nr) nr.addEventListener("click", () => abrir("N"));
}

async function carregarVotos(v, filtroInicial) {
  const caixa = document.getElementById("lista-votos");
  caixa.innerHTML = `<p class="carregando">Carregando as votações…</p>`;
  try {
    MATERIAS[ANO] = MATERIAS[ANO] || await json(`dados/votacoes_${ANO}.json`);
  } catch (e) {
    caixa.innerHTML = `<p>Não foi possível carregar as votações. Tente de novo.</p>`;
    return;
  }
  const mats = MATERIAS[ANO];
  // cada item: [índice da matéria, voto (ou 1º turno), 2º turno?]
  // Mesma regra do relatório oficial: cada voto registrado diferente conta uma vez por matéria;
  // "não registrado" só entra quando não há nenhum voto registrado na matéria.
  const itens = v.lista.map(([i, ...cods]) => {
    const regs = new Set(cods.filter(c => c !== "N"));
    return { m: mats[i], cods, regs: regs.size ? regs : new Set(["N"]) };
  }).sort((a, b) => SESSOES[b.m.s].d.localeCompare(SESSOES[a.m.s].d));
  const cont = { todos: itens.length };
  for (const it of itens) for (const c of it.regs) cont[c] = (cont[c] || 0) + 1;
  const opcoes = [["todos", "Todas"], ["F", "A favor"], ["C", "Contra"], ["A", "Abstenção"], ["N", "Não registrado"], ["P", "Presidindo"]]
    .filter(([k]) => cont[k]);
  caixa.innerHTML = `
    <h3>Votação por votação em ${ANO}</h3>
    <label for="busca-votos" class="fraco">Procure por assunto, número ou nome</label>
    <input id="busca-votos" class="busca" type="search" placeholder="Ex.: lombada, IPTU, saúde, 0045" autocomplete="off">
    <div class="filtros" role="group" aria-label="Filtrar pelo voto">
      ${opcoes.map(([k, r]) => `<button type="button" data-f="${k}" aria-pressed="${k === filtroInicial}">${r} (${n(cont[k])})</button>`).join("")}
    </div>
    <p class="fraco" id="qtd-votos"></p>
    <ul class="itens"></ul>`;
  let filtro = filtroInicial;
  const ul = caixa.querySelector("ul");
  const busca = caixa.querySelector("#busca-votos");
  const aplicar = () => {
    const q = sem(busca.value).trim();
    const sel = itens.filter(it => (filtro === "todos" || it.regs.has(filtro)) &&
      (!q || sem(`${it.m.m} ${it.m.e} ${it.m.a}`).includes(q)));
    caixa.querySelector("#qtd-votos").textContent = `${n(sel.length)} votação(ões) nesta lista.`;
    ul.innerHTML = "";
    paginar(ul, sel, itemVoto);
  };
  caixa.querySelectorAll(".filtros button").forEach(b => b.addEventListener("click", () => {
    filtro = b.dataset.f;
    caixa.querySelectorAll(".filtros button").forEach(x => x.setAttribute("aria-pressed", x === b));
    aplicar();
  }));
  busca.addEventListener("input", aplicar);
  aplicar();
  caixa.scrollIntoView({ behavior: "smooth", block: "start" });
}

function itemVoto(it) {
  const m = it.m, s = SESSOES[m.s];
  const explica = explicaTitulo(m.m);
  const voto = it.cods.length > 1
    ? `1º turno: <span class="etiqueta">${esc(VOTO[it.cods[0]])}</span> · 2º turno: <span class="etiqueta">${esc(VOTO[it.cods[1]])}</span>`
    : `<span class="etiqueta">${esc(VOTO[it.cods[0]] || it.cods[0])}</span>`;
  return `<li class="item">
    <div class="data">${dataBR(s.d)} · ${esc(s.n)}</div>
    <div class="tit">${esc(m.m)}</div>
    ${explica ? `<div class="explica">${esc(explica)}</div>` : ""}
    ${m.e ? `<p class="texto">${esc(m.e)}</p>` : ""}
    ${m.a ? `<div class="meta">Autoria: ${esc(m.a)}</div>` : ""}
    <div class="meta">Resultado: ${esc(m.r || "não informado no relatório")}</div>
    <div>Voto de ${esc(nomeCurto())}: ${voto}</div>
    <div class="fonte"><a href="${esc(urlVotacaoSessao(s.d, m.p))}">Ver no documento oficial (PDF da votação da sessão${m.p > 1 ? `, página ${m.p}` : ""})</a></div>
  </li>`;
}

// ------------------------------------------------------------------ util
function paginar(ul, itens, render) {
  let mostrados = 0;
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "mais-itens";
  const mais = () => {
    const prox = itens.slice(mostrados, mostrados + POR_PAGINA);
    ul.insertAdjacentHTML("beforeend", prox.map(render).join(""));
    mostrados += prox.length;
    if (mostrados >= itens.length) btn.remove();
    else btn.textContent = `Mostrar mais (${n(itens.length - mostrados)} restantes)`;
  };
  btn.addEventListener("click", mais);
  ul.nextElementSibling?.classList?.contains("mais-itens") && ul.nextElementSibling.remove();
  ul.after(btn);
  mais();
  if (!itens.length) { btn.remove(); ul.innerHTML = `<li class="item">Nada encontrado.</li>`; }
}

// ------------------------------------------------------------------ lista de vereadores
// ------------------------------------------------------------------ como ler
let REGRA;
async function abrirComoLer(irParaRegra) {
  document.title = "Como ler este site — Vereadores de Sertãozinho";
  const main = document.getElementById("app");
  main.innerHTML = document.getElementById("tpl-como-ler").innerHTML;
  document.getElementById("tipos").innerHTML = "<ul>" + Object.values(TIPOS)
    .filter((t, i, a) => a.findIndex(x => x[0] === t[0]) === i)
    .map(([nome, txt]) => `<li><strong>${esc(nome)}:</strong> ${esc(txt)}</li>`).join("") + "</ul>";
  try {
    REGRA = REGRA || await json("dados/regra.json");
    const limpa = p => p.replace(/\b/g, "").replace(/\[\.\]/g, ".").trim();
    const bloco = (letra, titulo, lista) => `<details><summary><span class="titulo-grupo">Lista ${letra}: ${esc(titulo)}</span><span class="qtd">${lista.length}</span></summary>
      <div class="dentro"><p>${lista.map(p => `<code>${esc(limpa(p))}</code>`).join(", ")}</p></div></details>`;
    document.getElementById("listas").innerHTML =
      bloco("A", "homenagem, pesar, título, nome de rua, data comemorativa", REGRA.HOMENAGEM) +
      bloco("B", "andamento dos trabalhos da Câmara", REGRA.PROCEDIMENTO) +
      bloco("C", "obra, conserto ou serviço público", REGRA.MELHORIA) +
      bloco("D", "pedido de estudo", REGRA.PEDE_ESTUDO) +
      bloco("E", "lugares da cidade", REGRA.LUGAR) +
      bloco("F", "pedido de informação", REGRA.PERGUNTA);
    document.getElementById("tipos-pedido").innerHTML = "<ul>" + Object.values(REGRA.TIPOS_PEDIDO)
      .map(([rot, pals]) => `<li><strong>${esc(rot)}:</strong> ${pals.map(p => `<code>${esc(p)}</code>`).join(", ")}</li>`)
      .join("") + "</ul>";
  } catch (e) {
    document.getElementById("listas").textContent = "Não foi possível carregar as listas de palavras.";
    document.getElementById("tipos-pedido").textContent = "Não foi possível carregar a lista de tipos de pedido.";
  }
  if (irParaRegra) document.getElementById(irParaRegra === true ? "grupos" : irParaRegra).scrollIntoView({ block: "start" });
}

// ------------------------------------------------------------------ ruas e bairros
let BUSCA, REPET;
let ULTIMA_BUSCA = "";

async function carregaBusca() {
  if (!BUSCA) [BUSCA, REPET] = await Promise.all([json("dados/busca.json"), json("dados/repeticoes.json")]);
  if (!BUSCA._prep) {
    const nomes = Object.fromEntries(IDX.vereadores.map(v => [v.id, v.nome_politico || v.nome]));
    for (const it of BUSCA.itens) {
      it._autores = it.a.map(id => ({ id, n: nomes[id] || id }));
      it._busca = sem(`${it.e} ${it.r.concat(it.b).map(i => BUSCA.lugares[i].n).join(" ")}`);
      it._ord = it.d.slice(6) + it.d.slice(3, 5) + it.d.slice(0, 2);
      it._lugar = ["Requerimentos", "Indicacoes"].includes(it.tp) || it.r.length > 0 || it.b.length > 0;
    }
    for (const lg of BUSCA.lugares) lg._busca = sem(lg.n);
    BUSCA._prep = true;
  }
}

function autoresHTML(it) {
  const v = it._autores.map(a => `<a href="#v${encodeURIComponent(a.id)}">${esc(a.n)}</a>`);
  return v.concat(it.o.map(esc)).join(", ");
}

function itemPedido(it) {
  const tipo = TIPOS[it.tp];
  return `<li class="item">
    <div class="data">${esc(it.d)}</div>
    <div class="tit">${esc(it.t)}</div>
    ${tipo ? `<div class="explica">${esc(tipo[1])}</div>` : ""}
    ${textoComResumo(it.e)}
    <div class="meta">Assinado por: ${autoresHTML(it)}</div>
    ${it.s ? `<div class="meta">Situação: ${esc(it.s)}</div>` : ""}
    <div class="fonte"><a href="${esc(it.u)}">Ver documento oficial</a></div>
  </li>`;
}

const AVISO_REPETIDO = `<p class="aviso"><strong>Pedido repetido não prova que a Prefeitura ignorou o pedido.</strong>
  Pode ser que o pedido tenha sido atendido e o problema voltado; que cada pedido fale de um trecho diferente da mesma rua
  (avenidas longas aparecem muito); que a Prefeitura tenha respondido explicando o que pode ou não ser feito; ou que vereadores
  diferentes tenham pedido a mesma coisa. Veja a <strong>situação</strong> de cada pedido e o documento oficial.</p>`;

const INTRO_LUGARES = `<h1>Pedidos por rua ou bairro</h1>
  <p>Digite o nome de uma rua, avenida, praça ou bairro e veja o que os vereadores pediram para lá em 2025 e 2026, e quem pediu.</p>`;

async function abrirLugares() {
  document.title = "Pedidos por rua ou bairro — Vereadores de Sertãozinho";
  const main = document.getElementById("app");
  main.innerHTML = INTRO_LUGARES + `<p class="carregando">Carregando os pedidos…</p>`;
  try { await carregaBusca(); } catch (e) { main.querySelector(".carregando").textContent = "Não foi possível carregar os pedidos."; return; }
  const sugestoes = BUSCA.lugares.filter(l => l.q > 0).sort((a, b) => b.q - a.q).slice(0, 600);
  main.innerHTML = INTRO_LUGARES + `
    <label for="busca-lugar" class="fraco">Rua ou bairro</label>
    <input id="busca-lugar" class="busca" type="search" list="lista-lugares" placeholder="Ex.: Aléssio Mazer, Vila Garcia, Cruz das Posses" autocomplete="off">
    <datalist id="lista-lugares">${sugestoes.map(l => `<option value="${esc(l.n)}">`).join("")}</datalist>
    <p class="fraco">A busca procura o que você digitou no texto oficial de cada pedido, sem diferença de acento ou maiúsculas.
      As sugestões de nomes foram lidas automaticamente do texto e podem ter erros.
      <a href="#regra-lugares">Como funciona</a>.</p>
    <p><a href="#repetidos">Ver os pedidos que se repetem para a mesma rua</a></p>
    <div id="res-lugar"></div>`;
  const inp = document.getElementById("busca-lugar");
  let t;
  inp.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => mostraLugar(inp.value), 250); });
  inp.value = ULTIMA_BUSCA;
  mostraLugar(ULTIMA_BUSCA);
}

function mostraLugar(texto) {
  ULTIMA_BUSCA = texto;
  const caixa = document.getElementById("res-lugar");
  const q = sem(texto).trim();
  if (q.length > 0 && q.length < 3) {
    caixa.innerHTML = `<p class="fraco">Continue digitando: são precisas pelo menos 3 letras.</p>`;
    return;
  }
  const cidade = !q;
  const base = BUSCA.itens.filter(it => it._lugar);
  const achados = (cidade ? base : base.filter(it => it._busca.includes(q))).sort((a, b) => b._ord.localeCompare(a._ord));
  if (!achados.length) {
    caixa.innerHTML = `<p>Nenhum pedido encontrado com “${esc(texto)}”. Tente só uma parte do nome (por exemplo, só o sobrenome).</p>`;
    return;
  }
  const quem = {}, temas = {};
  for (const it of achados) {
    for (const a of it.a) quem[a] = (quem[a] || 0) + 1;
    for (const k of it.k) temas[k] = (temas[k] || 0) + 1;
  }
  const topTemas = Object.entries(temas).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const reps = cidade ? [] : REPET.filter(r => BUSCA.lugares[r.r]._busca.includes(q));
  const bairros = cidade ? BUSCA.lugares.filter(l => l.t === "bairro").sort((a, b) => b.q - a.q).slice(0, 10) : [];
  caixa.innerHTML = `
    <div class="painel">
      <p class="grande"><b>${n(achados.length)}</b> ${cidade ? "pedidos para a cidade inteira desde 2025" : `${achados.length === 1 ? "pedido cita" : "pedidos citam"} “${esc(texto)}”`}</p>
      <div class="duas">
        <div><h3>${cidade ? "Quem mais pediu" : "Quem mais pediu aqui"}</h3>${ranking(quem, 5)}
          <p class="fraco">Um pedido pode ter sido assinado por mais de um vereador.</p></div>
        ${topTemas.length ? `<div><h3>O que mais pedem${cidade ? "" : " aqui"}</h3>
          <ul class="temas-lista">${topTemas.map(([k, v]) => `<li><span>${esc(BUSCA.tipos_pedido[k] || k)}</span><b>${n(v)}</b></li>`).join("")}</ul>
          <p class="fraco">Assunto lido automaticamente no texto. Um pedido pode tratar de mais de um assunto.</p></div>` : ""}
        ${bairros.length ? `<div><h3>Bairros mais citados</h3><div class="filtros">${bairros.map(l =>
          `<button type="button" data-lugar="${esc(l.n)}">${esc(l.n)} (${n(l.q)})</button>`).join("")}</div></div>` : ""}
      </div>
    </div>
    ${reps.length ? `<h3>Pedidos que se repetem aqui</h3>${AVISO_REPETIDO}${reps.map(casoRepetido).join("")}` : ""}
    <h3>${cidade ? "Os pedidos mais recentes" : "Todos os pedidos encontrados"}</h3>
    <ul class="itens"></ul>`;
  caixa.querySelectorAll("[data-lugar]").forEach(b => b.addEventListener("click", () => {
    const inp = document.getElementById("busca-lugar");
    inp.value = b.dataset.lugar;
    mostraLugar(b.dataset.lugar);
    inp.scrollIntoView({ block: "start" });
  }));
  paginar(caixa.querySelector("ul.itens"), achados, itemPedido);
}

function casoRepetido(r) {
  const its = r.i.map(i => BUSCA.itens[i]);
  return `<details>
    <summary><span><span class="titulo-grupo">${esc(BUSCA.lugares[r.r].n)}</span>
      <small>${esc(BUSCA.tipos_pedido[r.k])} · de ${esc(its[0].d)} a ${esc(its[its.length - 1].d)}</small></span>
      <span class="qtd">${its.length} pedidos</span></summary>
    <div class="dentro">${caixaCobre(r)}<p class="h3">Os ${its.length} pedidos</p><ul class="itens">${its.map(itemPedido).join("")}</ul></div>
  </details>`;
}

async function abrirRepetidos() {
  document.title = "Pedidos repetidos para a mesma rua — Vereadores de Sertãozinho";
  const main = document.getElementById("app");
  main.innerHTML = `<h1>Pedidos repetidos para a mesma rua</h1><p class="carregando">Carregando…</p>`;
  try { await carregaBusca(); } catch (e) { main.querySelector(".carregando").textContent = "Não foi possível carregar os pedidos."; return; }
  const porTipo = {};
  for (const r of REPET) porTipo[r.k] = (porTipo[r.k] || 0) + 1;
  main.innerHTML = `<h1>Pedidos repetidos para a mesma rua</h1>
    <p>Aqui estão os casos em que o <strong>mesmo tipo de pedido</strong> (por exemplo, lombada) foi feito
      <strong>duas vezes ou mais para a mesma rua</strong>, em requerimentos e indicações de 2025 e 2026.
      Toque em um caso para ver as datas, quem pediu e cada documento oficial.</p>
    ${AVISO_REPETIDO}
    <p class="fraco">A rua e o tipo de pedido foram lidos automaticamente do texto oficial e podem ter erros.
      <a href="#regra-lugares">Como funciona</a>.</p>
    <label for="filtro-rua" class="fraco">Filtrar por rua</label>
    <input id="filtro-rua" class="busca" type="search" placeholder="Ex.: Aléssio Mazer" autocomplete="off">
    <div class="filtros" role="group" aria-label="Tipo de pedido">
      <button type="button" data-k="" aria-pressed="true">Todos (${n(REPET.length)})</button>
      ${Object.entries(BUSCA.tipos_pedido).filter(([k]) => porTipo[k])
        .map(([k, rot]) => `<button type="button" data-k="${k}" aria-pressed="false">${esc(rot)} (${n(porTipo[k])})</button>`).join("")}
    </div>
    <p class="fraco" id="qtd-rep"></p>
    <div id="lista-rep"></div>
    <button type="button" class="mais-itens" id="mais-rep" hidden></button>`;
  let k = "", sel = [], mostrados = 0;
  const inp = document.getElementById("filtro-rua");
  const caixa = document.getElementById("lista-rep");
  const btn = document.getElementById("mais-rep");
  const mais = () => {
    caixa.insertAdjacentHTML("beforeend", sel.slice(mostrados, mostrados + POR_PAGINA).map(casoRepetido).join(""));
    mostrados += POR_PAGINA;
    btn.hidden = mostrados >= sel.length;
    btn.textContent = `Mostrar mais (${n(Math.max(0, sel.length - mostrados))} restantes)`;
  };
  const aplica = () => {
    const q = sem(inp.value).trim();
    sel = REPET.filter(r => (!k || r.k === k) && (!q || BUSCA.lugares[r.r]._busca.includes(q)));
    document.getElementById("qtd-rep").textContent = `${n(sel.length)} caso(s).`;
    caixa.innerHTML = ""; mostrados = 0; mais();
  };
  btn.addEventListener("click", mais);
  main.querySelectorAll(".filtros button").forEach(b => b.addEventListener("click", () => {
    k = b.dataset.k;
    main.querySelectorAll(".filtros button").forEach(x => x.setAttribute("aria-pressed", x === b));
    aplica();
  }));
  inp.addEventListener("input", aplica);
  aplica();
}

// ------------------------------------------------------------------ peças comuns (v3)
const COR_GRUPO = { melhoria: "g-b", pergunta: "g-c", homenagem: "g-h", lei: "g-l", outros: "g-o" };
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
let TIMER = null;

function nomeDe(id) {
  const v = IDX.vereadores.find(x => x.id === id);
  return v ? (v.nome_politico || v.nome) : id;
}

// Resumo automático: tira o começo burocrático ("Requer informações do Executivo Municipal sobre a
// possibilidade de serem realizados estudos objetivando...") e deixa o pedido em si. O texto oficial
// continua aparecendo logo abaixo.
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

function textoComResumo(t) {
  const r = resumo(t);
  return r ? `<p class="resumo">${esc(r)}</p><p class="oficial"><span>Texto oficial:</span> ${esc(t)}</p>`
           : `<p class="texto">${esc(t)}</p>`;
}

// anel de presença: presente (escuro), falta justificada (amarelo), ausente sem justificativa (vermelho)
function anel(t, fonte) {
  const tot = t.total || 1, C = 2 * Math.PI * 30;
  const seg = (v, cor, off) => v ? `<circle cx="38" cy="38" r="30" fill="none" stroke="${cor}" stroke-width="9"
    stroke-dasharray="${v / tot * C} ${C}" stroke-dashoffset="${-off / tot * C}" transform="rotate(-90 38 38)"/>` : "";
  const pct = Math.round(t.presente / tot * 100);
  return `<a class="anel" href="${esc(fonte)}" aria-label="${t.presente} presenças em ${t.total} sessões (${pct}%)">
    <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="30" fill="none" stroke="#eef1f4" stroke-width="9"/>
    ${seg(t.presente, "#0f1720", 0)}${seg(t.justificada, "#e0a23a", t.presente)}${seg(t.ausente, "#d23a2e", t.presente + t.justificada)}</svg>
    <b>${pct}%</b></a>`;
}

function situacaoTSE(t) {
  const s = String(t || "").toLowerCase().replace(/qp/, "QP (quociente partidário)");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function caixaMandato() {
  const s = IDX.salario, tse = V.tse, c = V.contato;
  const blocos = [];
  if (s) blocos.push(`<div class="numero"><a href="${esc(s.pagina)}">R$ ${esc(s.valor)}</a>
    <span>subsídio (salário bruto) por mês, igual para todos os vereadores</span></div>`);
  if (tse) blocos.push(`<div class="numero"><a href="${esc(tse.fonte)}">${n(tse.votos_nominais)}</a>
    <span>votos na eleição de 2024 · ${esc(situacaoTSE(tse.situacao))}</span></div>`);
  let html = blocos.length ? `<div class="numeros">${blocos.join("")}</div>` : "";
  if (s) html += `<p class="fraco">O valor do subsídio está no <a href="${esc(s.pagina)}">${esc(s.documento.replace(/\s\d\d\/\d\d\/\d{4}.*$/, ""))}</a> da Câmara.
    Os votos vêm dos <a href="${esc(tse ? tse.fonte : "https://dadosabertos.tse.jus.br/dataset/resultados-2024")}">dados abertos do TSE</a>${tse ? ` (arquivo gerado em ${esc(tse.gerado_em)})` : ""}.</p>`;
  if (tse && tse.cassacao && !tse.cassacao.startsWith("#")) {
    html += `<p class="aviso">Nos dados abertos do TSE, esta candidatura aparece com situação de cassação “${esc(tse.cassacao)}”,
      votos com destinação “${esc(tse.destinacao_votos)}” (${n(tse.votos_nominais)} votos nominais, ${n(tse.votos_validos)} válidos)
      e resultado “${esc(tse.situacao)}”.</p>`;
  }
  if (c && (c.email || c.celular || c.telefone)) {
    const tel = x => `<a href="tel:+55${esc(x.replace(/\D/g, ""))}">${esc(x)}</a>`;
    html += `<p class="contato"><strong>Contato publicado no <a href="${esc(V.perfil)}">perfil oficial</a>:</strong>
      ${[c.email ? `e-mail <a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : "",
         c.celular ? `celular ${tel(c.celular)}` : "", c.telefone ? `telefone ${tel(c.telefone)}` : ""].filter(Boolean).join(" · ")}</p>`;
  }
  return html ? `<section class="mandato"><h2>Mandato</h2>${html}</section>` : "";
}

// abre um grupo de propostas com filtros por assunto (temas) e paginação
function abreGrupo(caixa, itens, render, temasDe) {
  const filtros = caixa.querySelector(".filtros.temas");
  const ul = caixa.querySelector("ul.itens");
  const cont = {};
  for (const it of itens) for (const k of temasDe(it) || []) cont[k] = (cont[k] || 0) + 1;
  const temas = Object.entries(cont).sort((a, b) => b[1] - a[1]);
  let atual = "";
  const desenha = () => { ul.innerHTML = ""; paginar(ul, atual ? itens.filter(it => (temasDe(it) || []).includes(atual)) : itens, render); };
  if (filtros && temas.length > 1) {
    filtros.innerHTML = `<button type="button" data-t="" aria-pressed="true">Tudo (${n(itens.length)})</button>` +
      temas.map(([k, q]) => `<button type="button" data-t="${k}" aria-pressed="false">${esc(IDX.temas[k] || k)} (${n(q)})</button>`).join("");
    filtros.addEventListener("click", e => {
      const b = e.target.closest("[data-t]"); if (!b) return;
      atual = b.dataset.t;
      filtros.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
      desenha();
    });
  }
  desenha();
}

// barras de "quem mais pediu"
function ranking(cont, limite) {
  const lista = Object.entries(cont).sort((a, b) => b[1] - a[1] || nomeDe(a[0]).localeCompare(nomeDe(b[0])));
  if (!lista.length) return "";
  const mx = lista[0][1];
  const linha = ([id, q]) => `<li><a href="#v${encodeURIComponent(id)}">${esc(nomeDe(id))}</a><b>${n(q)}</b>
    <span class="barra"><i style="width:${q / mx * 100}%"></i></span></li>`;
  return `<ol class="rank">${lista.slice(0, limite).map(linha).join("")}</ol>` +
    (lista.length > limite ? `<details class="mais-rank"><summary>Ver os outros ${lista.length - limite}</summary>
      <ol class="rank" start="${limite + 1}">${lista.slice(limite).map(linha).join("")}</ol></details>` : "");
}

// ------------------------------------------------------------------ página inicial (v3)
const ORDENS = {
  nome: ["Nome (A–Z)", null],
  faltas: ["Quem mais faltou", v => v.r.pres_ausente * 1000 + v.r.pres_justificada],
  l: ["Mais propostas de lei", v => v.r.g_lei],
  h: ["Mais homenagens", v => v.r.g_homenagem],
  b: ["Mais pedidos para os bairros", v => v.r.g_melhoria],
  nao: ["Quem mais votou “não” ou se absteve", v => v.r.voto_C + v.r.voto_A],
};
let ORDEM = "nome", PARTIDO = "";

function metrica(v) {
  const r = v.r;
  if (ORDEM === "faltas") return `${n(r.pres_ausente)} ${r.pres_ausente === 1 ? "falta" : "faltas"} sem justificativa registrada e ${n(r.pres_justificada)} ${r.pres_justificada === 1 ? "justificada" : "justificadas"}, em ${n(r.pres_total)} sessões`;
  if (ORDEM === "l") return `${n(r.g_lei)} ${r.g_lei === 1 ? "proposta de lei" : "propostas de lei"}`;
  if (ORDEM === "h") return `${n(r.g_homenagem)} ${r.g_homenagem === 1 ? "homenagem" : "homenagens"}`;
  if (ORDEM === "b") return `${n(r.g_melhoria)} ${r.g_melhoria === 1 ? "pedido" : "pedidos"} de melhoria nos bairros`;
  if (ORDEM === "nao") return `votou contra ${n(r.voto_C)} ${r.voto_C === 1 ? "vez" : "vezes"} e se absteve ${n(r.voto_A)} ${r.voto_A === 1 ? "vez" : "vezes"}`;
  return "";
}

function abrirLista() {
  document.title = "O que fazem os vereadores de Sertãozinho";
  const main = document.getElementById("app");
  main.innerHTML = document.getElementById("tpl-lista").innerHTML;
  heroi();
  const partidos = {};
  for (const v of IDX.vereadores) partidos[v.partido] = (partidos[v.partido] || 0) + 1;
  document.getElementById("partido").innerHTML = `<option value="">Todos</option>` +
    Object.keys(partidos).sort((a, b) => a.localeCompare(b, "pt")).map(p => `<option value="${esc(p)}">${esc(p)} (${partidos[p]})</option>`).join("");
  document.getElementById("ordem").innerHTML = Object.entries(ORDENS).map(([k, [rot]]) => `<option value="${k}">${esc(rot)}</option>`).join("");
  document.getElementById("partido").value = PARTIDO;
  document.getElementById("ordem").value = ORDEM;
  const desenhaLista = () => {
    const q = sem(document.getElementById("busca").value).trim();
    PARTIDO = document.getElementById("partido").value;
    ORDEM = document.getElementById("ordem").value;
    const f = ORDENS[ORDEM][1];
    const L = IDX.vereadores.filter(v => (!PARTIDO || v.partido === PARTIDO) && (!q || sem(`${v.nome_politico} ${v.nome} ${v.partido}`).includes(q)))
      .sort((a, b) => (f ? f(b) - f(a) : 0) || (a.nome_politico || a.nome).localeCompare(b.nome_politico || b.nome, "pt"));
    document.getElementById("lista").innerHTML = L.map(v => `
      <li class="cartao"><a href="#v${encodeURIComponent(v.id)}">${foto(v)}<span>
        <span class="nomep">${esc(v.nome_politico || v.nome)}</span>
        <span class="fraco">${esc(v.nome)} · ${esc(v.partido)}</span>
        ${v.mesa ? `<span class="pill">${esc(v.mesa)} da Câmara</span>` : ""}
        ${v.em_exercicio ? "" : `<span class="fraco" style="display:block">Exerceu o mandato em parte do período (sessões de ${esc(v.primeira_sessao)} a ${esc(v.ultima_sessao)})</span>`}
        ${ORDEM !== "nome" ? `<span class="metrica">${esc(metrica(v))}</span>` : ""}
      </span></a></li>`).join("");
    document.getElementById("nada").hidden = L.length > 0;
    document.getElementById("conta").textContent = L.length === IDX.vereadores.length
      ? `Mostrando os ${L.length} vereadores.` : `Mostrando ${L.length} de ${IDX.vereadores.length} vereadores.`;
  };
  ["busca", "partido", "ordem"].forEach(id => document.getElementById(id).addEventListener("input", desenhaLista));
  desenhaLista();
}

function heroi() {
  const h = document.getElementById("heroi");
  if (!h) return;
  const s = IDX.salario, gt = IDX.grupos_total || {}, u = IDX.unanimidade;
  const total = Object.values(gt).reduce((a, b) => a + b, 0);
  const ger = new Date(IDX.gerado_em.replace(/([+-]\d\d)(\d\d)$/, "$1:$2"));
  let html = "";
  if (s) {
    const mensal = Number(s.valor.replace(/\./g, "").replace(",", "."));
    html += `<div class="medidor"><span class="ml">Salário pago aos ${IDX.cadeiras} vereadores desde a posse</span>
      <b class="mv" id="tique">R$ 0</b>
      <span class="ms">e subindo agora · estimativa: ${IDX.cadeiras} subsídios de <a href="${esc(s.pagina)}">R$ ${esc(s.valor)}</a> por mês
        desde 1º de janeiro de 2025, proporcional ao tempo; valor bruto, sem 13º nem outros pagamentos.</span></div>`;
    const posse = new Date(IDX.posse + "T00:00:00-03:00").getTime();
    const porMs = IDX.cadeiras * mensal * 12 / (365.25 * 864e5);
    const tique = () => { const el = document.getElementById("tique"); if (el) el.textContent = brl.format((Date.now() - posse) * porMs); };
    clearInterval(TIMER); tique();
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) TIMER = setInterval(tique, 150);
  }
  html += `<div class="stats">
    <a class="stat" href="#propostas"><b>${n(total)}</b><span>propostas dos vereadores desde 2025</span></a>
    <a class="stat g-b" href="#propostas-melhoria"><b>${n(gt.melhoria || 0)}</b><span>pedidos de melhoria nos bairros</span></a>
    <a class="stat g-h" href="#propostas-homenagem"><b>${n(gt.homenagem || 0)}</b><span>homenagens</span></a>
    <a class="stat g-l" href="#propostas-lei"><b>${n(gt.lei || 0)}</b><span>propostas de lei</span></a></div>`;
  if (u && u.total) html += `<p>Em <strong>${Math.floor(u.iguais / u.total * 100)} de cada 100 votações</strong> desde 2025, todos os vereadores que votaram
    votaram igual (${n(u.iguais)} de ${n(u.total)}). <a href="#conferencia">Como é calculado</a>.</p>`;
  html += `<p class="fraco">Dados conferidos em ${ger.toLocaleDateString("pt-BR")} às ${ger.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })},
    até a sessão de ${esc(IDX.ultima_sessao)}.</p>`;
  h.innerHTML = html;
}

// ------------------------------------------------------------------ propostas da cidade (v3)
async function abrirPropostasCidade(g) {
  document.title = "O que os vereadores propuseram — Sertãozinho";
  const main = document.getElementById("app");
  main.innerHTML = `<h1>O que os vereadores propuseram</h1><p class="carregando">Carregando…</p>`;
  try { await carregaBusca(); } catch (e) { main.querySelector(".carregando").textContent = "Não foi possível carregar as propostas."; return; }
  const gt = {};
  for (const it of BUSCA.itens) gt[it.g] = (gt[it.g] || 0) + 1;
  const total = BUSCA.itens.length;
  main.innerHTML = `<h1>O que os vereadores propuseram</h1>
    <p>Desde 2025, os vereadores assinaram <strong>${n(total)} propostas</strong>. Toque em um grupo para ler uma por uma.
      Os grupos seguem a <a href="#regra">mesma regra para todos</a>.</p>
    <div class="divisao" role="img" aria-label="Divisão das propostas por grupo">${ORDEM_GRUPOS.map(k => `<i class="${COR_GRUPO[k]}" style="flex:${gt[k] || 0} 1 0"></i>`).join("")}</div>
    <div class="grupos-cidade">${ORDEM_GRUPOS.map(k => `<a class="grupo-cidade ${COR_GRUPO[k]}" href="#propostas-${k}" aria-current="${k === g}">
      <b>${n(gt[k] || 0)}</b><span class="gn">${esc(IDX.grupos[k])}</span><span class="gd">${esc(DESCR_GRUPO[k])}</span></a>`).join("")}</div>
    <div id="lista-grupo"></div>`;
  if (!g) return;
  const itens = BUSCA.itens.filter(it => it.g === g).sort((a, b) => b._ord.localeCompare(a._ord));
  const caixa = document.getElementById("lista-grupo");
  caixa.innerHTML = `<h2>${esc(IDX.grupos[g])}: ${n(itens.length)}</h2><div class="filtros temas"></div><ul class="itens"></ul>`;
  abreGrupo(caixa, itens, itemPedido, it => it.k);
  caixa.scrollIntoView({ block: "start" });
}

// ------------------------------------------------------------------ "Cobre uma resposta" (v3)
function caixaCobre(r) {
  const its = r.i.map(i => BUSCA.itens[i]);
  const cont = {};
  for (const it of its) for (const a of it.a) cont[a] = (cont[a] || 0) + 1;
  const quem = Object.entries(cont).filter(([id]) => (IDX.vereadores.find(v => v.id === id) || {}).contato)
    .sort((a, b) => b[1] - a[1]);
  if (!quem.length) return "";
  const rua = BUSCA.lugares[r.r].n, tema = (BUSCA.tipos_pedido[r.k] || "melhoria").toLowerCase();
  const d0 = its[0].d, mesAno = d => `${MESES[+d.slice(3, 5) - 1]} de ${d.slice(6)}`;
  const site = /^https?:/.test(location.protocol) && !/claude/.test(location.hostname) ? `${location.origin}${location.pathname}#repetidos` : "";
  const msg = id => `Olá, ${nomeDe(id)}. Moro em Sertãozinho. A Câmara já recebeu ${its.length} pedidos sobre ${tema} para a ${rua}, desde ${mesAno(d0)}. ` +
    `${cont[id] === 1 ? "Um deles saiu" : `${cont[id]} deles saíram`} do seu gabinete. O que a Prefeitura respondeu? O que ainda dá para fazer?` +
    (site ? `\n\nFonte: ${site}` : "");
  const uid = "c" + Math.random().toString(36).slice(2, 8);
  setTimeout(() => {
    const sel = document.getElementById(uid + "v"), ta = document.getElementById(uid + "t"), acts = document.getElementById(uid + "a");
    if (!sel) return;
    const links = () => {
      const v = IDX.vereadores.find(x => x.id === sel.value), c = v.contato || {}, t = encodeURIComponent(ta.value);
      acts.innerHTML = (c.email ? `<a class="botao" href="mailto:${esc(c.email)}?subject=${encodeURIComponent(rua + ": pedidos sobre " + tema)}&body=${t}">Enviar por e-mail</a>` : "") +
        `<a class="botao verde" href="https://wa.me/?text=${t}">Mandar no WhatsApp (grupo do bairro)</a>
         <button type="button" class="botao claro">Copiar mensagem</button>
         <span class="fraco">${c.email ? `E-mail oficial: <strong>${esc(c.email)}</strong>` : ""}${c.celular ? ` · Celular publicado no perfil: <strong>${esc(c.celular)}</strong>` : ""}${c.telefone ? ` · Telefone: <strong>${esc(c.telefone)}</strong>` : ""}</span>`;
      acts.querySelector("button").onclick = async e => {
        try { await navigator.clipboard.writeText(ta.value); e.target.textContent = "Copiado"; }
        catch (_) { ta.focus(); ta.select(); e.target.textContent = "Texto selecionado: copie com o dedo"; }
      };
    };
    const preenche = () => { ta.value = msg(sel.value); links(); };
    sel.addEventListener("change", preenche); ta.addEventListener("input", links); preenche();
  }, 0);
  return `<div class="cobre"><h4>Cobre uma resposta</h4>
    <p class="fraco">A mensagem já vem pronta. Escolha o vereador, ajuste o texto se quiser e envie.</p>
    <label class="fraco" for="${uid}v">Para quem</label>
    <select id="${uid}v" class="busca">${quem.map(([id, q]) => `<option value="${esc(id)}">${esc(nomeDe(id))} (${q} ${q === 1 ? "pedido" : "pedidos"} para esta rua)</option>`).join("")}</select>
    <label class="fraco" for="${uid}t">Mensagem</label>
    <textarea id="${uid}t" class="busca" rows="6"></textarea>
    <div class="acoes" id="${uid}a"></div></div>`;
}

// ------------------------------------------------------------------ roteador (#...)
async function rota() {
  clearInterval(TIMER);
  const h = decodeURIComponent(location.hash.slice(1));
  const m = h.match(/^v(\d+)(?:-(\d{4}))?$/);
  const mesmoVereador = m && V && V.id === m[1] && document.querySelector(".cabeca");
  if (m) await abrirVereador(m[1], Number(m[2]) || 0);
  else if (h === "como-ler") await abrirComoLer(false);
  else if (h === "regra") await abrirComoLer(true);
  else if (h === "regra-lugares") await abrirComoLer("regra-lugares");
  else if (h === "conferencia") await abrirComoLer("conferencia");
  else if (h === "lugares") await abrirLugares();
  else if (h === "repetidos") await abrirRepetidos();
  else if (h === "propostas") await abrirPropostasCidade("");
  else if (h.startsWith("propostas-")) await abrirPropostasCidade(h.slice(10));
  else abrirLista();
  if (!mesmoVereador && !["regra", "regra-lugares", "conferencia"].includes(h) && !h.startsWith("propostas-")) window.scrollTo(0, 0);
}

(async () => {
  try {
    [IDX, SESSOES] = await Promise.all([json("dados/indice.json"), json("dados/sessoes.json")]);
  } catch (e) {
    document.getElementById("app").innerHTML = "<p>Não foi possível carregar os dados. Tente recarregar a página.</p>";
    return;
  }
  rodape(IDX.ultima_sessao);
  window.addEventListener("hashchange", rota);
  rota();
})();
