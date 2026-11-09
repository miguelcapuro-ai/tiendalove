/* Mejorativa Love · tienda: catálogo, planes, pedido en pasos y pago con Yappy (como CV en el Quirófano). */
(() => {
  "use strict";
  const CFG = window.LOVE || {};
  const API = (CFG.api || "").replace(/\/$/, "");
  const MODELS = window.MODELOS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STORE = "ml-pedido-v2", PENDIENTE = "ml-pago-v2";
  const arrow = '<span class="arr"><svg class="ico" aria-hidden="true"><use href="#i-arrow"/></svg></span>';
  const el = (tag, attrs = {}, kids = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k === "text") n.textContent = v; else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? "" : v);
    }
    for (const c of [].concat(kids)) if (c != null && c !== false) n.append(c);
    return n;
  };
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = n => "US$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const digits = s => String(s || "").replace(/\D/g, "");
  const pad = n => String(n).padStart(2, "0");
  const localISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hoy = () => localISO(new Date());
  const maxFecha = () => { const d = new Date(); d.setFullYear(d.getFullYear() + 10); return localISO(d); };
  const fechaOk = v => { if (!/^\d{4}-\d{2}-\d{2}$/.test(v || "")) return false; const d = new Date(v + "T12:00:00Z"); return !isNaN(d) && d.toISOString().slice(0, 10) === v; };
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }, del(k) { try { localStorage.removeItem(k); } catch {} } };

  // Planes: los del servidor mandan; estos son el respaldo.
  let PLANES = [
    {"id":"esencial","nombre":"Esencial","precio":89,"revisiones":1,"maxFotos":5,"musica":false,"listaInvitados":true,"canales":["correo"],"maxInvitaciones":50,"modelosExclusivos":false,"mesas":false,"recordatorios":false,"aMedida":false,"cambiarModelo":false,"resumen":"Su invitación y hasta 50 invitaciones personales por correo.","incluye":["Invitación con el sobre que se abre","Hasta 50 invitaciones con nombre y cupos","Envío por correo","Confirmaciones en su tablero","Hasta 5 fotos","1 ronda de ajustes"]},
    {"id":"clasico","nombre":"Clásico","precio":149,"revisiones":1,"maxFotos":10,"musica":true,"listaInvitados":true,"canales":["correo","whatsapp"],"maxInvitaciones":150,"modelosExclusivos":true,"destacado":true,"mesas":false,"recordatorios":false,"aMedida":false,"cambiarModelo":false,"resumen":"Cada invitado la recibe por WhatsApp o correo, con su nombre y sus cupos.","incluye":["Todo lo del Esencial","Hasta 150 invitaciones","Envío por WhatsApp con un toque","Los modelos exclusivos (Épicos, Anime e Interactivos)","Música y hasta 10 fotos","1 ronda de ajustes"]},
    {"id":"premium","nombre":"Premium","precio":219,"revisiones":1,"maxFotos":20,"musica":true,"listaInvitados":true,"canales":["correo","whatsapp"],"maxInvitaciones":300,"modelosExclusivos":true,"mesas":true,"recordatorios":true,"aMedida":false,"cambiarModelo":true,"resumen":"El panel completo: mesas, recordatorios y cambio de modelo.","incluye":["Todo lo del Clásico","Hasta 300 invitaciones","Mesas: cada invitado ve la suya","Recordatorios automáticos a quienes no responden","Cambien de modelo cuando quieran","Hasta 20 fotos y 2 secciones extra"]},
  ];
  let PAGO = { yappy: "6665-3528", whatsapp: CFG.whatsapp || "50763454868" };
  // Save the date (producto de entrada), precio de lanzamiento, descuento de planners y eventos activos: los manda el servidor.
  // Sin config del servidor (o con un servidor anterior) no se ofrece el Save the date.
  let STD = null;
  let LANZ = null, REF_DESC = 10, CREDITO = 29, EVENTOS = [{ id: "boda", nombre: "Boda", activo: true }];
  const planById = id => (id === "std" && STD ? STD : PLANES.find(p => p.id === id) || PLANES[1]);
  const medir = (e, p) => { try { window.medir && window.medir(e, p); } catch {} };
  // Lo que paga cada plan hoy: lanzamiento, código del planner y crédito de un Save the date. El servidor confirma el monto final.
  function precioDe(pl, conDescuentos = true) {
    const lista = pl.precio; let precio = lista; const notas = [];
    if (!pl.std && LANZ && LANZ.activo && LANZ.plan === pl.id) { precio = LANZ.precio; notas.push(["Precio de lanzamiento", precio - lista]); }
    if (conDescuentos && !pl.std && data.referidoOk) { const d = Math.round(precio * (100 - REF_DESC) / 100) - precio; precio += d; notas.push([`Código ${data.referido} (−${REF_DESC}%)`, d]); }
    if (conDescuentos && !pl.std && data.credito) { const d = -Math.min(precio, CREDITO); precio += d; notas.push(["Crédito de su Save the date", d]); }
    return { lista, precio, notas };
  }
  const precioHtml = (pl, conDescuentos = true) => { const x = precioDe(pl, conDescuentos); return x.precio < x.lista ? `<s>${money(x.lista)}</s> ${money(x.precio)}` : money(x.precio); };
  // Modelos exclusivos: vienen desde el plan Clásico.
  const ORDEN = { std: 0, esencial: 0, clasico: 1, premium: 2 };
  const alcanza = (planId, m) => !m || !m.plan || (ORDEN[planId] ?? 0) >= (ORDEN[m.plan] ?? 0);
  const modeloActual = () => MODELS.find(m => m.id === data.modelo);
  const sello = m => (m.plan ? el("span", { class: "excl", text: "Clásico y Premium" }) : null);

  // ---------- Datos del pedido ----------
  // La zona por defecto es la del teléfono de quien compra, si es una de las que atendemos.
  const zonaLocal = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ""; } })();
  const data = Object.assign({ plan: "clasico", modelo: "", hora: "16:00", zona: ["America/Mexico_City", "America/Cancun", "America/Tijuana", "Europe/Madrid", "Atlantic/Canary", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Puerto_Rico", "America/Santo_Domingo", "America/Costa_Rica", "America/Guatemala", "America/Bogota", "America/Lima"].includes(zonaLocal) ? zonaLocal : "America/Panama", acompanantes: "si", cupoGeneral: 2, programa: [], ceremonia: "Ceremonia",
    preguntarAlergias: true, preguntarCancion: false }, store.get(STORE) || {});
  if (!data.tipo) data.tipo = "boda";
  if (!data.referido && window.loveRef && window.loveRef()) data.referido = window.loveRef();
  const save = () => store.set(STORE, data);
  const esQuince = () => data.tipo === "quince";
  let fotos = []; // { url, b64 }
  let portada = 0;

  // ---------- Portada: demo en el teléfono ----------
  let heroCtl = Motor.construir($("#heroDemo"), { modelo: "esmeralda", datos: {} });
  let heroIdx = MODELS.findIndex(m => m.id === "esmeralda");
  $("#heroDemo").addEventListener("click", () => {}, { once: true });
  if (!reduced) setInterval(() => {
    if (document.hidden || !$("#wizard").hidden || !$("#preview").hidden) return;
    const r = $("#heroDemo").getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    heroIdx = (heroIdx + 1) % MODELS.length;
    const m = MODELS[heroIdx];
    $("#heroModelName").textContent = m.name;
    heroCtl = Motor.construir($("#heroDemo"), { modelo: m.id, datos: {}, autoAbrir: true });
  }, 9000);

  // ---------- Catálogo ----------
  const fams = ["Todos", ...new Set(MODELS.map(m => m.family))];
  const plural = { Elegante: "Elegantes", "Orgánico": "Orgánicos", "Épico": "Épicos" };
  fams.forEach((f, i) => $("#filters").append(el("button", { class: "chip", type: "button", "aria-pressed": String(i === 0), text: plural[f] || f,
    onclick: e => { $$("#filters .chip").forEach(c => c.setAttribute("aria-pressed", String(c === e.currentTarget))); $$("#catalog .mcard").forEach(c => (c.hidden = f !== "Todos" && c.dataset.family !== f)); } })));
  const art = m => el("div", { class: "mart" }, [el("img", { class: "mart-a", src: Motor.asset(m, "sobre", true), alt: "", loading: "lazy", decoding: "async" }), el("img", { class: "mart-b", src: Motor.asset(m, "portada", true), alt: "", loading: "lazy", decoding: "async" })]);
  MODELS.forEach((m, i) => $("#catalog").append(el("button", { class: "mcard", type: "button", "data-family": m.family, "aria-label": `Ver el modelo ${m.name}`, onclick: () => abrirVista(m.id) }, [
    art(m), sello(m), el("div", { class: "mmeta" }, [el("div", {}, [el("b", { text: `${pad(i + 1)} · ${m.name}` }), el("small", { text: m.family })]), el("span", { class: "see", html: `Ver modelo ${arrow}` })])])));

  // ---------- Volver a su boda ----------
  (() => { const g = store.get("ml-boda"); const a = $("#navEntrar"); if (g && g.h && a) { a.href = `portal/#${g.h}`; a.textContent = "Mi boda"; a.title = `Continuar con la boda de ${g.nombres}`; } })();

  // ---------- Planes ----------
  function pintarPlanes() {
    const box = $("#plans"); box.textContent = "";
    const lz = LANZ && LANZ.activo ? LANZ : null;
    const banner = $("#lanzBanner");
    if (banner) { banner.hidden = !lz; if (lz) banner.innerHTML = `<b>Precio de lanzamiento:</b> el plan ${esc(planById(lz.plan).nombre)} a <b>US$${lz.precio}</b> en vez de US$${lz.antes} para las primeras ${lz.cupos} parejas. <span class="lz-quedan">Quedan ${lz.quedan} de ${lz.cupos}.</span>`; }
    $$("[data-lanz]").forEach(n => { n.hidden = !lz; if (lz) n.textContent = `Clásico a US$${lz.precio} (antes US$${lz.antes}) · quedan ${lz.quedan} de ${lz.cupos} cupos de lanzamiento`; });
    PLANES.forEach(p => box.append(el("article", { class: "plan" + (p.destacado ? " rec" : "") }, [
      p.destacado ? el("span", { class: "badge", text: lz && lz.plan === p.id ? `Lanzamiento · quedan ${lz.quedan}` : "Recomendado" }) : null,
      el("h3", { text: p.nombre }), el("p", { class: "fmt", text: p.resumen }),
      lz && lz.plan === p.id
        ? el("p", { class: "price", html: `<small>USD</small>${lz.precio} <s class="antes">${lz.antes}</s>` })
        : el("p", { class: "price", html: `<small>USD</small>${p.precio}` }),
      el("p", { class: "per", text: lz && lz.plan === p.id ? `Pago único · precio de lanzamiento para las primeras ${lz.cupos} parejas` : "Pago único" }),
      el("ul", {}, p.incluye.map(t => el("li", { html: `<svg aria-hidden="true"><use href="#delta"/></svg>${esc(t)}` }))),
      el("button", { class: "btn", type: "button", html: `Elegir ${esc(p.nombre)} ${arrow}`, onclick: () => { data.plan = p.id; save(); abrirPedido(data.modelo ? 2 : 1); } }),
    ])));
    const sd = $("#stdCard");
    if (sd && !STD) sd.textContent = "";
    if (sd && STD) {
      sd.textContent = "";
      sd.append(el("div", { class: "std-txt" }, [el("span", { class: "label", text: "¿Todavía no tienen todos los detalles?" }), el("h3", { text: `${STD.nombre} · US$${STD.precio}` }),
        el("p", { text: `${STD.resumen} Si después compran la invitación completa, se les descuentan los US$${CREDITO}.` }),
        el("ul", {}, STD.incluye.slice(0, 4).map(t => el("li", { html: `<svg aria-hidden="true"><use href="#delta"/></svg>${esc(t)}` })))]),
        el("button", { class: "btn gold", type: "button", html: `Empezar con el Save the date ${arrow}`, onclick: () => { data.plan = "std"; data.credito = null; if (modeloActual() && modeloActual().plan) data.modelo = ""; save(); abrirPedido(data.modelo ? 2 : 1); } }));
    }
  }
  // Reseñas aprobadas (con permiso de la pareja). Si no hay, la sección no aparece.
  function pintarResenas(rs) {
    const sec = $("#resenas"), box = $("#resenasLista"); if (!sec || !box) return;
    sec.hidden = !rs.length; box.textContent = "";
    rs.forEach(r => box.append(el("figure", { class: "resena" }, [el("p", { class: "estrellas", "aria-label": `${r.estrellas} de 5`, text: "★".repeat(r.estrellas) + "☆".repeat(5 - r.estrellas) }),
      el("blockquote", { text: r.texto }), el("figcaption", { text: `${r.nombres}${r.tipo_evento === "quince" ? " · XV años" : ""}` })])));
  }
  // Código del wedding planner: se valida con el servidor antes de aplicar el descuento.
  async function revisarReferido(cod) {
    cod = String(cod || "").trim().toUpperCase();
    data.referido = cod; data.referidoOk = false; data.referidoNombre = ""; save();
    if (!cod || !API) return false;
    try {
      const r = await fetch(`${API}/love/api/referido?c=${encodeURIComponent(cod)}`); const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { data.referido = j.codigo; data.referidoOk = true; data.referidoNombre = j.nombre; save(); return true; }
    } catch {}
    return false;
  }
  pintarPlanes();
  let CLAVE_HUMANO = null;
  const humano = window.Humano ? window.Humano($("#humanoPedido")) : null;
  const cfgListo = !API ? Promise.resolve() : fetch(API + "/love/api/config").then(r => r.json()).then(c => {
    if (c && c.ok) {
      PLANES = c.planes.filter(p => !p.std).map(p => ({ ...p, incluye: p.incluye })); PAGO = { ...PAGO, ...c.pago }; CLAVE_HUMANO = c.turnstile || null;
      if (c.std) STD = c.std; LANZ = c.lanzamiento || null; if (c.referido) REF_DESC = c.referido.descuento; if (c.creditoStd) CREDITO = c.creditoStd;
      if (Array.isArray(c.eventos)) EVENTOS = c.eventos.filter(e => e.activo);
      $$("[data-cfg=revisionExtra]").forEach(n => (n.textContent = c.revisionExtra)); pintarPlanes(); pintarResenas(c.resenas || []);
      if (data.referido && !data.referidoOk) revisarReferido(data.referido);
    }
  }).catch(() => {});

  // ---------- Vista previa de modelo ----------
  const modal = $("#preview");
  let vistaModelo = null, ultimoFoco = null;
  function abrirVista(id) {
    const m = Motor.modelById(id); vistaModelo = m; ultimoFoco = document.activeElement;
    medir("ver_modelo", { modelo: id });
    $("#previewTitle").textContent = m.name; $("#previewFamily").textContent = m.family; $("#previewBlurb").textContent = m.blurb;
    modal.hidden = false; document.body.classList.add("locked");
    Motor.construir($("#previewScreen"), { modelo: m.id, datos: datosVista(), fotos: fotos.map(f => f.url), portada, autoAbrir: true, vista: true });
    $("[data-close]", modal).focus();
  }
  function cerrarVista() {
    modal.hidden = true; if ($("#wizard").hidden) document.body.classList.remove("locked");
    Motor.construir($("#previewScreen"), { modelo: vistaModelo.id, datos: {} }); $("#previewScreen").textContent = "";
    if (ultimoFoco) ultimoFoco.focus();
  }
  $("[data-close]", modal).addEventListener("click", cerrarVista);
  modal.addEventListener("click", e => { if (e.target === modal) cerrarVista(); });
  $("#previewReplay").addEventListener("click", () => Motor.construir($("#previewScreen"), { modelo: vistaModelo.id, datos: datosVista(), fotos: fotos.map(f => f.url), portada, autoAbrir: true, vista: true }));
  $("#previewChoose").addEventListener("click", () => {
    data.modelo = vistaModelo.id; save(); cerrarVista();
    if ($("#wizard").hidden) abrirPedido(2); else { pintarPaso(); actualizarVista(true); }
  });
  const datosVista = () => (data.nombre1 && (data.nombre2 || esQuince()) ? data : { tipo: data.tipo });

  // ---------- Pedido por pasos ----------
  const PASOS = [
    { t: "Elijan su modelo", s: "Toquen uno para elegirlo. Con «Ver» lo abren en grande." },
    { t: "Empecemos por ustedes", s: "Escriban sus nombres y su fecha: la invitación se arma en vivo." },
    { t: "Elijan su plan", s: "Un solo pago. Pueden empezar por cualquiera." },
    { t: "¿Dónde y a qué hora?", s: "Ceremonia, recepción y programa del día." },
    { t: "Los detalles", s: "Todo es opcional. Lo que escriban aparece en la invitación con elegancia." },
    { t: "Fotos y estilo", s: "Opcional. Sin fotos, la invitación usa el arte de su modelo." },
    { t: "Antes de pagar", s: "Sus datos de contacto y las condiciones." },
    { t: "Revisemos todo", s: "Si algo no está bien, toquen «Editar»." },
  ];
  let paso = 1;
  const wiz = $("#wizard"), form = $("#wForm"), err = $("#wError");
  // Los campos opcionales que no aplican llegan como null: no se dibujan.
  { const ap = form.append.bind(form); form.append = (...k) => ap(...k.filter(x => x != null && x !== false)); }
  PASOS.forEach(() => $("#progress").append(el("i")));

  function abrirPedido(n = 1) {
    ultimoFoco = document.activeElement;
    medir("iniciar", { plan: data.plan });
    wiz.hidden = false; document.body.classList.add("locked");
    const pendiente = store.get(PENDIENTE);
    if (pendiente && pendiente.id) { mostrarPago(pendiente); return; }
    irA(n);
  }
  function cerrarPedido() { wiz.hidden = true; document.body.classList.remove("locked"); if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus(); }
  $$("[data-start]").forEach(b => b.addEventListener("click", () => abrirPedido(data.modelo ? 2 : 1)));
  $("#wClose").addEventListener("click", cerrarPedido);
  document.addEventListener("keydown", e => { if (e.key !== "Escape") return; if (!modal.hidden) cerrarVista(); else if (!wiz.hidden) cerrarPedido(); });
  $("#wBack").addEventListener("click", () => (paso === 1 ? cerrarPedido() : irA(paso === 7 && data.plan === "std" ? 4 : paso - 1)));
  $("#wReplay").addEventListener("click", () => actualizarVista(true));
  $("#wPeek").addEventListener("click", () => { if (!data.modelo) { err.textContent = "Primero elijan un modelo."; return; } abrirVista(data.modelo); });

  function irA(n) {
    paso = n; err.textContent = "";
    $("#wCount").textContent = n <= 7 ? `Paso ${n} de 7` : "Resumen";
    $("#wTitle").textContent = n === 2 && esQuince() ? "Empecemos por la quinceañera" : PASOS[n - 1].t; $("#wSub").textContent = PASOS[n - 1].s;
    $$("#progress i").forEach((b, i) => b.classList.toggle("on", i < n));
    $("#wBack").textContent = n === 1 ? "Cancelar" : "Atrás";
    $("#wNext").innerHTML = (n === 8 ? "Confirmar y pagar" : n === 7 ? "Revisar mi pedido" : "Siguiente") + " " + arrow;
    $("#wNav").hidden = false; $(".w-side").hidden = false; wiz.classList.remove("pagando");
    pintarPaso();
    const caja = $("#humanoPedido"); caja.hidden = n !== 8;
    if (n === 8 && humano) cfgListo.then(() => humano.preparar(CLAVE_HUMANO));
    wiz.scrollTop = 0; $(".w-main").scrollTop = 0;
    $("#wTitle").focus({ preventScroll: true });
    actualizarVista(n <= 2);
  }

  // Campos
  // Buscador de lugares (OpenStreetMap, sin costo): escriben el nombre, eligen y se llenan lugar, dirección y el punto exacto del mapa.
  // Zonas: hora de la boda y país donde buscar el lugar (caja de búsqueda del buscador).
  const ZONAS = [
    ["America/Panama", "Panamá", "-83.1,7.1,-77.1,9.7"],
    ["America/Mexico_City", "México (centro)", "-118.4,14.5,-86.7,32.8"],
    ["America/Cancun", "México (Cancún / Quintana Roo)", "-118.4,14.5,-86.7,32.8"],
    ["America/Tijuana", "México (Tijuana / Baja California)", "-118.4,14.5,-86.7,32.8"],
    ["Europe/Madrid", "España", "-18.2,27.6,4.4,43.9"],
    ["Atlantic/Canary", "España (Canarias)", "-18.2,27.6,-13.3,29.5"],
    ["America/New_York", "EE. UU. (Nueva York, Miami, este)", "-125,24,-66.9,49.5"],
    ["America/Chicago", "EE. UU. (Texas, Chicago, centro)", "-125,24,-66.9,49.5"],
    ["America/Denver", "EE. UU. (Denver, Phoenix)", "-125,24,-66.9,49.5"],
    ["America/Los_Angeles", "EE. UU. (Los Ángeles, oeste)", "-125,24,-66.9,49.5"],
    ["America/Puerto_Rico", "Puerto Rico", "-67.4,17.8,-65.2,18.6"],
    ["America/Santo_Domingo", "República Dominicana", "-72.1,17.4,-68.2,20"],
    ["America/Costa_Rica", "Costa Rica", "-86,8,-82.5,11.3"],
    ["America/Guatemala", "Guatemala / El Salvador / Honduras", "-92.3,12.9,-83.1,17.9"],
    ["America/Bogota", "Colombia", "-79.1,-4.3,-66.8,12.6"],
    ["America/Lima", "Perú / Ecuador", "-81.4,-18.4,-68.6,1.5"],
  ];
  const bboxZona = () => (ZONAS.find(z => z[0] === data.zona) || ZONAS[0])[2];
  function buscadorLugar(pref) {
    const ruta = (k) => (pref ? `${pref}.${k}` : k);
    const leer = (k) => (pref ? (data[pref] || {})[k] : data[k]);
    const poner = (k, v) => { if (pref) { data[pref] = data[pref] || {}; data[pref][k] = v; } else data[k] = v; };
    const q = el("input", { type: "search", class: "lb-q", autocomplete: "off", enterkeyhint: "search", placeholder: pref ? "Busquen el salón: Hotel…, Club…, Hacienda…" : "Busquen el lugar: Iglesia del Carmen, Hotel…", "aria-label": "Buscar el lugar" });
    const lista = el("ul", { class: "lb-lista", role: "listbox", hidden: true });
    const vista = el("div", { class: "lb-vista", hidden: true });
    let t, ctl, res = [];
    const quitarVista = () => { vista.hidden = true; vista.replaceChildren(); };
    // Vista del mapa con mosaicos (sin iframes de otros sitios): el punto queda al centro, con su pin.
    const mapaFijo = (la, lo, z = 16) => {
      const n = 2 ** z, fx = (lo + 180) / 360 * n, rad = la * Math.PI / 180, fy = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n;
      const tx = Math.floor(fx), ty = Math.floor(fy), dx = (fx - tx) * 256, dy = (fy - ty) * 256;
      const capa = el("div", { class: "lb-tiles", style: `left:calc(50% - ${(256 + dx).toFixed(1)}px);top:calc(50% - ${(256 + dy).toFixed(1)}px)` });
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) capa.append(el("img", { src: `https://tile.openstreetmap.org/${z}/${tx + i}/${ty + j}.png`, alt: "", style: `left:${(i + 1) * 256}px;top:${(j + 1) * 256}px`, loading: "lazy" }));
      return el("div", { class: "lb-mapa", role: "img", "aria-label": "Mapa del lugar elegido" }, [capa, el("span", { class: "lb-pin", "aria-hidden": "true" }), el("small", { class: "lb-attr", text: "© OpenStreetMap" })]);
    };
    const mostrar = (geo, nombre) => {
      const [la, lo] = geo.split(",").map(Number);
      const gm = `https://www.google.com/maps/search/?api=1&query=${la},${lo}`;
      vista.replaceChildren(mapaFijo(la, lo),
        el("p", { class: "hint", html: `<b>¿Es aquí?</b> Así llegan sus invitados con Google Maps y Waze (<a href="${gm}" target="_blank" rel="noopener">verlo en Google Maps</a>). Si no es, busquen de nuevo o peguen su enlace de Google Maps abajo.` }));
      vista.hidden = false;
    };
    const texto = (p) => {
      const calle = p.street ? `${p.street}${p.housenumber ? " " + p.housenumber : ""}` : "";
      return [...new Set([calle, p.district || p.locality, p.city || p.county, p.state].filter(Boolean))].filter(x => x !== p.name).join(", ");
    };
    const pintar = () => {
      lista.replaceChildren(...(res.length ? res.map((f, i) => el("li", { role: "option" }, [el("button", { type: "button", "data-i": i }, [el("b", { text: f.properties.name || texto(f.properties) }), el("small", { text: texto(f.properties) })])]))
        : [el("li", { class: "lb-nada", text: "No lo encontramos. Escríbanlo abajo a mano: armamos el botón del mapa con la dirección." })]));
      lista.hidden = false;
    };
    const buscar = async (v) => {
      if (ctl) ctl.abort(); ctl = new AbortController();
      try {
        const j = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(v)}&limit=7&bbox=${bboxZona()}`, { signal: ctl.signal }).then(r => r.json());
        const vistos = new Set();
        res = (j.features || []).filter(f => { const k = (f.properties.name || "") + texto(f.properties); if (vistos.has(k)) return false; vistos.add(k); return true; }).slice(0, 5);
        pintar();
      } catch (e) { if (e.name !== "AbortError") { res = []; lista.hidden = true; } }
    };
    q.addEventListener("input", () => { clearTimeout(t); const v = q.value.trim(); if (v.length < 3) { lista.hidden = true; return; } t = setTimeout(() => buscar(v), 350); });
    q.addEventListener("keydown", e => { if (e.key === "Escape") lista.hidden = true; });
    lista.addEventListener("click", e => {
      const b = e.target.closest("button[data-i]"); if (!b) return;
      const f = res[Number(b.dataset.i)], p = f.properties, [lo, la] = f.geometry.coordinates;
      const nombre = (p.name || "").slice(0, 80), dir = texto(p).slice(0, 160);
      const fijar = (k, v) => { const i = document.getElementById("f-" + ruta(k)); if (i) { i.value = v; i.dispatchEvent(new Event("input", { bubbles: true })); } };
      if (nombre) fijar("lugar", nombre);
      fijar("direccion", dir);
      poner("geo", `${la.toFixed(6)},${lo.toFixed(6)}`); save();
      lista.hidden = true; q.value = ""; mostrar(leer("geo"), nombre || dir);
    });
    // Si después corrigen el lugar a mano, el punto del mapa ya no corresponde.
    setTimeout(() => ["lugar", "direccion"].forEach(k => { const i = document.getElementById("f-" + ruta(k)); if (i) i.addEventListener("input", e => { if (e.isTrusted && leer("geo")) { poner("geo", ""); save(); quitarVista(); } }); }), 0);
    if (leer("geo")) setTimeout(() => mostrar(leer("geo"), leer("lugar") || ""), 0);
    return el("div", { class: "lugar-busca" }, [el("span", { class: "lb-l", text: pref ? "Busquen la recepción" : "Busquen el lugar" }), el("div", { class: "lb-caja" }, [q, lista]), vista]);
  }

  const campo = (label, input, ayuda, opcional) => el("label", { class: "field" }, [el("span", { html: esc(label) + (opcional ? ' <em>(opcional)</em>' : "") }), input, ayuda ? el("small", { class: "hint", text: ayuda }) : null]);
  const inp = (name, attrs = {}) => { const i = el("input", { name, id: "f-" + name, ...attrs }); const v = name.split(".").reduce((o, k) => (o ? o[k] : undefined), data); if (v != null && attrs.type !== "checkbox") i.value = v; if (attrs.type === "checkbox") i.checked = !!v; return i; };
  const area = (name, attrs = {}) => { const t = el("textarea", { name, id: "f-" + name, rows: "2", ...attrs }); t.value = data[name] || ""; return t; };
  const fila = (...k) => el("div", { class: "row2" }, k);
  const check = (name, texto) => el("label", { class: "check" }, [inp(name, { type: "checkbox" }), el("span", { html: texto })]);

  function pintarPaso() {
    form.textContent = "";
    const p = planById(data.plan);
    if (paso === 1) {
      const box = el("div", { class: "pick", role: "radiogroup", "aria-label": "Modelo de invitación" });
      MODELS.forEach(m => {
        const card = el("div", { class: "pcard-m", role: "radio", tabindex: "0", "aria-checked": String(data.modelo === m.id), "aria-label": m.plan ? `${m.name} (planes Clásico y Premium)` : m.name }, [art(m), sello(m),
          el("div", { class: "mmeta" }, [el("div", {}, [el("b", { text: m.name }), el("small", { text: m.family })]),
            el("button", { class: "see", type: "button", text: "Ver", "aria-label": `Ver ${m.name} en grande`, onclick: e => { e.stopPropagation(); abrirVista(m.id); } })])]);
        const elegir = () => {
          if (data.plan === "std" && m.plan) { err.textContent = `El Save the date viene con los modelos sin sello. ${m.name} está en la invitación completa (Clásico o Premium).`; return; }
          data.modelo = m.id; if (!alcanza(data.plan, m)) data.plan = "clasico"; save(); $$(".pcard-m", box).forEach(c => c.setAttribute("aria-checked", String(c === card))); err.textContent = ""; actualizarVista(true); };
        card.addEventListener("click", elegir);
        card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(); } });
        box.append(card);
      });
      form.append(box);
    }
    if (paso === 2) {
      const tipos = EVENTOS.length > 1 ? el("div", { class: "tipo-pick", role: "radiogroup", "aria-label": "Tipo de evento" }, EVENTOS.map(ev => el("button", { type: "button", role: "radio", class: "chip", "aria-checked": String(data.tipo === ev.id), text: ev.nombre,
        onclick: () => { data.tipo = ev.id; if (ev.id === "quince") data.nombre2 = ""; save(); pintarPaso(); actualizarVista(false); } }))) : null;
      form.append(
        tipos,
        esQuince()
          ? campo("Nombre de la quinceañera", inp("nombre1", { maxlength: "40", autocomplete: "off", placeholder: "Ej.: Valeria", required: true }))
          : fila(campo("Nombre (1)", inp("nombre1", { maxlength: "40", autocomplete: "off", placeholder: "Ej.: Ana", required: true })), campo("Nombre (2)", inp("nombre2", { maxlength: "40", autocomplete: "off", placeholder: "Ej.: Luis", required: true }))),
        campo(esQuince() ? "Su frase" : "Su frase", inp("frase", { maxlength: "120", placeholder: esQuince() ? "Ej.: Una noche para recordar siempre" : "Ej.: Elegimos el mismo camino" }), "Va en la portada.", true),
        fila(campo(esQuince() ? "Fecha de la fiesta" : "Fecha de la boda", inp("fecha", { type: "date", min: hoy(), max: maxFecha(), required: true }), "", false), campo("Hora", inp("hora", { type: "time", required: true }))),
        el("p", { class: "fecha-clara", id: "fechaClara", "aria-live": "polite" }),
        campo(esQuince() ? "País de la fiesta" : "País de la boda", (() => { const s = el("select", { name: "zona", id: "f-zona" }); ZONAS.map(z => [z[0], z[1]]).forEach(([v, t]) => s.append(el("option", { value: v, text: t }))); s.value = data.zona; return s; })(), "Para la hora exacta y para buscar el lugar en el mapa."),
      );
      fechaClara();
    }
    if (paso === 3) {
      const box = el("div", { class: "plan-pick", role: "radiogroup", "aria-label": "Plan" });
      const mod = modeloActual();
      PLANES.forEach(pl => {
        const bloqueado = mod && !alcanza(pl.id, mod);
        const c = el("div", { class: "pp" + (pl.destacado ? " rec" : "") + (bloqueado ? " off" : ""), role: "radio", tabindex: bloqueado ? "-1" : "0", "aria-disabled": String(bloqueado), "aria-checked": String(data.plan === pl.id) }, [
          pl.destacado ? el("span", { class: "badge", text: "Recomendado" }) : null,
          el("div", { class: "pp-h" }, [el("b", { text: pl.nombre }), el("span", { class: "pp-price", html: precioHtml(pl) })]),
          LANZ && LANZ.activo && LANZ.plan === pl.id ? el("p", { class: "pp-lz", text: `Precio de lanzamiento · quedan ${LANZ.quedan} de ${LANZ.cupos}` }) : null,
          el("p", { class: "pp-r", text: pl.resumen }),
          bloqueado ? el("p", { class: "pp-off", text: `No incluye el modelo ${mod.name}. Elijan Clásico o Premium, o cambien de modelo en el paso 1.` }) : null,
          el("ul", {}, pl.incluye.map(t => el("li", { text: t }))),
        ]);
        const elegir = () => {
          if (bloqueado) { err.textContent = `El modelo ${mod.name} viene en los planes Clásico y Premium.`; return; }
          data.plan = pl.id; save(); err.textContent = "";
          $$(".pp", box).forEach(x => x.setAttribute("aria-checked", String(x === c)));
        };
        c.addEventListener("click", elegir); c.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(); } });
        box.append(c);
      });
      // Save the date: opción de entrada (sin lista ni confirmaciones). No aplica si ya vienen con crédito.
      if (!data.credito && STD) {
        const mod2 = modeloActual(), bloq = mod2 && mod2.plan;
        const c = el("div", { class: "pp std" + (bloq ? " off" : ""), role: "radio", tabindex: bloq ? "-1" : "0", "aria-disabled": String(Boolean(bloq)), "aria-checked": String(data.plan === "std") }, [
          el("div", { class: "pp-h" }, [el("b", { text: `Solo ${STD.nombre}` }), el("span", { class: "pp-price", html: money(STD.precio) })]),
          el("p", { class: "pp-r", text: `${STD.resumen} Sin lista ni confirmaciones. Si después compran la invitación, se les descuentan los US$${CREDITO}.` }),
          bloq ? el("p", { class: "pp-off", text: `No incluye el modelo ${mod2.name}. Cambien de modelo en el paso 1.` }) : null]);
        const elegir = () => { if (bloq) return; data.plan = "std"; save(); err.textContent = ""; $$(".pp", box).forEach(x => x.setAttribute("aria-checked", String(x === c))); actualizarVista(false); };
        c.addEventListener("click", elegir); c.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(); } });
        box.append(c);
      }
      if (data.credito) form.append(el("p", { class: "credito-nota", text: `Tienen US$${CREDITO} de crédito de su Save the date: ya está descontado en los precios.` }));
      form.append(box,
        el("p", { class: "hint", text: "Corregir datos después (fecha, lugar, horas) es gratis y no gasta su ronda de ajustes." }));
    }
    if (paso === 4) {
      const rec = el("div", { class: "sub-block", id: "recBlock" }, [
        buscadorLugar("recepcion"),
        campo("Lugar de la recepción", inp("recepcion.lugar", { maxlength: "80", placeholder: "Ej.: Salón Las Américas" })),
        campo("Dirección de la recepción", inp("recepcion.direccion", { maxlength: "160" })),
        fila(campo("Hora de la recepción", inp("recepcion.hora", { type: "time" }), "", true), campo("Enlace de Google Maps", inp("recepcion.mapa", { type: "url", inputmode: "url", placeholder: "https://maps.app.goo.gl/…" }), "Solo si no lo encontraron arriba.", true)),
      ]);
      const otro = el("label", { class: "check" }, [el("input", { type: "checkbox", id: "f-otroLugar", ...(data.recepcion && data.recepcion.lugar ? { checked: true } : {}) }), el("span", { text: "La recepción es en otro lugar" })]);
      rec.hidden = !(data.recepcion && data.recepcion.lugar);
      otro.querySelector("input").addEventListener("change", e => { rec.hidden = !e.target.checked; if (!e.target.checked) { data.recepcion = null; save(); } });
      const prog = el("div", { class: "program", id: "progList" });
      form.append(
        campo("¿Cómo llaman a la ceremonia?", (() => { const s = el("select", { name: "ceremonia", id: "f-ceremonia" }); ["Ceremonia", "Ceremonia religiosa", "Misa", "Ceremonia civil", "Ceremonia simbólica"].forEach(v => s.append(el("option", { value: v, text: v }))); s.value = data.ceremonia || "Ceremonia"; return s; })()),
        buscadorLugar(""),
        campo("Lugar", inp("lugar", { maxlength: "80", placeholder: "Ej.: Iglesia San Francisco de Asís", required: true })),
        campo("Dirección", inp("direccion", { maxlength: "160", placeholder: "Ciudad, calle o referencia", required: true })),
        campo("Enlace de Google Maps", inp("mapa", { type: "url", inputmode: "url", placeholder: "https://maps.app.goo.gl/…" }), "Solo si no lo encontraron arriba. Si no lo tienen, armamos el botón con la dirección.", true),
        otro, rec,
        el("p", { class: "label", style: "margin-top:18px", text: "Programa del día (opcional)" }), prog,
        el("button", { class: "link", type: "button", text: "+ Añadir momento", onclick: () => { data.programa = data.programa || []; if (data.programa.length < 8) { data.programa.push({ hora: "", acto: "" }); save(); pintarPrograma(); } } }),
      );
      pintarPrograma();
    }
    if (paso === 5) {
      const premium = p.id === "premium";
      form.append(
        esQuince() ? campo("Padres de " + (data.nombre1 || "la quinceañera"), inp("padres1", { maxlength: "120", placeholder: "Ej.: Carlos Pérez y María Gómez" }), "", true)
          : fila(campo("Padres de " + (data.nombre1 || "(1)"), inp("padres1", { maxlength: "120", placeholder: "Ej.: Carlos Pérez y María Gómez" }), "", true), campo("Padres de " + (data.nombre2 || "(2)"), inp("padres2", { maxlength: "120" }), "", true)),
        campo("Padrinos", inp("padrinos", { maxlength: "200" }), "", true),
        campo("Código de vestimenta", inp("vestimenta", { maxlength: "200", placeholder: "Ej.: Formal. Guayabera blanca para ellos." }), "", true),
        campo("Regalos", area("regalos", { maxlength: "300", placeholder: "Ej.: Su presencia es nuestro mejor regalo. Si desean, lluvia de sobres." }), "", true),
        fila(campo("Yappy para regalos", inp("regalosYappy", { maxlength: "30", inputmode: "tel", placeholder: "6000-0000" }), "Aparece con un botón para copiar.", true), campo("Enlace de mesa de regalos", inp("regalosEnlace", { type: "url", placeholder: "https://…" }), "", true)),
        check("soloAdultos", "La celebración es solo para adultos"),
        el("p", { class: "label", style: "margin-top:18px", text: "Confirmaciones" }),
        campo("Confirmar antes del", inp("fechaLimite", { type: "date", min: hoy(), max: data.fecha || maxFecha() }), "Después de esta fecha la invitación deja de recibir respuestas.", true),
        p.listaInvitados ? null : fila(campo("Cupos por confirmación", (() => { const s = el("select", { name: "cupoGeneral", id: "f-cupoGeneral" }); for (let i = 1; i <= 6; i++) s.append(el("option", { value: String(i), text: i === 1 ? "Solo la persona" : `Hasta ${i} personas` })); s.value = String(data.cupoGeneral || 2); return s; })(), "Con su enlace general, cada respuesta incluye hasta esta cantidad.")),
        check("preguntarAlergias", "Preguntar alergias o comida especial"),
        check("preguntarCancion", "Pedir a cada invitado una canción para la fiesta"),
        premium ? el("p", { class: "label", style: "margin-top:18px", text: "Secciones Premium" }) : el("p", { class: "hint", html: "Con el plan <b>Premium</b> también pueden contar su historia, el hospedaje y el transporte." }),
        premium ? campo("Nuestra historia", area("historia", { maxlength: "900", rows: "3", placeholder: "Cómo se conocieron, la propuesta…" }), "", true) : null,
        premium ? campo("Hospedaje para invitados", area("hospedaje", { maxlength: "400" }), "", true) : null,
        premium ? campo("Transporte", area("transporte", { maxlength: "300" }), "", true) : null,
        fila(campo("Hashtag", inp("hashtag", { maxlength: "40", placeholder: "#AnaYLuis2027" }), "", true), campo("Transmisión en vivo", inp("transmision", { type: "url", placeholder: "https://…" }), "Para quienes no puedan ir.", true)),
      );
    }
    if (paso === 6) {
      const drop = el("label", { class: "drop" }, [el("input", { type: "file", id: "fotoIn", accept: "image/jpeg,image/png,image/webp,image/heic,image/heif", multiple: true }),
        el("span", { html: `<b>Toquen para subir fotos</b><br><small>Hasta ${p.maxFotos} en su plan · la marcada con ★ va en la portada</small>` })]);
      const ul = el("ul", { class: "thumbs", id: "thumbs" });
      form.append(drop, ul,
        p.musica ? fila(campo("Su canción", inp("musica", { maxlength: "120", placeholder: "Nombre y artista" }), "", true), campo("Enlace de la canción", inp("musicaEnlace", { type: "url", placeholder: "https://open.spotify.com/…" }), "", true)) : null,
        campo("Colores o estilo que les gustaría", inp("estilo", { maxlength: "300", placeholder: "Ej.: verde salvia y dorado, muy minimalista" }), "Claude lo toma en cuenta al diseñar.", true),
        campo("¿Algo más que debamos saber?", area("notas", { maxlength: "1200", rows: "3" }), "", true));
      $("#fotoIn", form).addEventListener("change", subirFotos);
      pintarFotos();
    }
    if (paso === 7) {
      const fx = data.factura || {};
      form.append(
        fila(campo("Su correo", inp("correo", { type: "email", maxlength: "200", autocomplete: "email", required: true, placeholder: "correo@ejemplo.com" }), "Ahí les llega su invitación y su portal."),
          campo("Su WhatsApp", inp("whatsapp", { type: "tel", inputmode: "tel", autocomplete: "tel", required: true, placeholder: "+52 55 1234 5678" }), "Con código de país: +507, +52, +1, +34…")),
        p.std ? null : (() => {
          const i = el("input", { id: "f-referido", maxlength: "30", autocomplete: "off", autocapitalize: "characters", spellcheck: "false", value: data.referido || "", placeholder: "Ej.: ANAEVENTOS" });
          const m = el("small", { class: "hint ref-msg", "aria-live": "polite", text: data.referidoOk ? `Código de ${data.referidoNombre}: ${REF_DESC}% de descuento aplicado.` : "" });
          let t; i.addEventListener("input", () => { clearTimeout(t); data.referidoOk = false; m.textContent = ""; t = setTimeout(async () => { if (!i.value.trim()) { data.referido = ""; save(); return; } m.textContent = "Revisando…"; m.textContent = (await revisarReferido(i.value)) ? `Código de ${data.referidoNombre}: ${REF_DESC}% de descuento aplicado.` : "Ese código no existe o ya no está activo."; }, 500); });
          return el("label", { class: "field" }, [el("span", { html: "¿Los recomendó un wedding planner? <em>(opcional)</em>" }), i, m]);
        })(),
        el("label", { class: "check" }, [el("input", { type: "checkbox", id: "f-quiereFactura", ...(data.quiereFactura ? { checked: true } : {}) }), el("span", { text: "Necesito factura" })]),
        (() => {
          const b = el("div", { class: "sub-block", id: "facBlock" }, [
            campo("Nombre o razón social", el("input", { id: "fx-nombre", maxlength: "120", value: fx.nombre || "" })),
            fila(campo("RUC o cédula", el("input", { id: "fx-ruc", maxlength: "40", value: fx.ruc || "" })), campo("DV", el("input", { id: "fx-dv", maxlength: "4", inputmode: "numeric", value: fx.dv || "" }), "", true)),
            campo("Correo para la factura", el("input", { id: "fx-correo", type: "email", maxlength: "200", value: fx.correo || "" }))]);
          b.hidden = !data.quiereFactura; return b;
        })(),
        el("div", { class: "w-legal" }, [el("p", { html: "<b>Condiciones</b>" }),
          el("p", { text: "Usamos sus datos y fotos solo para crear y publicar su invitación. Es privada: no aparece en buscadores y está disponible hasta tres meses después de la boda; después la borramos." }),
          el("p", { text: "Desde que confirmamos su pago empezamos a diseñar. Por eso no hacemos devoluciones, ni si la boda se cancela. Si se pospone, la invitación sigue siendo suya." }),
          el("p", { html: '<a href="aviso/" target="_blank" rel="noopener">Leer el aviso completo</a>' })]),
        el("label", { class: "check" }, [el("input", { type: "checkbox", id: "ac-aviso" }), el("span", { text: "Leí y acepto el aviso de uso de información." })]),
        el("label", { class: "check" }, [el("input", { type: "checkbox", id: "ac-fotos" }), el("span", { text: "Tengo permiso para usar las fotos que subí." })]),
        el("label", { class: "check" }, [el("input", { type: "checkbox", id: "ac-reembolso" }), el("span", { text: "Entiendo que no hay devoluciones." })]),
        el("label", { class: "check opcional" }, [el("input", { type: "checkbox", id: "ac-novedades", checked: data.novedades === true }), el("span", { html: "<i>(Opcional)</i> Quiero recibir por correo novedades, talleres y ofertas de Mejorativa. Puedo darme de baja cuando quiera." })]),
      );
      $("#f-quiereFactura", form).addEventListener("change", e => { data.quiereFactura = e.target.checked; $("#facBlock", form).hidden = !e.target.checked; save(); });
    }
    if (paso === 8) {
      const m = Motor.modelById(data.modelo);
      const filas = [
        ["Modelo", m.name, 1], [esQuince() ? "Quinceañera" : "Ustedes", `${esQuince() ? data.nombre1 : `${data.nombre1} & ${data.nombre2}`}${data.frase ? ` · “${data.frase}”` : ""}`, 2],
        ["Fecha", `${Motor.longDate(data.fecha)} · ${Motor.hora12(data.hora)}`, 2], ["Plan", `${p.nombre} · ${money(p.precio)}${p.std ? "" : ` · ${p.revisiones === 1 ? "1 ronda de ajustes" : `${p.revisiones} rondas de ajustes`}`}`, 3],
        [data.ceremonia || "Ceremonia", `${data.lugar}, ${data.direccion}`, 4],
        data.recepcion && data.recepcion.lugar ? ["Recepción", `${data.recepcion.lugar}${data.recepcion.hora ? " · " + Motor.hora12(data.recepcion.hora) : ""}`, 4] : null,
        (data.programa || []).filter(a => a.hora && a.acto).length ? ["Programa", data.programa.filter(a => a.hora && a.acto).map(a => `${Motor.hora12(a.hora)} ${a.acto}`).join(" · "), 4] : null,
        ["Detalles", [data.padres1 || data.padres2 ? "padres" : "", data.vestimenta ? "vestimenta" : "", data.regalos || data.regalosYappy ? "regalos" : "", data.soloAdultos ? "solo adultos" : "", data.historia ? "historia" : ""].filter(Boolean).join(", ") || "—", 5],
        ["Confirmar antes del", data.fechaLimite ? Motor.longDate(data.fechaLimite) : "Sin fecha límite", 5],
        ["Fotos", fotos.length ? `${fotos.length}` : "Sin fotos", 6],
        ["Contacto", `${data.correo} · ${data.whatsapp}`, 7], ["Factura", data.quiereFactura ? `${data.factura.nombre} · ${data.factura.ruc}` : "No", 7],
      ].filter(r => r && !(p.std && [5, 6].includes(r[2])));
      form.append(el("dl", { class: "summary" }, filas.flatMap(([k, v, s]) => [el("dt", { text: k }), el("dd", {}, [el("span", { text: v }), el("button", { class: "link", type: "button", text: "Editar", onclick: () => irA(s) })])])),
        ...precioDe(p).notas.map(([t, d]) => el("div", { class: "desc-linea" }, [el("span", { text: t }), el("span", { text: `−${money(-d)}` })])),
        el("div", { class: "total" }, [el("span", { text: "Total" }), el("b", { text: `${money(precioDe(p).precio)} USD` })]),
        el("p", { class: "hint", text: "Al confirmar, les mostramos cómo pagar con Yappy, PayPal o tarjeta. Apenas confirmemos su pago, diseñamos su invitación y les llega en minutos al correo y al WhatsApp." }));
    }
    // Guardar lo que escriban
    $$("input[name], select[name], textarea[name]", form).forEach(i => i.addEventListener("input", () => {
      const v = i.type === "checkbox" ? i.checked : i.value;
      if (i.name.includes(".")) { const [a, b] = i.name.split("."); data[a] = data[a] || {}; data[a][b] = v; } else data[i.name] = i.name === "cupoGeneral" ? Number(v) : v;
      i.removeAttribute("aria-invalid"); err.textContent = ""; save();
      if (["nombre1", "nombre2", "frase", "fecha", "hora", "lugar", "direccion"].includes(i.name)) programarVista();
      if (i.name === "fecha") fechaClara();
    }));
  }
  function fechaClara() {
    const n = $("#fechaClara"); if (!n) return;
    n.textContent = fechaOk(data.fecha) ? `${esQuince() ? "Su fiesta" : "Su boda"}: ${Motor.longDate(data.fecha)}` : "";
  }
  function pintarPrograma() {
    const box = $("#progList"); if (!box) return; box.textContent = "";
    (data.programa || []).forEach((a, i) => {
      const t = el("input", { type: "time", value: a.hora || "", "aria-label": `Hora del momento ${i + 1}` });
      const nm = el("input", { value: a.acto || "", maxlength: "40", placeholder: "Ceremonia, cóctel, cena, fiesta…", "aria-label": `Nombre del momento ${i + 1}` });
      const sync = () => { data.programa[i] = { hora: t.value, acto: nm.value }; save(); programarVista(); };
      t.addEventListener("input", sync); nm.addEventListener("input", sync);
      box.append(el("div", { class: "act" }, [t, nm, el("button", { class: "rm", type: "button", "aria-label": `Quitar el momento ${i + 1}`, html: '<svg class="ico" aria-hidden="true"><use href="#i-x"/></svg>', onclick: () => { data.programa.splice(i, 1); save(); pintarPrograma(); programarVista(); } })]));
    });
  }

  // Fotos: se comprimen a 1600 px en el teléfono antes de subir.
  async function comprimir(file) {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = el("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/jpeg", .82);
    return { url, b64: url.split(",")[1] };
  }
  async function subirFotos(e) {
    const max = planById(data.plan).maxFotos; err.textContent = "";
    for (const f of [...e.target.files]) {
      if (fotos.length >= max) { err.textContent = `Su plan incluye hasta ${max} fotos.`; break; }
      if (f.size > 25 * 1024 * 1024) { err.textContent = `"${f.name}" pesa demasiado.`; continue; }
      try { fotos.push(await comprimir(f)); } catch { err.textContent = `No pudimos leer "${f.name}". Prueben con un JPG o PNG.`; }
    }
    e.target.value = ""; pintarFotos(); programarVista();
  }
  function pintarFotos() {
    const ul = $("#thumbs"); if (!ul) return; ul.textContent = "";
    if (portada >= fotos.length) portada = 0;
    fotos.forEach((f, i) => ul.append(el("li", { class: i === portada ? "cover" : "" }, [
      el("img", { src: f.url, alt: `Foto ${i + 1}${i === portada ? ", portada" : ""}`, tabindex: "0", onclick: () => { portada = i; pintarFotos(); programarVista(); }, onkeydown: ev => { if (ev.key === "Enter") { portada = i; pintarFotos(); programarVista(); } } }),
      i === portada ? el("span", { class: "star", text: "★" }) : null,
      el("button", { class: "rm", type: "button", "aria-label": `Quitar la foto ${i + 1}`, html: '<svg class="ico" aria-hidden="true"><use href="#i-x"/></svg>', onclick: () => { fotos.splice(i, 1); if (portada > i) portada--; pintarFotos(); programarVista(); } })])));
  }

  // Vista previa en vivo (al lado en escritorio; botón «Ver mi invitación» en el teléfono)
  let tVista = null;
  function programarVista() { clearTimeout(tVista); tVista = setTimeout(() => actualizarVista(false), 450); }
  function actualizarVista(abrirSobre) {
    if (!data.modelo) { $("#wPreview").textContent = ""; $("#wPreview").append(el("p", { class: "empty-prev", text: "Elijan un modelo para verlo aquí." })); return; }
    Motor.construir($("#wPreview"), { modelo: data.modelo, datos: datosVista(), fotos: fotos.map(f => f.url), portada, vista: true, autoAbrir: abrirSobre && !reduced, abierta: !abrirSobre, std: data.plan === "std" });
  }

  // Validación de cada paso (las mismas reglas valen en el servidor)
  function falla(input, msg) { if (input) { input.setAttribute("aria-invalid", "true"); input.focus(); } err.textContent = msg; return false; }
  const urlOk = v => !v || /^https:\/\/\S+$/i.test(v);
  function validar(n) {
    const f = name => form.querySelector(`[name="${name}"]`);
    if (n === 1 && !data.modelo) return falla(null, "Elijan un modelo para seguir.");
    if (n === 3 && data.plan === "std" && modeloActual() && modeloActual().plan) return falla(null, "El Save the date viene con los modelos sin sello. Cambien de modelo o elijan Clásico o Premium.");
    if (n === 3 && !alcanza(data.plan, modeloActual())) return falla(null, `El modelo ${modeloActual().name} viene en los planes Clásico y Premium.`);
    if (n === 2) {
      if (!(data.nombre1 || "").trim()) return falla(f("nombre1"), "Falta el primer nombre.");
      if (!esQuince() && !(data.nombre2 || "").trim()) return falla(f("nombre2"), "Falta el segundo nombre.");
      if (esQuince()) data.nombre2 = "";
      if (!fechaOk(data.fecha)) return falla(f("fecha"), esQuince() ? "Elijan la fecha de la fiesta." : "Elijan la fecha de la boda.");
      if (data.fecha < hoy()) return falla(f("fecha"), "La fecha no puede estar en el pasado.");
      if (data.fecha > maxFecha()) return falla(f("fecha"), "La fecha no puede ser a más de 10 años.");
      if (!/^\d\d:\d\d$/.test(data.hora || "")) return falla(f("hora"), "Elijan la hora.");
    }
    if (n === 4) {
      if (!(data.lugar || "").trim()) return falla(f("lugar"), "Falta el lugar.");
      if (!(data.direccion || "").trim()) return falla(f("direccion"), "Falta la dirección.");
      if (!urlOk(data.mapa)) return falla(f("mapa"), "El enlace del mapa debe empezar con https://");
      const otro = $("#f-otroLugar");
      if (otro && otro.checked) {
        if (!(data.recepcion && (data.recepcion.lugar || "").trim())) return falla(f("recepcion.lugar"), "Falta el lugar de la recepción.");
        if (!urlOk(data.recepcion.mapa)) return falla(f("recepcion.mapa"), "El enlace del mapa debe empezar con https://");
      } else data.recepcion = null;
      data.programa = (data.programa || []).filter(a => a.hora || a.acto);
      if (data.programa.some(a => !a.hora || !a.acto)) return falla(null, "Cada momento del programa necesita su hora y su nombre.");
      save();
    }
    if (n === 5) {
      if (data.fechaLimite && (!fechaOk(data.fechaLimite) || data.fechaLimite < hoy() || data.fechaLimite > data.fecha)) return falla(f("fechaLimite"), "La fecha para confirmar debe estar entre hoy y el día de la boda.");
      for (const k of ["regalosEnlace", "transmision"]) if (!urlOk(data[k])) return falla(f(k), "Los enlaces deben empezar con https://");
      if (planById(data.plan).id !== "premium") { data.historia = ""; data.hospedaje = ""; data.transporte = ""; data.aMedida = ""; save(); }
    }
    if (n === 6) {
      if (fotos.length > planById(data.plan).maxFotos) return falla(null, `Su plan incluye hasta ${planById(data.plan).maxFotos} fotos.`);
      if (!urlOk(data.musicaEnlace)) return falla(f("musicaEnlace"), "El enlace de la canción debe empezar con https://");
    }
    if (n === 7) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.correo || "")) return falla(f("correo"), "Revisen su correo: ahí les llega su invitación.");
      const d = digits(data.whatsapp);
      if (d.length < 8 || d.length > 15) return falla(f("whatsapp"), "Revisen su WhatsApp (con código de país: +52, +1, +34…).");
      if (data.quiereFactura) {
        data.factura = { nombre: $("#fx-nombre").value.trim(), ruc: $("#fx-ruc").value.trim(), dv: $("#fx-dv").value.trim(), correo: $("#fx-correo").value.trim() };
        if (!data.factura.nombre) return falla($("#fx-nombre"), "Escriban el nombre o razón social para la factura.");
        if (!data.factura.ruc) return falla($("#fx-ruc"), "Escriban el RUC o la cédula.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.factura.correo)) return falla($("#fx-correo"), "Revisen el correo de la factura.");
      } else data.factura = null;
      if (!$("#ac-aviso").checked) return falla($("#ac-aviso"), "Para seguir, acepten el aviso de uso de información.");
      if (!$("#ac-fotos").checked) return falla($("#ac-fotos"), "Confirmen que tienen permiso para usar las fotos.");
      if (!$("#ac-reembolso").checked) return falla($("#ac-reembolso"), "Confirmen que entienden que no hay devoluciones.");
      data.aceptaciones = { aviso: true, fotos: true, sinReembolso: true };
      data.novedades = $("#ac-novedades").checked === true;
      const ri = $("#f-referido");
      if (ri && ri.value.trim() && !data.referidoOk) return falla(ri, "Revisen el código del planner o déjenlo vacío.");
      if (ri && !ri.value.trim()) { data.referido = ""; data.referidoOk = false; }
      save();
    }
    return true;
  }
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (paso < 8) { if (validar(paso)) irA(paso === 4 && data.plan === "std" ? 7 : paso === 5 && planById(data.plan).id !== "premium" ? 6 : paso + 1); }
    else enviarPedido();
  });

  // ---------- Envío y pago ----------
  async function enviarPedido() {
    const btn = $("#wNext"); err.textContent = "";
    if (!API) { err.textContent = "La tienda todavía no está conectada. Escríbannos por WhatsApp."; return; }
    if (humano && humano.activo() && !humano.token()) { err.textContent = "Un segundo: confirmen abajo que no son un robot y vuelvan a tocar el botón."; return; }
    btn.disabled = true; btn.innerHTML = fotos.length ? "Subiendo sus fotos…" : "Creando su pedido…";
    const datos = { ...data }; ["plan", "modelo", "correo", "whatsapp", "factura", "aceptaciones", "quiereFactura", "novedades", "referido", "referidoOk", "referidoNombre", "credito"].forEach(k => delete datos[k]);
    try {
      const r = await fetch(API + "/love/api/pedido", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: data.plan, modelo: data.modelo, correo: data.correo, whatsapp: data.whatsapp, factura: data.quiereFactura ? data.factura : null,
          aceptaciones: data.aceptaciones, novedades: data.novedades === true, datos,
          referido: data.referidoOk && data.plan !== "std" ? data.referido : null, credito: data.plan !== "std" ? data.credito || null : null, fotos: fotos.map(f => f.b64), portada, turnstile: humano ? humano.token() : null }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.mensaje || "No pudimos crear su pedido. Revisen su conexión e intenten de nuevo.");
      const pend = { id: j.id, key: j.key, codigo: j.codigo, monto: j.monto, yappy: j.yappy, portal: j.portal, nombres: `${data.nombre1} y ${data.nombre2}`, plan: planById(data.plan).nombre };
      store.set(PENDIENTE, pend);
      medir("pedido", { valor: j.monto, plan: data.plan, pedido: j.codigo, modelo: data.modelo });
      mostrarPago(pend);
    } catch (x) { err.textContent = x.message; if (humano) humano.reiniciar(); }
    btn.disabled = false; btn.innerHTML = `Confirmar y pagar ${arrow}`;
  }

  let tPoll = null;
  function mostrarPago(p) {
    wiz.classList.add("pagando");
    $("#wNav").hidden = true; $(".w-side").hidden = true; $("#humanoPedido").hidden = true; err.textContent = "";
    $("#wCount").textContent = `Pedido ${p.codigo}`; $("#wTitle").textContent = "Último paso: el pago."; $("#wSub").textContent = `Plan ${p.plan} para ${p.nombres}.`;
    $$("#progress i").forEach(b => b.classList.add("on"));
    // Yappy solo para quien entra desde Panamá (país que detecta Cloudflare). Afuera, solo tarjeta o PayPal.
    const soloPayPal = !!(PAGO.paypal && PAGO.paypal.clientId && PAGO.pais && PAGO.pais !== "PA");
    const msg = `Hola, Miguel. Somos ${p.nombres} y ya pagamos nuestra invitación de Mejorativa Love. Pedido ${p.codigo} por ${money(p.monto)}. Aquí va el comprobante de Yappy.`;
    form.textContent = "";
    form.append(el("div", { class: "pay", html: `
      <div class="pay-top">
        <div><span class="label" style="color:#A9B6CB">Su invitación</span><div class="price">${money(p.monto)}<small>pago único</small></div></div>
        <div class="pay-cod"><span class="label" style="color:#A9B6CB">Su código</span><b>${esc(p.codigo)}</b></div>
      </div>
      <p class="pay-intro">Elijan cómo pagar. Con tarjeta o PayPal se confirma solo; con Yappy, apenas veamos su comprobante.</p>
      <section class="pay-op" id="ppBox" hidden>
        <h3>Tarjeta o PayPal <span class="tag">Al instante</span></h3>
        <p class="fine-w">Débito o crédito de cualquier país, o su cuenta PayPal. No tienen que enviarnos nada: al terminar el pago, Claude empieza su invitación y en unos minutos les llega al correo.</p>
        <div class="pp-slot" id="ppSlot"></div>
        <p class="fine-w" id="ppMsg" aria-live="polite"></p>
      </section>
      <section class="pay-op manual-ok" id="opYappy">
        <h3>Yappy <span class="tag">Panamá</span></h3>
        <ol>
          <li>Envíen <b>${money(p.monto)}</b> por Yappy al <b>${esc(p.yappy || PAGO.yappy)}</b>.</li>
          <li>En la descripción escriban <b>${esc(p.codigo)}</b>.</li>
          <li>Mándennos el comprobante por WhatsApp.</li>
        </ol>
        <a class="btn gold" href="https://wa.me/${digits(PAGO.whatsapp)}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener"><svg class="ico" aria-hidden="true" style="width:20px;height:20px"><use href="#i-wa"/></svg> Enviar comprobante ${arrow}</a>
        <p class="fine-w">Confirmamos los pagos por Yappy a mano, apenas vemos el comprobante. Desde ahí, su invitación les llega al correo en minutos. Pueden cerrar esta pantalla: igual les llega.</p>
      </section>
      <details class="promo" id="promoBox"><summary>¿Tienen un código de regalo?</summary>
        <div class="promo-row"><input id="promoIn" maxlength="40" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="Código de regalo" placeholder="Escriban su código"><button class="btn gold" type="button" id="promoBtn">Usar código</button></div>
        <p class="fine-w" id="promoMsg" aria-live="polite"></p>
      </details>
      <div id="payStatus"><div class="wait-box"><span class="spinner"></span><b>Esperando la confirmación de su pago</b></div></div>
      <p class="fine-w">Al pagar aceptan las <a href="aviso/#condiciones" target="_blank" rel="noopener">condiciones</a>. No hay devoluciones.</p>
    ` }), el("button", { class: "link", type: "button", text: "Empezar otro pedido", onclick: () => { if (confirm("¿Empezar un pedido nuevo? Este seguirá esperando su pago.")) { store.del(PENDIENTE); clearInterval(tPoll); irA(1); } } }));
    if (soloPayPal) { const y = $("#opYappy"); if (y) y.remove(); const intro = $(".pay-intro"); if (intro) intro.textContent = "Paguen con tarjeta de débito o crédito, o con PayPal. Se confirma solo y Claude empieza su invitación de inmediato."; }
    // Código de regalo: el pedido queda pagado sin cobro y Claude empieza a diseñar.
    $("#promoBtn").addEventListener("click", async () => {
      const cod = ($("#promoIn").value || "").trim(), m = $("#promoMsg"), btn = $("#promoBtn");
      if (!cod) { m.textContent = "Escriban su código."; $("#promoIn").focus(); return; }
      btn.disabled = true; m.textContent = "Revisando su código…";
      try {
        const r = await fetch(API + "/love/api/codigo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: p.id, key: p.key, codigo: cod }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) throw new Error(j.mensaje || "No pudimos usar el código. Intenten de nuevo.");
        ["#ppBox", "#opYappy", ".pay-intro", "#promoBox"].forEach(q => { const n = $(q); if (n) n.hidden = true; });
        $("#payStatus").innerHTML = '<div class="wait-box"><span class="spinner"></span><b>¡Código aplicado!</b><p>Claude está diseñando su invitación. Toma unos minutos.</p></div>';
        revisar();
      } catch (x) { m.textContent = x.message; btn.disabled = false; }
    });
    clearInterval(tPoll);
    const revisar = async () => {
      try {
        const r = await fetch(`${API}/love/api/estado?id=${encodeURIComponent(p.id)}&key=${encodeURIComponent(p.key)}`);
        if (r.status === 404 || r.status === 410) { clearInterval(tPoll); store.del(PENDIENTE); $("#payStatus").innerHTML = '<div class="wait-box"><b>Este pedido ya no existe.</b><p>Si pagaron, escríbannos por WhatsApp con su código.</p></div>'; return; }
        const j = await r.json();
        if (j.pagado) ["#ppBox", "#opYappy", ".pay-intro", "#promoBox"].forEach(q => { const n = $(q); if (n) n.hidden = true; });
        if (j.pagado && j.metodo !== "codigo") medir("compra", { valor: j.monto, pedido: p.codigo, plan: p.plan });
        if (j.listo) {
          clearInterval(tPoll); store.del(PENDIENTE); store.del(STORE);
          $("#payStatus").innerHTML = `<div class="wait-box"><b>¡Su invitación está lista!</b><p>También se la enviamos a su correo.</p><a class="btn gold" href="${esc(p.portal)}">Abrir mi portal ${arrow}</a></div>`;
        } else if (j.pagado) {
          $("#payStatus").innerHTML = '<div class="wait-box"><span class="spinner"></span><b>¡Pago confirmado!</b><p>Claude está diseñando su invitación. Toma unos minutos.</p></div>';
        }
      } catch {}
    };
    revisar(); tPoll = setInterval(revisar, 10000);
    cfgListo.then(() => montarPayPal(p, revisar));
  }

  // PayPal: el navegador solo aprueba; el servidor crea la orden con el precio del plan y captura el pago.
  let sdkPayPal = null;
  function cargarSdkPayPal(clientId) {
    if (window.paypal) return Promise.resolve();
    if (!sdkPayPal) sdkPayPal = new Promise((ok, mal) => {
      const s = document.createElement("script");
      s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons&disable-funding=paylater,venmo&locale=es_PA`;
      s.onload = ok; s.onerror = () => { sdkPayPal = null; mal(new Error("sdk")); };
      document.head.append(s);
    });
    return sdkPayPal;
  }
  async function montarPayPal(p, revisar) {
    const box = $("#ppBox"), slot = $("#ppSlot"), msg = $("#ppMsg");
    if (!box || !PAGO.paypal || !PAGO.paypal.clientId) return;
    box.hidden = false;
    const aviso = (t, malo) => { msg.textContent = t; msg.classList.toggle("pp-err", !!malo); };
    // Con PayPal disponible, va primero: es el camino que se confirma solo.
    const yappy = $("#opYappy"); if (yappy) box.after(yappy);
    const llamar = async (ruta, extra) => {
      const r = await fetch(`${API}/love/api/paypal/${ruta}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: p.id, key: p.key, ...extra }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.mensaje || "No pudimos completar el pago con PayPal. Intenten de nuevo o paguen por Yappy.");
      return j;
    };
    try { await cargarSdkPayPal(PAGO.paypal.clientId); }
    catch { box.hidden = true; return; }
    if (!document.body.contains(slot)) return;
    window.paypal.Buttons({
      style: { layout: "vertical", color: "gold", shape: "pill", label: "pay", height: 48 },
      createOrder: async () => { aviso("Abriendo PayPal…"); const j = await llamar("crear"); if (j.pagado) { revisar(); throw new Error("ya pagado"); } return j.paypal_id; },
      onApprove: async (d) => {
        aviso("Confirmando su pago…");
        try {
          const j = await llamar("capturar", { paypal_id: d.orderID });
          if (j.pagado) { box.hidden = true; $("#opYappy").hidden = true; $(".pay-intro").hidden = true; $("#payStatus").innerHTML = '<div class="wait-box"><span class="spinner"></span><b>¡Pago confirmado!</b><p>Claude está diseñando su invitación. Toma unos minutos.</p></div>'; revisar(); }
          else aviso(j.mensaje || "PayPal está revisando su pago. Les avisamos por correo apenas se apruebe.");
        } catch (x) { aviso(x.message, true); }
      },
      onCancel: () => aviso("Cancelaron el pago en PayPal. Pueden intentarlo de nuevo cuando quieran."),
      onError: (x) => { if (String(x && x.message) !== "ya pagado") aviso("No pudimos abrir PayPal. Intenten de nuevo o paguen por Yappy.", true); },
    }).render(slot).catch(() => { box.hidden = true; });
  }

  // Si vuelven con un pago pendiente, se retoma.
  if (store.get(PENDIENTE) && location.hash === "#pago") abrirPedido();
  // Desde las páginas por país y por modelo: /#crear abre el pedido.
  if (location.hash === "#crear") setTimeout(() => { history.replaceState(null, "", location.pathname); abrirPedido(1); }, 300);
  // Enlaces directos a un modelo (Pinterest, redes): /#modelo=galaxia abre su vista previa.
  const mModelo = location.hash.match(/^#modelo=([a-z-]{3,20})$/);
  if (mModelo && MODELS.some(m => m.id === mModelo[1])) setTimeout(() => abrirVista(mModelo[1]), 300);
  // Desde el portal de un Save the date: /#completa=ID.CLAVE llena el pedido con sus datos y aplica el crédito.
  const mCompleta = location.hash.match(/^#completa=([a-z0-9]{20})\.([A-Za-z0-9_%-]{20,90})$/);
  if (mCompleta && API) {
    const key = decodeURIComponent(mCompleta[2]);
    fetch(`${API}/love/api/portal?id=${mCompleta[1]}&key=${encodeURIComponent(key)}`).then(r => r.json()).then(p => {
      if (!p || !p.ok || !p.plan || !p.plan.std || !p.pagado) return;
      history.replaceState(null, "", location.pathname);
      if (p.credito && p.credito.usado) { alert("Ese crédito ya se usó en su invitación completa."); return; }
      const d = p.datos || {};
      ["tipo", "nombre1", "nombre2", "frase", "fecha", "hora", "zona", "lugar", "direccion", "mapa", "geo"].forEach(k => { if (d[k] != null) data[k] = d[k]; });
      data.modelo = p.modelo; data.plan = "clasico"; data.credito = { id: mCompleta[1], key };
      if (p.correo) data.correo = p.correo; if (p.whatsapp) data.whatsapp = "+" + p.whatsapp;
      save(); store.del(PENDIENTE);
      cfgListo.then(() => abrirPedido(3));
    }).catch(() => {});
  }
  // Enlace para pagar desde otro teléfono: #pagar=ID.CLAVE (lo comparte Miguel o los novios).
  const mPagar = location.hash.match(/^#pagar=([a-z0-9]{20})\.([A-Za-z0-9_-]{20,64})$/);
  if (mPagar && API) fetch(`${API}/love/api/estado?id=${mPagar[1]}&key=${encodeURIComponent(mPagar[2])}`).then(r => r.json()).then(j => {
    if (!j || !j.ok || j.pagado || !j.monto) return;
    store.set(PENDIENTE, { id: mPagar[1], key: mPagar[2], codigo: j.codigo, monto: j.monto, yappy: PAGO.yappy, portal: `${location.origin}/portal/#${mPagar[1]}.${mPagar[2]}`, nombres: j.nombres || "", plan: j.plan || "" });
    history.replaceState(null, "", "#pago"); abrirPedido();
  }).catch(() => {});
})();
