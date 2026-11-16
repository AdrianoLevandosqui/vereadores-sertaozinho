// Funções e textos usados em todas as páginas.
"use strict";

const BASE = "https://www.camarasertaozinho.sp.gov.br";

const VOTO = {
  F: "A favor",
  C: "Contra",
  A: "Abstenção",
  N: "Voto não registrado",
  P: "Presidindo a sessão",
  X: "Ausente",
};

const PRESENCA = { P: "Presente", A: "Ausente (sem justificativa registrada)", J: "Falta justificada" };

// Tipos de documento em palavras simples (slug usado nas URLs da Câmara)
const TIPOS = {
  "Requerimentos": ["Requerimentos", "Pedidos formais do vereador: de informações, de estudo de uma melhoria, de urgência para votar um projeto etc."],
  "Indicacoes": ["Indicações", "Sugestões enviadas à Prefeitura. Quem decide se faz é a Prefeitura."],
  "Mocoes": ["Moções", "Mensagens oficiais da Câmara: aplausos, homenagens, pesar pelo falecimento de alguém, apoio ou protesto."],
  "Projetos-de-Lei": ["Projetos de lei", "Propostas de novas leis da cidade (inclui dar nome a ruas e praças)."],
  "Projetos-de-Lei-Complementar": ["Projetos de lei complementar", "Tipo especial de lei, exigido para alguns temas, como impostos e planos da cidade."],
  "Propostas-de-Emenda-a-LOM": ["Propostas de mudança na Lei Orgânica", "A Lei Orgânica é a lei principal da cidade, como uma constituição do município."],
  "Projetos-de-Decreto-Legislativo": ["Projetos de decreto legislativo", "Decisões da própria Câmara. Aqui são usados principalmente para dar títulos de cidadão e medalhas."],
  "Projetos-de-Resolucao": ["Projetos de resolução", "Decisões sobre o funcionamento da própria Câmara, como criar uma comissão."],
  "Emendas": ["Emendas", "Pedidos de mudança no texto de um projeto que a Câmara está analisando."],
  "Subemendas": ["Subemendas", "Pedidos de mudança em uma emenda."],
  "Substitutivos": ["Substitutivos", "Um texto novo para substituir um projeto inteiro."],
  "Emendas-a-LOA": ["Emendas ao orçamento", "Indicam dinheiro do orçamento da cidade para uma entidade ou área."],
  "Emenda-Impositiva-": ["Emendas impositivas (orçamento)", "Indicam dinheiro do orçamento da cidade para uma entidade ou área."],
  "Anteprojetos": ["Anteprojetos", "Sugestões de projeto de lei enviadas à Prefeitura."],
};

// Explicação curta a partir do título oficial de uma matéria votada
const EXPLICA_TITULO = [
  [/pedido de vista/i, "Pedido de mais tempo para analisar um assunto antes de votar."],
  [/^requerimento de retirada/i, "Pedido para retirar um documento da pauta."],
  [/^requerimento/i, "Requerimento: pedido formal de um vereador."],
  [/^indica/i, "Indicação: sugestão enviada à Prefeitura."],
  [/^mo[çc][ãa]o/i, "Moção: mensagem oficial da Câmara (homenagem, pesar, apoio ou protesto)."],
  [/^projeto de lei complementar/i, "Projeto de lei complementar: tipo especial de lei."],
  [/^projeto de lei/i, "Projeto de lei: proposta de nova lei da cidade."],
  [/^projeto de decreto legislativo/i, "Projeto de decreto legislativo: decisão da Câmara (em geral títulos e honrarias)."],
  [/^projeto de resolu/i, "Projeto de resolução: regra sobre o funcionamento da Câmara."],
  [/^proposta de emenda/i, "Mudança na Lei Orgânica, a lei principal da cidade."],
  [/^(sub)?emenda/i, "Emenda: pedido de mudança no texto de um projeto."],
  [/^veto/i, "Veto: o Prefeito barrou uma lei aprovada. A Câmara vota se mantém ou derruba o veto."],
  [/^parecer/i, "Parecer: opinião técnica sobre um assunto."],
];

function explicaTitulo(t) {
  for (const [re, txt] of EXPLICA_TITULO) if (re.test(t)) return txt;
  return "";
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

async function json(caminho) {
  const r = await fetch(caminho);
  if (!r.ok) throw new Error(`Não foi possível carregar ${caminho}`);
  return r.json();
}

function dataBR(dh) { return `${dh.slice(8, 10)}/${dh.slice(5, 7)}/${dh.slice(0, 4)}`; }

function urlPresencaSessao(dh) {
  return `${BASE}/softcam/pautas_presenca_print_pdf.php?data=${encodeURIComponent(dh)}`;
}
function urlVotacaoSessao(dh, pagina) {
  return `${BASE}/softcam/votacao_print_pdf.php?data=${encodeURIComponent(dh)}` + (pagina > 1 ? `#page=${pagina}` : "");
}

function iniciais(nome) {
  return nome.split(/\s+/).filter(p => p.length > 2).slice(0, 2).map(p => p[0]).join("").toUpperCase();
}

function foto(v, grande) {
  const cls = "foto" + (grande ? " foto-grande" : "");
  if (!v.foto) return `<span class="${cls}" aria-hidden="true">${esc(iniciais(v.nome))}</span>`;
  return `<img class="${cls}" src="${esc(v.foto)}" alt="Foto de ${esc(v.nome_politico || v.nome)}" loading="lazy" width="${grande ? 96 : 60}" height="${grande ? 96 : 60}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'${cls}',textContent:'${esc(iniciais(v.nome))}'}))">`;
}

function n(x) { return Number(x).toLocaleString("pt-BR"); }

function rodape(ultima) {
  const f = document.querySelector("footer");
  if (!f) return;
  f.innerHTML = `
    <p><strong>Este não é o site oficial da Câmara.</strong> É um site independente que reúne dados públicos
    publicados pela <a href="${BASE}/">Câmara Municipal de Sertãozinho</a>. Todo número tem um link para o documento oficial de onde saiu.</p>
    <p>Dados até a sessão de ${esc(ultima)}. O site não dá notas nem opiniões: só mostra o que está nos registros oficiais.
    <a href="#como-ler">Como ler este site</a>.</p>`;
}
