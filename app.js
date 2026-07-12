import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getFirestore, doc, onSnapshot, setDoc, serverTimestamp,
  collection, query, orderBy, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const configured = firebaseConfig.apiKey !== "SUA_API_KEY";
let db = null;
if (configured) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} else {
  document.getElementById("config-warn").classList.remove("hidden");
  document.getElementById("loading").classList.add("hidden");
}

// Documento único de configuração que o app do cliente também lê.
const CONFIG_REF = db ? doc(db, "config", "status") : null;
const AGENDA_COL = db ? collection(db, "agendamentos") : null;

// Estado local do painel
const state = {
  open: false,
  onBreak: false,
  pixKey: "",
  prices: { corte: 40, barba: 25, barba_corte: 55, sobrancelha: 15 },
  plans:  { corte: 120, completo: 180 },
  taxaDeslocamento: 0,
};

// Elementos
const loadingEl = document.getElementById("loading");
const panelEl = document.getElementById("panel");
const agendaEl = document.getElementById("agenda");
const saveStatusEl = document.getElementById("save-status");
const pageTitleEl = document.getElementById("page-title");

const toggleOpen = document.getElementById("toggle-open");
const openName = document.getElementById("open-name");
const openDesc = document.getElementById("open-desc");

const toggleBreak = document.getElementById("toggle-break");
const breakName = document.getElementById("break-name");
const breakDesc = document.getElementById("break-desc");

const inPix   = document.getElementById("in-pix");
const inTaxa  = document.getElementById("in-taxa");
const pCorte  = document.getElementById("price-corte");
const pBarba  = document.getElementById("price-barba");
const pBC     = document.getElementById("price-barba_corte");
const pSobr   = document.getElementById("price-sobrancelha");
const planC   = document.getElementById("plan-corte");
const planF   = document.getElementById("plan-completo");

// Abas
const tabConfig = document.getElementById("tab-config");
const tabAgenda = document.getElementById("tab-agenda");
const agendaList = document.getElementById("agenda-list");
const agendaLoading = document.getElementById("agenda-loading");
const agendaEmpty = document.getElementById("agenda-empty");

function switchTab(which) {
  const isAgenda = which === "agenda";
  tabConfig.classList.toggle("active", !isAgenda);
  tabAgenda.classList.toggle("active", isAgenda);
  tabConfig.setAttribute("aria-selected", String(!isAgenda));
  tabAgenda.setAttribute("aria-selected", String(isAgenda));
  panelEl.classList.toggle("hidden", isAgenda);
  agendaEl.classList.toggle("hidden", !isAgenda);
  loadingEl.classList.add("hidden");
  pageTitleEl.textContent = isAgenda ? "Agendamentos" : "Configurações";
}
tabConfig.addEventListener("click", () => switchTab("config"));
tabAgenda.addEventListener("click", () => switchTab("agenda"));

function renderToggles() {
  toggleOpen.classList.toggle("on", state.open);
  toggleOpen.setAttribute("aria-checked", String(state.open));
  openName.textContent = state.open ? "Salão aberto" : "Salão fechado";
  openDesc.textContent = state.open
    ? "Os clientes conseguem agendar normalmente."
    : "Os clientes não conseguem agendar.";

  toggleBreak.classList.toggle("on", state.onBreak);
  toggleBreak.setAttribute("aria-checked", String(state.onBreak));
  breakName.textContent = state.onBreak ? "Em intervalo" : "Trabalhando normalmente";
  breakDesc.textContent = state.onBreak
    ? "O barbeiro está em horário de intervalo."
    : "O barbeiro está disponível para atender.";
}

function renderFields() {
  inPix.value = state.pixKey || "";
  inTaxa.value = state.taxaDeslocamento ?? 0;
  pCorte.value = state.prices.corte ?? 0;
  pBarba.value = state.prices.barba ?? 0;
  pBC.value    = state.prices.barba_corte ?? 0;
  pSobr.value  = state.prices.sobrancelha ?? 0;
  planC.value  = state.plans.corte ?? 0;
  planF.value  = state.plans.completo ?? 0;
}

