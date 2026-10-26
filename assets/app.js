/* Morning Brief — Tesorería y Mercados de Capitales */
(() => {
  "use strict";
  const B = window.BRIEF;
  const CAL = window.CALENDARIO || { dias: [] };
  // Mercados en vivo (GitHub Actions + Yahoo Finance): sustituyen a los del boletín si existen
  const M = window.MERCADOS;
  let LIVE = null;
  if (M) {
    const pc = (x, r) => (r ? (x / r - 1) * 100 : null);
    [["bolsas", B.bolsas], ["divisas", B.divisas], ["materias", B.materias], ["vol", B.vol]].forEach(([g, arr]) =>
      arr.forEach(r => { const m = M[g] && M[g][r.n]; if (m && m.v != null) r.v = [m.v, pc(m.v, m.sem), pc(m.v, m.mes), pc(m.v, m.anio), m.dia != null ? pc(m.v, m.dia) : null]; }));
    const u = M.tipos && M.tipos["UST 10A"];
    if (u && u.v != null) B.ust_live = { v: u.v, d1w: u.sem != null ? (u.v - u.sem) * 100 : null, d1d: u.dia != null ? (u.v - u.dia) * 100 : null };
    LIVE = new Date(M.actualizado);
  }
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------------- Fecha de referencia ---------------- */
  const qs = new URLSearchParams(location.search);
  const NOW = qs.get("fecha") ? new Date(qs.get("fecha") + "T" + (qs.get("hora") || "09:00") + ":00") : new Date();
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const TODAY = iso(NOW);
  const parseDMY = s => { const [d, m, y] = s.split("/").map(Number); return new Date(y, m - 1, d); };
  const parseISO = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const yearsBetween = (a, b) => (b - a) / (365.25 * 864e5);
  const fmtLong = d => d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fmtShort = s => parseISO(s).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });

  /* ---------------- Formato ---------------- */
  const nfCache = {};
  const nf = (v, d = 2) => {
    if (v === null || v === undefined || Number.isNaN(v)) return "—";
    const k = d;
    nfCache[k] ||= new Intl.NumberFormat("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: "always" });
    return nfCache[k].format(v);
  };
  const pct = (v, d = 2) => v === null || v === undefined ? "—" : nf(v, d) + "%";
  const sign = (v, d) => (v > 0 ? "+" : v < 0 ? "−" : "") + nf(Math.abs(v), d);
  // kind: "price" (sube = verde), "inv" (sube = rojo, p.ej. VIX o spreads de crédito), "rate" (neutro)
  const chg = (v, { d = 2, suf = "", kind = "rate" } = {}) => {
    if (v === null || v === undefined || Number.isNaN(v)) return `<span class="chg flat">—</span>`;
    const r = Math.round(v * 10 ** d) / 10 ** d;
    if (r === 0) return `<span class="chg flat">0${d ? "," + "0".repeat(d) : ""}${suf}</span>`;
    const arrow = r > 0 ? "▲" : "▼";
    let cls = "neutral";
    if (kind === "price") cls = r > 0 ? "up" : "dn";
    if (kind === "inv") cls = r > 0 ? "dn" : "up";
    return `<span class="chg ${cls}"><span style="font-size:.75em">${arrow}</span> ${sign(r, d)}${suf}</span>`;
  };
  const pb = (a, b) => (a - b) * 100;
  const per = t => `<span class="per">${t}</span>`;
  // Variación diaria si existe (índice 4), si no la semanal (índice 1)
  const dOrW = (v, opts) => v[4] != null ? chg(v[4], opts) + per("1d") : chg(v[1], opts) + per("1s");
  const cc = p => `<span class="cc">${p}</span>`;
  const NOMBRE = { CA: "Canadá", ES: "España", IT: "Italia", DE: "Alemania", FR: "Francia", EZ: "Eurozona", US: "EE.UU.", UK: "Reino Unido", CN: "China", JP: "Japón" };

  /* ---------------- Tema y colores ---------------- */
  const root = document.documentElement;
  try { const t = localStorage.getItem("mb-theme"); if (t) root.dataset.theme = t; } catch (e) {}
  const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const css = n => getComputedStyle(root).getPropertyValue(n).trim();
  // Color por entidad (fijo, nunca por rango)
  const PAIS_SLOT = { DE: "--s1", ES: "--s2", IT: "--s3", FR: "--s4", US: "--s5", UK: "--s6" };

  $("#theme-btn").addEventListener("click", () => {
    root.dataset.theme = isDark() ? "light" : "dark";
    try { localStorage.setItem("mb-theme", root.dataset.theme); } catch (e) {}
    renderCharts();
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (!root.dataset.theme) renderCharts(); });

  /* ---------------- Cabecera ---------------- */
  { const t = fmtLong(NOW); $("#hoy-txt").textContent = t.charAt(0).toUpperCase() + t.slice(1); }
  $("#fuente-txt").textContent = `Boletines ${fmtShort(B.meta.boletin)}` + (LIVE && !isNaN(LIVE)
    ? ` · mercados ${LIVE.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`
    : ` · cierre de mercado ${fmtShort(B.meta.cierre)}`);
  { const el = document.getElementById("idx-meta"); if (el && LIVE && !isNaN(LIVE)) el.textContent = `en vivo · ${LIVE.toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`; }

  /* ---------------- Navegación ---------------- */
  const VIEWS = ["resumen", "tipos", "mercados", "macro", "calendario", "rf"];
  function show(v) {
    if (!VIEWS.includes(v)) v = "resumen";
    $$(".view").forEach(s => s.classList.toggle("active", s.id === "v-" + v));
    $$(".tab").forEach(t => t.setAttribute("aria-selected", t.dataset.view === v));
    renderCharts();
  }
  $$(".tab").forEach(t => t.addEventListener("click", () => { location.hash = t.dataset.view; }));
  window.addEventListener("hashchange", () => show(location.hash.slice(1)));

  // Segmented controls
  function seg(id, onChange) {
    const el = $(id);
    el.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      $$("button", el).forEach(x => x.setAttribute("aria-pressed", x === b));
      onChange(b.dataset.k);
    });
    return () => $("button[aria-pressed=true]", el).dataset.k;
  }

  /* ================================================================ RESUMEN */
  function renderKpis() {
    const sob = B.soberanos["10A"];
    const eur12 = B.monetario.find(x => x.n === "Euribor 12M");
    const eurusd = B.divisas[0].v, brent = B.materias[0].v, vix = B.vol[0].v;
    const sprES = B.spreads["10A"].ES;
    const bceDic = B.probs.BCE.find(x => x.r === "Dic-26"), fedDic = B.probs.Fed.find(x => x.r === "Dic-26");
    const k = [
      { l: "Depósito BCE", v: pct(2.5), d: `<span class="chg neutral">Subida dic.: ${nf(bceDic.act, 1)}%</span>` },
      { l: "Fed Funds", v: "3,75–4,00%", d: `<span class="chg neutral">Subida dic.: ${nf(fedDic.act, 1)}%</span>` },
      { l: "Euribor 12M", v: pct(eur12.actual), d: chg(pb(eur12.actual, eur12.sem), { d: 0, suf: " pb" }) + per("1s") },
      { l: "Bund 10A", v: pct(sob.DE[0]), d: chg(sob.DE[1], { d: 1, suf: " pb" }) + per("1s") },
      { l: "Bono 10A", v: pct(sob.ES[0]), d: chg(sob.ES[1], { d: 1, suf: " pb" }) + per("1s") },
      B.ust_live ? { l: "UST 10A", v: pct(B.ust_live.v), d: B.ust_live.d1d != null ? chg(B.ust_live.d1d, { d: 1, suf: " pb" }) + per("1d") : chg(B.ust_live.d1w, { d: 1, suf: " pb" }) + per("1s") } : { l: "UST 10A", v: pct(sob.US[0]), d: chg(sob.US[1], { d: 1, suf: " pb" }) + per("1s") },
      { l: "Prima ES 10A", v: nf(sprES[0], 1) + " pb", d: chg(sprES[0] - sprES[1], { d: 1, suf: " pb", kind: "inv" }) + per("1s") },
      { l: "EUR/USD", v: nf(eurusd[0], 3), d: dOrW(eurusd, { suf: "%", kind: "price" }) },
      { l: "Brent $", v: nf(brent[0], 2), d: dOrW(brent, { suf: "%", kind: "price" }) },
      { l: "VIX", v: nf(vix[0], 2), d: dOrW(vix, { suf: "%", kind: "inv" }) },
    ];
    $("#kpis").innerHTML = k.map(x => `
      <div class="tape-cell">
        <div class="tape-l">${x.l}${x.u ? ` (${x.u})` : ""}</div>
        <div class="tape-v">${x.v}</div>
        <div class="tape-d">${x.d}</div>
      </div>`).join("");
  }

  function renderClaves() {
    const R = window.RESUMEN;
    if (R && R.claves && R.claves.length) {
      $("#claves-title").textContent = R.fecha === TODAY ? "Claves del día" : "Claves";
      $("#claves-meta").textContent = parseISO(R.fecha).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
      $("#claves-lead").textContent = R.titular || "";
      $("#claves-lead").hidden = !R.titular;
      $("#claves").innerHTML = R.claves.map(c => `<li><span class="tag">${c.tag}</span><span class="txt">${c.txt}</span></li>`).join("");
      return;
    }
    $("#claves-meta").textContent = `Boletín ${fmtShort(B.meta.boletin)}`;
    $("#claves").innerHTML = B.claves.map(c => `<li><span class="tag">${c.tag}</span><span class="txt">${c.txt}</span></li>`).join("");
  }

  /* ================================================================ TIPOS */
  function renderTipos() {
    $("#t-bancos").innerHTML = `
      <thead><tr><th>Banco</th><th>Tipo</th><th class="n">Actual</th><th class="n">Expect. próx.</th><th class="n">Δ 1 año</th></tr></thead>
      <tbody>${B.bancos.map(r => `<tr>
        <td class="strong">${r.bc}</td><td>${r.tipo}</td><td class="n strong">${pct(r.actual)}</td>
        <td class="n">${pct(r.exp)}</td><td class="n">${chg(pb(r.actual, r.anio), { d: 0, suf: " pb" })}</td></tr>`).join("")}</tbody>`;

    $("#t-monetario").innerHTML = `
      <thead><tr><th>Referencia</th><th class="n">Actual</th><th class="n">Δ 1 sem</th><th class="n">Δ 1 mes</th><th class="n">Δ 1 año</th><th class="n">Hace 1 año</th></tr></thead>
      <tbody>${B.monetario.map(r => `<tr><td class="strong">${r.n}</td><td class="n strong">${pct(r.actual, 2)}</td>
        <td class="n">${chg(pb(r.actual, r.sem), { d: 0, suf: " pb" })}</td><td class="n">${chg(pb(r.actual, r.mes), { d: 0, suf: " pb" })}</td>
        <td class="n">${chg(pb(r.actual, r.anio), { d: 0, suf: " pb" })}</td><td class="n dim">${pct(r.anio)}</td></tr>`).join("")}</tbody>`;

    const L = B.liquidez;
    $("#liq-meta").textContent = `M€ · ${L.fecha} vs ${L.prev}`;
    $("#t-liquidez").innerHTML = `
      <thead><tr><th>Concepto</th><th class="n">${L.fecha}</th><th class="n">${L.prev}</th><th class="n">Var.</th></tr></thead>
      <tbody>${L.items.map(r => `<tr><td>${r.n}</td><td class="n strong">${nf(r.actual, 0)}</td><td class="n dim">${nf(r.prev, 0)}</td>
        <td class="n">${chg(r.actual - r.prev, { d: 0 })}</td></tr>`).join("")}</tbody>`;

    renderSoberanos("10A");
    seg("#seg-plazo", renderSoberanos);

    const P = B.pendientes;
    $("#t-pend").innerHTML = `
      <thead><tr><th>País</th><th class="n">Actual</th><th class="n">Δ 1 sem</th><th class="n">Δ 1 mes</th><th class="n">Hace 1 año</th></tr></thead>
      <tbody>${Object.entries(P).map(([p, v]) => `<tr><td>${cc(p)} ${NOMBRE[p]}</td><td class="n strong">${nf(v[0], 1)}</td>
        <td class="n">${chg(v[0] - v[1], { d: 1 })}</td><td class="n">${chg(v[0] - v[2], { d: 1 })}</td><td class="n dim">${nf(v[3], 1)}</td></tr>`).join("")}</tbody>`;

    const sw = (lab, rows) => `<tr class="grp"><td colspan="5">${lab}</td></tr>` + rows.map(r => `<tr><td>${r.p}</td><td class="n strong">${pct(r.act)}</td>
        <td class="n">${chg(pb(r.act, r.sem), { d: 0, suf: " pb" })}</td><td class="n">${chg(pb(r.act, r.mes), { d: 0, suf: " pb" })}</td><td class="n dim">${pct(r.anio)}</td></tr>`).join("");
    $("#t-swaps").innerHTML = `
      <thead><tr><th>Plazo</th><th class="n">Último</th><th class="n">Δ 1 sem</th><th class="n">Δ 1 mes</th><th class="n">Hace 1 año</th></tr></thead>
      <tbody>${sw("Swap EUR", B.swaps.EUR)}${sw("Swap USD", B.swaps.USD)}</tbody>`;
  }

  function renderSoberanos(plazo) {
    const S = B.soberanos[plazo];
    $("#t-soberanos").innerHTML = `
      <thead><tr><th>${plazo}</th><th class="n">TIR</th><th class="n">Δ 1 sem</th><th class="n">Δ 1 mes</th><th class="n">Δ 1 año</th><th class="n">Hace 1 año</th></tr></thead>
      <tbody>${B.soberanos.paises.map(p => { const v = S[p]; return `<tr><td>${cc(p)} ${NOMBRE[p]}</td><td class="n strong">${pct(v[0])}</td>
        <td class="n">${chg(v[1], { d: 1 })}</td><td class="n">${chg(v[2], { d: 1 })}</td><td class="n">${chg(v[3], { d: 1 })}</td>
        <td class="n dim">${pct(v[0] - v[3] / 100)}</td></tr>`; }).join("")}</tbody>`;
    const SP = B.spreads[plazo];
    $("#spr-meta").textContent = `p.b. · ${plazo}`;
    $("#t-spreads").innerHTML = `
      <thead><tr><th>vs Bund</th><th class="n">Actual</th><th class="n">Δ 1 sem</th><th class="n">Δ 1 mes</th><th class="n">Hace 1 año</th></tr></thead>
      <tbody>${Object.entries(SP).map(([p, v]) => `<tr><td>${cc(p)} ${NOMBRE[p]}</td><td class="n strong">${nf(v[0], 1)}</td>
        <td class="n">${chg(v[0] - v[1], { d: 1, kind: "inv" })}</td><td class="n">${chg(v[0] - v[2], { d: 1, kind: "inv" })}</td><td class="n dim">${nf(v[3], 1)}</td></tr>`).join("")}
        <tr><td>${cc("US")} UST vs Bund</td><td class="n strong">${nf(pb(B.soberanos[plazo].US[0], B.soberanos[plazo].DE[0]), 1)}</td><td class="n dim" colspan="3">diferencial transatlántico</td></tr></tbody>`;
  }

  /* ================================================================ MERCADOS */
  function renderMercados() {
    $("#t-bolsas").innerHTML = `
      <thead><tr><th>Índice</th><th class="n">Último</th><th class="n">1 día</th><th class="n">1 sem</th><th class="n">1 mes</th><th class="n">1 año</th></tr></thead>
      <tbody>${B.bolsas.map(r => `<tr><td class="strong">${r.n}</td><td class="n">${nf(r.v[0], 2)}</td>
        <td class="n strong">${chg(r.v[4], { suf: "%", kind: "price" })}</td><td class="n">${chg(r.v[1], { suf: "%", kind: "price" })}</td><td class="n">${chg(r.v[2], { suf: "%", kind: "price" })}</td><td class="n">${chg(r.v[3], { suf: "%", kind: "price" })}</td></tr>`).join("")}</tbody>`;

    $("#t-credito").innerHTML = `
      <thead><tr><th>Índice</th><th class="n">Último</th><th class="n">Δ 1 sem</th><th class="n">Δ 1 mes</th></tr></thead>
      <tbody>${B.credito.map(r => `<tr><td><div class="strong">${r.n.replace("iTraxx ", "")}</div><div class="dim" style="font-size:11px">${r.d}</div></td>
        <td class="n strong">${nf(r.act, 1)}</td><td class="n">${chg(r.act - r.sem, { d: 1, kind: "inv" })}</td><td class="n">${chg(r.act - r.mes, { d: 1, kind: "inv" })}</td></tr>`).join("")}</tbody>`;

    $("#t-divisas").innerHTML = `
      <thead><tr><th>Par</th><th class="n">Spot</th><th class="n">1 día</th><th class="n">1 sem</th><th class="n">1 año</th></tr></thead>
      <tbody>${B.divisas.map(r => `<tr><td class="strong">${r.n}</td><td class="n">${nf(r.v[0], r.d)}</td>
        <td class="n strong">${chg(r.v[4], { suf: "%" })}</td><td class="n">${chg(r.v[1], { suf: "%" })}</td><td class="n">${chg(r.v[3], { suf: "%" })}</td></tr>`).join("")}</tbody>`;

    $("#t-materias").innerHTML = `
      <thead><tr><th>Activo</th><th class="n">Último</th><th class="n">1 día</th><th class="n">1 sem</th><th class="n">1 año</th></tr></thead>
      <tbody>${B.materias.map(r => `<tr><td><span class="strong" title="${r.u}">${r.n}</span></td><td class="n">${nf(r.v[0], 2)}</td>
        <td class="n strong">${chg(r.v[4], { suf: "%", kind: "price" })}</td><td class="n">${chg(r.v[1], { suf: "%", kind: "price" })}</td><td class="n">${chg(r.v[3], { suf: "%", kind: "price" })}</td></tr>`).join("")}
        <tr class="grp"><td colspan="5">Volatilidad</td></tr>
        ${B.vol.map(r => `<tr><td class="strong">${r.n}</td><td class="n">${nf(r.v[0], 2)}</td><td class="n strong">${chg(r.v[4], { suf: "%", kind: "inv" })}</td><td class="n">${chg(r.v[1], { suf: "%", kind: "inv" })}</td><td class="n">${chg(r.v[3], { suf: "%", kind: "inv" })}</td></tr>`).join("")}</tbody>`;
  }

  /* ================================================================ MACRO */
  function renderMacro() {
    renderPublicadas();

    // Inflación: tinte secuencial (un tono) según nivel
    const I = B.inflacion;
    const maxCol = I.cols.map((_, j) => Math.max(...I.filas.map(f => f.v[j] ? f.v[j][0] : 0)));
    const ramp = isDark() ? ["#184f95", "#1c5cab", "#256abf", "#2a78d6", "#3987e5"] : ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec"];
    const tint = (v, j) => ramp[Math.min(ramp.length - 1, Math.floor((v / maxCol[j]) * ramp.length))];
    $("#t-inflacion").innerHTML = `
      <thead><tr><th>País</th>${I.cols.map(c => `<th class="n">${c}</th>`).join("")}</tr></thead>
      <tbody>${I.filas.map(f => `<tr><td>${cc(f.p)} ${NOMBRE[f.p]}</td>${f.v.map((x, j) => x ? `<td class="n">
          <span class="heat mono" style="background:${tint(x[0], j)}">${nf(x[0], 1)}%</span>
          <div style="font-size:11px;margin-top:2px">${chg(x[1], { d: 1, suf: " pp" })}</div></td>` : `<td class="n dim">—</td>`).join("")}</tr>`).join("")}</tbody>`;
    $("#infl-nota").textContent = I.nota;

    $("#t-pmi").innerHTML = `
      <thead><tr><th>País</th><th class="n">Manuf.</th><th class="n">Servicios</th><th class="n">Compuesto</th><th class="n">Δ 1m</th></tr></thead>
      <tbody>${B.pmi.map(r => `<tr><td>${cc(r.p)} ${NOMBRE[r.p]}</td>${r.v.slice(0, 3).map((v, i) => `<td class="n ${i === 2 ? "strong" : ""}" style="${v < 50 ? "color:var(--neg)" : ""}">${nf(v, 1)}</td>`).join("")}
        <td class="n">${chg(r.v[3], { d: 1, kind: "price" })}</td></tr>`).join("")}</tbody>`;

    $("#t-pib").innerHTML = `
      <thead><tr><th>País</th><th class="n">PIB 2T26 YoY</th><th class="n">FMI 26</th><th class="n">FMI 27</th><th class="n">Deuda/PIB</th></tr></thead>
      <tbody>${B.pib.map(r => `<tr><td>${cc(r.p)} ${NOMBRE[r.p]}</td><td class="n strong">${pct(r.yoy, 1)}</td><td class="n">${pct(r.fmi26, 1)}</td><td class="n">${pct(r.fmi27, 1)}</td><td class="n dim">${pct(r.deuda, 1)}</td></tr>`).join("")}</tbody>`;
    $("#t-empleo").innerHTML = `
      <thead><tr><th>País</th><th>Empleo</th><th class="n">Último</th><th class="n">Δ / ref.</th></tr></thead>
      <tbody>${B.empleo.map(r => `<tr><td>${cc(r.p)}</td><td>${r.n}</td><td class="n strong">${r.v}</td><td class="n dim mono">${r.d}</td></tr>`).join("")}</tbody>`;
  }

  /* ================================================================ CALENDARIO */
  const calState = { dia: null, paises: new Set(), imp: "todas" };
  const IMP_RANK = { baja: 0, media: 1, alta: 2 };
  const impBadge = i => `<span class="imp ${i}" title="Importancia ${i}"><i></i><i></i><i></i></span>`;
  const evTime = (fecha, hora) => { const d = parseISO(fecha); if (hora) { const [h, m] = hora.split(":").map(Number); d.setHours(h, m); } else d.setHours(23, 59); return d; };
  const isPast = (fecha, hora) => evTime(fecha, hora) < NOW;
  const parseNum = s => { if (!s) return null; const m = String(s).replace(/[^\d,.\-]/g, "").replace(/\./g, "").replace(",", ".").match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };
  const decs = s => { const m = String(s).match(/,(\d+)/); return m ? Math.min(m[1].length, 2) : 0; };
  function renderPublicadas() {
    const rows = CAL.dias.flatMap(d => d.eventos.filter(e => e.actual).map(e => ({ ...e, fecha: d.fecha, dia: d.dia })));
    let up = 0, dn = 0;
    $("#t-publicados").innerHTML = rows.length ? `
      <thead><tr><th>Día</th><th>Hora</th><th>País</th><th>Indicador</th><th>Periodo</th><th class="n">Actual</th><th class="n">Consenso</th><th class="n">Sorpresa</th><th class="n">Anterior</th></tr></thead>
      <tbody>${rows.map(e => {
        const a = parseNum(e.actual), es = parseNum(e.est);
        let sorp = `<span class="chg flat">—</span>`;
        if (a !== null && es !== null) {
          const d = Math.max(decs(e.actual), decs(e.est)), diff = a - es;
          if (Math.round(diff * 100) > 0) up++; else if (Math.round(diff * 100) < 0) dn++;
          sorp = chg(diff, { d: Math.min(d, 2), suf: e.actual.includes("%") ? " pp" : "" });
        }
        return `<tr><td class="dim">${e.dia.slice(0, 3)} ${parseISO(e.fecha).getDate()}</td><td class="mono dim">${e.hora}</td><td>${cc(e.pais)}</td>
          <td class="strong">${impBadge(e.imp)} ${e.dato}</td><td class="dim">${e.periodo}</td><td class="n strong mono">${e.actual}</td>
          <td class="n dim mono">${e.est || "—"}${e.est_fuente ? "*" : ""}</td><td class="n">${sorp}</td><td class="n dim mono">${e.ultimo || "—"}</td></tr>`;
      }).join("")}</tbody>` : `<tbody><tr><td class="empty">Aún no hay datos publicados esta semana.</td></tr></tbody>`;
    $("#pub-meta").textContent = `${rows.length} datos · ${up} por encima y ${dn} por debajo del consenso`;
  }

  function calDefaultDay() {
    const days = CAL.dias.map(d => d.fecha);
    if (days.includes(TODAY)) return TODAY;
    const next = days.find(d => d > TODAY);
    return next || days[0];
  }

  function renderCalendario() {
    if (!CAL.dias.length) { $("#v-calendario").innerHTML = `<div class="empty">Sin calendario. Ejecuta scripts/actualizar_calendario.py.</div>`; return; }
    calState.dia ||= calDefaultDay();
    { const a = parseISO(CAL.dias[0].fecha), z = parseISO(CAL.dias[CAL.dias.length - 1].fecha);
      $("#cal-semana").textContent = `Semana del ${a.getDate()} al ${z.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}`; }
    $("#cal-days").innerHTML = CAL.dias.map(d => {
      const n = d.eventos.length, alta = d.eventos.filter(e => e.imp === "alta").length;
      return `<button class="day" data-f="${d.fecha}" aria-pressed="${d.fecha === calState.dia}">
        <div class="dn"><span>${d.dia}</span>${d.fecha === TODAY ? `<span class="hoy">Hoy</span>` : ""}</div>
        <div class="dd">${parseISO(d.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</div>
        <div class="cnt">${n} datos${alta ? ` · ${alta} alta` : ""}</div></button>`;
    }).join("");
    $$("#cal-days .day").forEach(b => b.onclick = () => { calState.dia = b.dataset.f; renderCalendario(); });

    const paises = [...new Set(CAL.dias.flatMap(d => d.eventos.map(e => e.pais)))];
    const orden = ["ES", "EZ", "DE", "FR", "IT", "UK", "US", "CN", "JP"];
    paises.sort((a, b) => (orden.indexOf(a) + 1 || 99) - (orden.indexOf(b) + 1 || 99));
    $("#cal-paises").innerHTML = paises.map(p => `<button class="chip" data-p="${p}" aria-pressed="${calState.paises.has(p)}">${NOMBRE[p] || p}</button>`).join("");
    $$("#cal-paises .chip").forEach(b => b.onclick = () => {
      calState.paises.has(b.dataset.p) ? calState.paises.delete(b.dataset.p) : calState.paises.add(b.dataset.p);
      renderCalendario();
    });

    const dia = CAL.dias.find(d => d.fecha === calState.dia);
    const evs = dia.eventos.filter(e =>
      (!calState.paises.size || calState.paises.has(e.pais)) &&
      (calState.imp === "todas" || IMP_RANK[e.imp] >= IMP_RANK[calState.imp]));
    const nextIdx = evs.findIndex(e => !isPast(dia.fecha, e.hora));
    $("#cal-title").textContent = `${dia.dia} ${parseISO(dia.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}`;
    $("#cal-meta").textContent = `${evs.length} de ${dia.eventos.length} publicaciones · hora CET`;
    $("#t-cal").innerHTML = evs.length ? `
      <thead><tr><th></th><th>Hora</th><th>País</th><th>Indicador</th><th>Periodo</th><th class="n">Consenso</th><th class="n">Anterior</th><th class="n">Actual</th></tr></thead>
      <tbody>${evs.map((e, i) => {
        const past = isPast(dia.fecha, e.hora);
        let act = e.actual ? `<span class="strong">${e.actual}</span>` : past ? `<span class="dim">pendiente</span>` : `<span class="dim">—</span>`;
        if (e.actual && e.est) {
          const a = parseNum(e.actual), es = parseNum(e.est);
          if (a !== null && es !== null && a !== es) act += ` <span class="chg neutral" style="font-size:11px">${a > es ? "▲" : "▼"}</span>`;
        }
        return `<tr class="${past ? "past" : ""} ${dia.fecha === TODAY && i === nextIdx ? "next" : ""}">
          <td style="width:28px">${impBadge(e.imp)}</td><td class="mono">${e.hora || "—"}</td><td>${cc(e.pais)}</td>
          <td class="strong">${e.dato}${dia.fecha === TODAY && i === nextIdx ? `<span class="pill">Siguiente</span>` : ""}</td>
          <td class="dim">${e.periodo}</td><td class="n">${e.est || `<span class="dim">—</span>`}</td><td class="n dim">${e.ultimo || "—"}</td><td class="n">${act}</td></tr>`;
      }).join("")}</tbody>` : `<tbody><tr><td class="empty">Sin publicaciones con estos filtros.</td></tr></tbody>`;
    $("#cal-src").textContent = `Fuente: ${CAL.hoja ? `hoja «${CAL.hoja}» del calendario semanal` : (CAL.fuente || "calendario semanal")} · generado ${CAL.generado || "—"}${CAL.actualizado ? ` · datos publicados actualizados ${CAL.actualizado}` : ""}`;
  }
  seg("#cal-imp", k => { calState.imp = k; renderCalendario(); });

  function renderHoyCal() {
    const fecha = calDefaultDay();
    const dia = CAL.dias.find(d => d.fecha === fecha);
    if (!dia) { $("#hoy-cal").innerHTML = `<li class="empty">Sin calendario cargado.</li>`; return; }
    $("#hoy-cal-title").textContent = fecha === TODAY ? "Hoy en el calendario" : `Calendario · ${dia.dia} ${parseISO(fecha).getDate()}`;
    const evs = dia.eventos.filter(e => e.imp !== "baja");
    const lista = evs.length ? evs : dia.eventos;
    $("#hoy-cal").innerHTML = lista.length ? lista.map(e => `
      <li class="${isPast(fecha, e.hora) ? "past" : ""}"><span class="h">${e.hora || "—"}</span>${cc(e.pais)}
        <span>${impBadge(e.imp)} ${e.dato} <span class="dim">${e.periodo}</span></span>
        <span class="v">${e.actual ? `<b style="color:var(--text)">${e.actual}</b>` : e.est ? `est. ${e.est}` : e.ultimo ? `ant. ${e.ultimo}` : ""}</span></li>`).join("")
      : `<li class="empty">Sin publicaciones relevantes.</li>`;
  }

  /* ================================================================ RENTA FIJA */
  const RF_DATE = parseISO(B.meta.rf_corp), GOV_DATE = parseISO(B.meta.rf_gov);
  const govCurve = p => B.gov[p].map(r => ({ x: yearsBetween(GOV_DATE, parseDMY(r[3])), y: r[5] })).sort((a, b) => a.x - b.x);
  const interp = (curve, x) => {
    if (x <= curve[0].x) return curve[0].y;
    for (let i = 1; i < curve.length; i++) if (x <= curve[i].x) {
      const a = curve[i - 1], b = curve[i]; return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
    }
    return curve[curve.length - 1].y;
  };
  const rfState = { div: "EUR", buck: "all", sort: "anos", asc: true };

  function renderCorp() {
    const bench = rfState.div === "EUR" ? "DE" : "US";
    const curve = govCurve(bench);
    let rows = B.corp[rfState.div].map(r => {
      const anos = yearsBetween(RF_DATE, parseDMY(r[2]));
      return { em: r[0], cup: r[1], vto: r[2], isin: r[3], px: r[4], tir: r[5], f: r[6], m: r[7], s: r[8], anos, spr: (r[5] - interp(curve, anos)) * 100 };
    });
    const B_ = { a: [0, 2], b: [2, 4], c: [4, 7] }[rfState.buck];
    if (B_) rows = rows.filter(r => r.anos >= B_[0] && r.anos < B_[1]);
    const k = rfState.sort, dir = rfState.asc ? 1 : -1;
    rows.sort((a, b) => (typeof a[k] === "string" ? a[k].localeCompare(b[k]) : a[k] - b[k]) * dir);
    $("#rf-meta").textContent = `${rows.length} bonos · ${fmtShort(B.meta.rf_corp)}`;
    const th = (k, l, n = true) => `<th class="${n ? "n " : ""}sortable ${rfState.sort === k ? "sorted" + (rfState.asc ? " asc" : "") : ""}" data-k="${k}">${l}</th>`;
    $("#t-corp").innerHTML = `
      <thead><tr>${th("em", "Emisor", false)}${th("cup", "Cupón")}<th class="n">Vto.</th>${th("anos", "Años")}<th>ISIN</th>${th("px", "Precio")}${th("tir", "TIR")}${th("spr", `Spread vs ${bench === "DE" ? "Bund" : "UST"}`)}<th>Fitch</th><th>Moody's</th><th>S&amp;P</th></tr></thead>
      <tbody>${rows.map(r => `<tr><td class="strong">${r.em}</td><td class="n">${pct(r.cup)}</td><td class="n mono">${r.vto}</td><td class="n">${nf(r.anos, 1)}</td>
        <td class="mono dim" style="font-size:12px">${r.isin}</td><td class="n">${nf(r.px, 2)}</td><td class="n strong">${pct(r.tir)}</td><td class="n">${nf(r.spr, 0)} pb</td>
        <td class="dim">${r.f}</td><td class="dim">${r.m}</td><td class="dim">${r.s}</td></tr>`).join("")}</tbody>`;
    $$("#t-corp th.sortable").forEach(h => h.onclick = () => {
      if (rfState.sort === h.dataset.k) rfState.asc = !rfState.asc; else { rfState.sort = h.dataset.k; rfState.asc = h.dataset.k !== "tir" && h.dataset.k !== "spr"; }
      renderCorp();
    });
  }
  seg("#seg-rf-div", k => { rfState.div = k; renderCorp(); });
  seg("#seg-rf-buck", k => { rfState.buck = k; renderCorp(); });

  let govSel = "ES";
  function renderGov() {
    $("#seg-gov").innerHTML = Object.keys(B.gov).map(p => `<button data-k="${p}" aria-pressed="${p === govSel}">${p}</button>`).join("");
    $("#t-gov").innerHTML = `
      <thead><tr><th>Plazo</th><th>Descripción</th><th>ISIN</th><th class="n">Vto.</th><th class="n">Precio</th><th class="n">TIR</th><th class="n">Δ 1 sem</th></tr></thead>
      <tbody>${B.gov[govSel].map(r => `<tr><td class="strong">${r[0]}</td><td class="mono" style="font-size:12.5px">${r[1]}</td><td class="mono dim" style="font-size:12px">${r[2]}</td>
        <td class="n mono">${r[3]}</td><td class="n">${nf(r[4], 2)}</td><td class="n strong">${pct(r[5])}</td><td class="n">${chg(r[6], { d: 1, suf: " pb" })}</td></tr>`).join("")}</tbody>`;
  }
  $("#seg-gov").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; govSel = b.dataset.k; renderGov(); });

  /* ================================================================ GRÁFICOS */
  const charts = {};
  let probRes = "BCE", bolsaIdx = B.bolsas.some(r => r.v[4] != null) ? 4 : 1, pibYear = "26";
  const curvasOn = { DE: true, ES: true, IT: true, FR: true, US: true, UK: true };
  const rfOn = { corp: true, DE: true, ES: true };

  function baseOpts() {
    const t2 = css("--text-2"), t3 = css("--text-3"), grid = css("--grid"), surf = css("--surface"), bord = css("--border-strong"), t1 = css("--text");
    Chart.defaults.font.family = css("--sans") || "Inter";
    Chart.defaults.font.size = 11.5;
    Chart.defaults.color = t3;
    return {
      responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: surf, borderColor: bord, borderWidth: 1, titleColor: t1, bodyColor: t2,
          padding: 10, cornerRadius: 8, boxPadding: 4, usePointStyle: true,
          titleFont: { weight: "600" }, bodyFont: { family: css("--sans") },
        },
      },
      scales: {
        x: { grid: { color: grid, drawTicks: false }, border: { display: false }, ticks: { color: t3, padding: 6 } },
        y: { grid: { color: grid, drawTicks: false }, border: { display: false }, ticks: { color: t3, padding: 8 } },
      },
    };
  }
  const yearTicks = ax => { ax.afterBuildTicks = a => { a.ticks = [1, 2, 3, 5, 7, 10].map(v => ({ value: v })); }; ax.ticks.callback = v => v + "A"; };
  const mk = (id, cfg) => { charts[id]?.destroy(); const el = document.getElementById(id); if (!el || !el.offsetParent) return; charts[id] = new Chart(el, cfg); };

  function probChart(id, key) {
    const d = B.probs[key], o = baseOpts();
    o.scales.y.min = 0; o.scales.y.max = 100; o.scales.y.ticks.callback = v => v + "%"; o.scales.y.ticks.stepSize = 25;
    o.scales.x.grid.display = false;
    o.plugins.tooltip.callbacks = { label: c => ` ${c.dataset.label}: ${nf(c.parsed.y, 1)}%` };
    o.interaction = { mode: "index", intersect: false };
    mk(id, {
      type: "bar", options: o,
      data: { labels: d.map(x => x.r), datasets: [
        { label: "Semana anterior", data: d.map(x => x.prev), backgroundColor: css("--muted-mark"), borderRadius: 4, borderSkipped: "start", maxBarThickness: 22, categoryPercentage: .6, barPercentage: .9 },
        { label: "Cierre 16/10", data: d.map(x => x.act), backgroundColor: css("--s1"), borderRadius: 4, borderSkipped: "start", maxBarThickness: 22, categoryPercentage: .6, barPercentage: .9 },
      ] },
    });
  }

  function curvasChart() {
    const lg = $("#lg-curvas");
    lg.innerHTML = Object.keys(PAIS_SLOT).map(p => `<button data-p="${p}" aria-pressed="${curvasOn[p]}"><span class="line-key" style="background:var(${PAIS_SLOT[p]})"></span>${NOMBRE[p]}</button>`).join("");
    $$("button", lg).forEach(b => b.onclick = () => { curvasOn[b.dataset.p] = !curvasOn[b.dataset.p]; curvasChart(); });
    const o = baseOpts();
    o.scales.x.type = "linear"; o.scales.x.min = 0; o.scales.x.max = 10.5;
    yearTicks(o.scales.x);
    o.scales.y.ticks.callback = v => nf(v, 1) + "%";
    o.plugins.tooltip.callbacks = { title: c => `${B.gov.DE[c[0].dataIndex]?.[0] || ""}`, label: c => ` ${c.dataset.label}: ${nf(c.parsed.y, 2)}%` };
    o.interaction = { mode: "index", intersect: false };
    const ten = ["3M", "6M", "9M", "1A", "2A", "3A", "5A", "7A", "10A"], tx = [.25, .5, .75, 1, 2, 3, 5, 7, 10];
    mk("c-curvas", {
      type: "line", options: o,
      data: { datasets: Object.keys(PAIS_SLOT).filter(p => curvasOn[p]).map(p => ({
        label: NOMBRE[p], data: B.gov[p].map((r, i) => ({ x: tx[ten.indexOf(r[0])], y: r[5] })),
        borderColor: css(PAIS_SLOT[p]), backgroundColor: css(PAIS_SLOT[p]), borderWidth: 2, cubicInterpolationMode: "monotone",
        pointRadius: 3, pointHoverRadius: 5, pointBorderColor: css("--surface"), pointBorderWidth: 1.5,
      })) },
    });
  }

  function bolsasChart() {
    const rows = B.bolsas.filter(r => r.v[bolsaIdx] != null).sort((a, b) => b.v[bolsaIdx] - a.v[bolsaIdx]);
    const o = baseOpts();
    o.indexAxis = "y";
    o.scales.x.ticks.callback = v => nf(v, Number.isInteger(v) ? 0 : 1) + "%";
    o.scales.y.grid.display = false;
    o.scales.y.ticks.color = css("--text-2");
    o.plugins.tooltip.callbacks = { label: c => ` ${sign(c.parsed.x, 2)}%` };
    mk("c-bolsas", {
      type: "bar", options: o,
      data: { labels: rows.map(r => r.n), datasets: [{
        data: rows.map(r => r.v[bolsaIdx]),
        backgroundColor: rows.map(r => r.v[bolsaIdx] >= 0 ? css("--s1") : css("--s8")),
        borderRadius: 4, borderSkipped: "start", maxBarThickness: 16,
      }] },
    });
  }

  function pibChart() {
    const o = baseOpts();
    o.scales.y.ticks.callback = v => nf(v, 1) + "%"; o.scales.y.min = 0;
    o.scales.x.grid.display = false;
    o.interaction = { mode: "index", intersect: false };
    o.plugins.tooltip.callbacks = { label: c => ` ${c.dataset.label}: ${nf(c.parsed.y, 2)}%` };
    mk("c-pib", {
      type: "bar", options: o,
      data: { labels: B.pib.map(r => NOMBRE[r.p]), datasets: [
        { label: "FMI", data: B.pib.map(r => r["fmi" + pibYear]), backgroundColor: css("--s1"), borderRadius: 4, borderSkipped: "start", maxBarThickness: 20, categoryPercentage: .6, barPercentage: .9 },
        { label: "OCDE", data: B.pib.map(r => r["ocde" + pibYear]), backgroundColor: css("--s2"), borderRadius: 4, borderSkipped: "start", maxBarThickness: 20, categoryPercentage: .6, barPercentage: .9 },
      ] },
    });
  }

  function rfChart() {
    const lg = $("#lg-rf");
    const items = [["corp", "Corporativos EUR", "--text-2", "dot"], ["DE", "Curva Alemania", PAIS_SLOT.DE, "line"], ["ES", "Curva España", PAIS_SLOT.ES, "line"]];
    lg.innerHTML = items.map(([k, l, c, t]) => `<button data-k="${k}" aria-pressed="${rfOn[k]}">${t === "dot" ? `<span class="swatch" style="background:var(${c});border-radius:50%;width:8px;height:8px"></span>` : `<span class="line-key" style="background:var(${c})"></span>`}${l}</button>`).join("");
    $$("button", lg).forEach(b => b.onclick = () => { rfOn[b.dataset.k] = !rfOn[b.dataset.k]; rfChart(); });
    const de = govCurve("DE"), es = govCurve("ES");
    const pts = B.corp.EUR.map(r => ({ x: yearsBetween(RF_DATE, parseDMY(r[2])), y: r[5], em: r[0], vto: r[2], spr: (r[5] - interp(de, yearsBetween(RF_DATE, parseDMY(r[2])))) * 100 }));
    const o = baseOpts();
    o.scales.x.type = "linear"; o.scales.x.min = 0; o.scales.x.max = 10.5; yearTicks(o.scales.x);
    o.scales.y.ticks.callback = v => nf(v, 1) + "%";
    o.interaction = { mode: "nearest", intersect: true };
    o.plugins.tooltip.callbacks = {
      title: c => c[0].raw.em || c[0].dataset.label,
      label: c => c.raw.em ? [` TIR ${nf(c.raw.y, 2)}% · vto. ${c.raw.vto}`, ` Spread vs Bund ${nf(c.raw.spr, 0)} pb`] : ` ${nf(c.raw.x, 1)}A: ${nf(c.raw.y, 2)}%`,
    };
    const ds = [];
    if (rfOn.corp) ds.push({ type: "scatter", label: "Corporativos EUR", data: pts, backgroundColor: css("--text-2"), borderColor: css("--surface"), borderWidth: 1.5, pointRadius: 5, pointHoverRadius: 7, order: 0 });
    if (rfOn.DE) ds.push({ type: "line", label: "Alemania", data: de, borderColor: css(PAIS_SLOT.DE), borderWidth: 2, pointRadius: 0, pointHitRadius: 6, cubicInterpolationMode: "monotone", order: 1 });
    if (rfOn.ES) ds.push({ type: "line", label: "España", data: es, borderColor: css(PAIS_SLOT.ES), borderWidth: 2, pointRadius: 0, pointHitRadius: 6, cubicInterpolationMode: "monotone", order: 1 });
    mk("c-rf", { type: "scatter", options: o, data: { datasets: ds } });
  }

  function renderCharts() {
    if (typeof Chart === "undefined") return;
    const v = location.hash.slice(1) || "resumen";
    if (v === "resumen") probChart("c-res-prob", probRes);
    if (v === "tipos") { probChart("c-prob-bce", "BCE"); probChart("c-prob-fed", "Fed"); curvasChart(); }
    if (v === "mercados") bolsasChart();
    if (v === "macro") { pibChart(); renderMacro(); }
    if (v === "rf") rfChart();
  }
  seg("#seg-res-prob", k => { probRes = k; probChart("c-res-prob", k); });
  seg("#seg-bolsa", k => { bolsaIdx = +k; bolsasChart(); });
  $$("#seg-bolsa button").forEach(b => b.setAttribute("aria-pressed", +b.dataset.k === bolsaIdx));
  seg("#seg-pib", k => { pibYear = k; pibChart(); });

  /* ---------------- Init ---------------- */
  renderKpis(); renderClaves(); renderHoyCal();
  renderTipos(); renderMercados(); renderMacro(); renderCalendario(); renderCorp(); renderGov();
  show(location.hash.slice(1) || "resumen");
})();