function render() { renderToggles(); renderFields(); }

let saveTimer = null;
function flashSaved() {
  saveStatusEl.classList.remove("hidden");
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveStatusEl.classList.add("hidden"), 2000);
}

function num(v) { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : 0; }

async function persist() {
  if (!CONFIG_REF) return;
  try {
    await setDoc(CONFIG_REF, {
      open: state.open,
      onBreak: state.onBreak,
      pixKey: state.pixKey || "",
      prices: {
        corte: num(state.prices.corte),
        barba: num(state.prices.barba),
        barba_corte: num(state.prices.barba_corte),
        sobrancelha: num(state.prices.sobrancelha),
      },
      plans: {
        corte: num(state.plans.corte),
        completo: num(state.plans.completo),
      },
      taxaDeslocamento: num(state.taxaDeslocamento),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    flashSaved();
  } catch (e) {
    console.error(e);
    alert("Erro ao salvar: " + (e.message || e));
  }
}

// Toggles salvam imediatamente
toggleOpen.addEventListener("click", () => { state.open = !state.open; renderToggles(); persist(); });
toggleBreak.addEventListener("click", () => { state.onBreak = !state.onBreak; renderToggles(); persist(); });

// Botão salvar (para os campos numéricos / pix)
document.getElementById("btn-save").addEventListener("click", () => {
  state.pixKey = inPix.value.trim();
  state.taxaDeslocamento = num(inTaxa.value);
  state.prices = {
    corte: num(pCorte.value),
    barba: num(pBarba.value),
    barba_corte: num(pBC.value),
    sobrancelha: num(pSobr.value),
  };
  state.plans = {
    corte: num(planC.value),
    completo: num(planF.value),
  };
  persist();
});

// Escuta em tempo real
if (CONFIG_REF) {
  onSnapshot(CONFIG_REF, (snap) => {
    loadingEl.classList.add("hidden");
    if (agendaEl.classList.contains("hidden")) panelEl.classList.remove("hidden");
    if (snap.exists()) {
      const d = snap.data();
      state.open = !!d.open;
      state.onBreak = !!d.onBreak;
      state.pixKey = d.pixKey || "";
      state.prices = { ...state.prices, ...(d.prices || {}) };
      state.plans  = { ...state.plans,  ...(d.plans  || {}) };
      state.taxaDeslocamento = d.taxaDeslocamento ?? 0;
    }
    render();
  }, (err) => {
    console.error(err);
    loadingEl.textContent = "Erro ao carregar configurações.";
  });
} else {
  panelEl.classList.remove("hidden");
  loadingEl.classList.add("hidden");
  render();
}

// ============ AGENDAMENTOS ============

const SERVICE_LABELS = {
  corte: "Corte de cabelo",
  barba: "Barba",
  barba_corte: "Barba + Corte",
  sobrancelha: "Sobrancelha",
};

function serviceLabel(s) {
  if (!s) return "Serviço";
  const key = String(s).toLowerCase().replace(/\s|\+/g, "_").replace(/__+/g, "_");
  return SERVICE_LABELS[key] || String(s);
}

function pickField(d, keys) {
  for (const k of keys) {
    if (d[k] !== undefined && d[k] !== null && d[k] !== "") return d[k];
  }
  return "";
}

function formatDate(v) {
  if (!v) return "";
  // Firestore Timestamp
  if (typeof v === "object" && typeof v.toDate === "function") {
    return v.toDate().toLocaleDateString("pt-BR");
  }
  // ISO / string
  if (typeof v === "string") {
    // yyyy-mm-dd
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return v;
  }
  try { return new Date(v).toLocaleDateString("pt-BR"); } catch { return String(v); }
}

function onlyDigits(s) { return String(s || "").replace(/\D/g, ""); }

function buildWhatsAppUrl(phone, message) {
  let digits = onlyDigits(phone);
  if (!digits) return null;
  // Adiciona código do Brasil se ausente
  if (digits.length <= 11) digits = "55" + digits;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function renderAgenda(docs) {
  agendaLoading.classList.add("hidden");
  agendaList.innerHTML = "";
  if (!docs.length) {
    agendaEmpty.classList.remove("hidden");
    return;
  }
  agendaEmpty.classList.add("hidden");

  for (const d of docs) {
    const data = d.data;
    const nome = pickField(data, ["nome", "cliente", "name", "clientName"]) || "Cliente";
    const telefone = pickField(data, ["telefone", "whatsapp", "phone", "celular"]);
    const servicoRaw = pickField(data, ["servico", "serviço", "service", "tipo"]);
    const servico = serviceLabel(servicoRaw);
    const dataAg = pickField(data, ["data", "dia", "date"]);
    const hora = pickField(data, ["hora", "horario", "horário", "time"]);
    const local = pickField(data, ["local", "endereco", "endereço", "modalidade"]);
    const dataFmt = formatDate(dataAg);

    const card = document.createElement("div");
    card.className = "agenda-card";
    card.innerHTML = `
      <div class="agenda-head">
        <p class="agenda-name">${escapeHtml(nome)}</p>
        <span class="agenda-badge">${escapeHtml(servico)}</span>
      </div>
      <div class="agenda-meta">
        ${dataFmt ? `<span>📅 ${escapeHtml(dataFmt)}</span>` : ""}
        ${hora ? `<span>⏰ ${escapeHtml(String(hora))}</span>` : ""}
        ${telefone ? `<span>📱 ${escapeHtml(String(telefone))}</span>` : ""}
        ${local ? `<span>📍 ${escapeHtml(String(local))}</span>` : ""}
      </div>
      <div class="agenda-actions">
        <button class="btn-gold btn-pix">Enviar chave PIX</button>
        <button class="btn-danger btn-finish">Finalizar atendimento</button>
      </div>
    `;

    card.querySelector(".btn-pix").addEventListener("click", () => {
      if (!state.pixKey) {
        alert("Cadastre a chave PIX na aba Configurações antes de enviar.");
        return;
      }
      if (!telefone) {
        alert("Este agendamento não possui telefone cadastrado.");
        return;
      }
      const partes = [
        `Olá, ${nome}! Aqui é da Barbearia.`,
        `Seu ${servico.toLowerCase()} agendado${dataFmt ? ` para ${dataFmt}` : ""}${hora ? ` às ${hora}` : ""} já foi finalizado. Muito obrigado!`,
        ``,
        `Aqui a chave PIX para pagamento:`,
        `${state.pixKey}`,
      ];
      const url = buildWhatsAppUrl(telefone, partes.join("\n"));
      if (url) window.open(url, "_blank");
    });

    card.querySelector(".btn-finish").addEventListener("click", async () => {
      if (!confirm(`Finalizar o atendimento de ${nome}? O agendamento será removido e o horário liberado.`)) return;
      try {
        await deleteDoc(doc(db, "agendamentos", d.id));
      } catch (e) {
        console.error(e);
        alert("Erro ao finalizar: " + (e.message || e));
      }
    });

    agendaList.appendChild(card);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

if (AGENDA_COL) {
  // Tenta ordenar por data; se o campo não existir em todos, cai para sem ordenação
  const q = query(AGENDA_COL);
  onSnapshot(q, (snap) => {
    const docs = [];
    snap.forEach((s) => docs.push({ id: s.id, data: s.data() }));
    // ordena por data + hora quando possível
    docs.sort((a, b) => {
      const da = String(a.data.data || a.data.dia || "") + " " + String(a.data.hora || a.data.horario || "");
      const dbb = String(b.data.data || b.data.dia || "") + " " + String(b.data.hora || b.data.horario || "");
      return da.localeCompare(dbb);
    });
    renderAgenda(docs);
  }, (err) => {
    console.error(err);
    agendaLoading.textContent = "Erro ao carregar agendamentos.";
  });
} else {
  agendaLoading.classList.add("hidden");
  agendaEmpty.classList.remove("hidden");
}
