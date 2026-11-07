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
  const money = n => "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const digits = s => String(s || "").replace(/\D/g, "");
  const pad = n => String(n).padStart(2, "0");
  const localISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hoy = () => localISO(new Date());
  const maxFecha = () => { const d = new Date(); d.setFullYear(d.getFullYear() + 10); return localISO(d); };
  const fechaOk = v => { if (!/^\d{4}-\d{2}-\d{2}$/.test(v || "")) return false; const d = new Date(v + "T12:00:00Z"); return !isNaN(d) && d.toISOString().slice(0, 10) === v; };
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }, del(k) { try { localStorage.removeItem(k); } catch {} } };

  // Planes: los del servidor mandan; estos son el respaldo.
  let PLANES = [
    { id: "esencial", nombre: "Esencial", precio: 129, revisiones: 2, maxFotos: 6, musica: false, listaInvitados: false, resumen: "Su invitación con un enlace para todos.",
      incluye: ["Invitación con el sobre que se abre", "Un enlace para compartir con todos", "Confirmaciones en su tablero", "2 rondas de revisión", "Hasta 6 fotos"] },
    { id: "clasico", nombre: "Clásico", precio: 189, revisiones: 3, maxFotos: 10, musica: true, listaInvitados: true, destacado: true, resumen: "Cada invitado recibe la suya, con su nombre y sus cupos.",
      incluye: ["Todo lo del Esencial", "Lista de invitados con cupos", "Invitación con el nombre de cada invitado", "Envío por correo y WhatsApp con un toque", "Música y hasta 10 fotos", "3 rondas de revisión"] },
    { id: "premium", nombre: "Premium", precio: 259, revisiones: 5, maxFotos: 20, musica: true, listaInvitados: true, cambiarModelo: true, resumen: "La experiencia completa, con más libertad para ajustar.",
      incluye: ["Todo lo del Clásico", "Cambio de modelo en cualquier ronda", "Historia, hospedaje, transporte y preguntas frecuentes", "Hasta 20 fotos", "5 rondas de revisión"] },
  ];
  let PAGO = { yappy: "6665-3528", whatsapp: CFG.whatsapp || "50766653528" };
  const planById = id => PLANES.find(p => p.id === id) || PLANES[1];

  // ---------- Datos del pedido ----------
  const data = Object.assign({ plan: "clasico", modelo: "", hora: "16:00", zona: "America/Panama", acompanantes: "si", cupoGeneral: 2, programa: [], ceremonia: "Ceremonia",
    preguntarAlergias: true, preguntarCancion: false }, store.get(STORE) || {});
  const save = () => store.set(STORE, data);
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
  const plural = { Elegante: "Elegantes", "Orgánico": "Orgánicos" };
  fams.forEach((f, i) => $("#filters").append(el("button", { class: "chip", type: "button", "aria-pressed": String(i === 0), text: plural[f] || f,
    onclick: e => { $$("#filters .chip").forEach(c => c.setAttribute("aria-pressed", String(c === e.currentTarget))); $$("#catalog .mcard").forEach(c => (c.hidden = f !== "Todos" && c.dataset.family !== f)); } })));
  const art = m => el("div", { class: "mart" }, [el("img", { class: "mart-a", src: Motor.asset(m, "sobre", true), alt: "", loading: "lazy", decoding: "async" }), el("img", { class: "mart-b", src: Motor.asset(m, "portada", true), alt: "", loading: "lazy", decoding: "async" })]);
  MODELS.forEach((m, i) => $("#catalog").append(el("button", { class: "mcard", type: "button", "data-family": m.family, "aria-label": `Ver el modelo ${m.name} en vivo`, onclick: () => abrirVista(m.id) }, [
    art(m), el("div", { class: "mmeta" }, [el("div", {}, [el("b", { text: `${pad(i + 1)} · ${m.name}` }), el("small", { text: m.family })]), el("span", { class: "see", html: `En vivo ${arrow}` })])])));

  // ---------- Planes ----------
  function pintarPlanes() {
    const box = $("#plans"); box.textContent = "";
    PLANES.forEach(p => box.append(el("article", { class: "plan" + (p.destacado ? " rec" : "") }, [
      p.destacado ? el("span", { class: "badge", text: "Recomendado" }) : null,
      el("h3", { text: p.nombre }), el("p", { class: "fmt", text: p.resumen }),
      el("p", { class: "price", html: `<small>USD</small>${p.precio}` }), el("p", { class: "per", text: "Pago único" }),
      el("ul", {}, p.incluye.map(t => el("li", { html: `<svg aria-hidden="true"><use href="#delta"/></svg>${esc(t)}` }))),
      el("button", { class: "btn", type: "button", html: `Elegir ${esc(p.nombre)} ${arrow}`, onclick: () => { data.plan = p.id; save(); abrirPedido(data.modelo ? 2 : 1); } }),
    ])));
  }
  pintarPlanes();
  if (API) fetch(API + "/love/api/config").then(r => r.json()).then(c => {
    if (c && c.ok) { PLANES = c.planes.map(p => ({ ...p, incluye: p.incluye })); PAGO = { ...PAGO, ...c.pago }; $$("[data-cfg=revisionExtra]").forEach(n => (n.textContent = c.revisionExtra)); pintarPlanes(); }
  }).catch(() => {});

  // ---------- Vista previa de modelo ----------
  const modal = $("#preview");
  let vistaModelo = null, ultimoFoco = null;
  function abrirVista(id) {
    const m = Motor.modelById(id); vistaModelo = m; ultimoFoco = document.activeElement;
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
  const datosVista = () => (data.nombre1 && data.nombre2 ? data : {});

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
  PASOS.forEach(() => $("#progress").append(el("i")));

  function abrirPedido(n = 1) {
    ultimoFoco = document.activeElement;
    wiz.hidden = false; document.body.classList.add("locked");
    const pendiente = store.get(PENDIENTE);
    if (pendiente && pendiente.id) { mostrarPago(pendiente); return; }
    irA(n);
  }
  function cerrarPedido() { wiz.hidden = true; document.body.classList.remove("locked"); if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus(); }
  $$("[data-start]").forEach(b => b.addEventListener("click", () => abrirPedido(data.modelo ? 2 : 1)));
  $("#wClose").addEventListener("click", cerrarPedido);
  document.addEventListener("keydown", e => { if (e.key !== "Escape") return; if (!modal.hidden) cerrarVista(); else if (!wiz.hidden) cerrarPedido(); });
  $("#wBack").addEventListener("click", () => (paso === 1 ? cerrarPedido() : irA(paso - 1)));
  $("#wReplay").addEventListener("click", () => actualizarVista(true));
  $("#wPeek").addEventListener("click", () => { if (!data.modelo) { err.textContent = "Primero elijan un modelo."; return; } abrirVista(data.modelo); });

  function irA(n) {
    paso = n; err.textContent = "";
    $("#wCount").textContent = n <= 7 ? `Paso ${n} de 7` : "Resumen";
    $("#wTitle").textContent = PASOS[n - 1].t; $("#wSub").textContent = PASOS[n - 1].s;
    $$("#progress i").forEach((b, i) => b.classList.toggle("on", i < n));
    $("#wBack").textContent = n === 1 ? "Cancelar" : "Atrás";
    $("#wNext").innerHTML = (n === 8 ? "Confirmar y pagar" : n === 7 ? "Revisar mi pedido" : "Siguiente") + " " + arrow;
    $("#wNav").hidden = false; $(".w-side").hidden = false; wiz.classList.remove("pagando");
    pintarPaso();
    wiz.scrollTop = 0; $(".w-main").scrollTop = 0;
    $("#wTitle").focus({ preventScroll: true });
    actualizarVista(n <= 2);
  }

  // Campos
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
        const card = el("div", { class: "pcard-m", role: "radio", tabindex: "0", "aria-checked": String(data.modelo === m.id), "aria-label": m.name }, [art(m),
          el("div", { class: "mmeta" }, [el("div", {}, [el("b", { text: m.name }), el("small", { text: m.family })]),
            el("button", { class: "see", type: "button", text: "Ver", "aria-label": `Ver ${m.name} en grande`, onclick: e => { e.stopPropagation(); abrirVista(m.id); } })])]);
        const elegir = () => { data.modelo = m.id; save(); $$(".pcard-m", box).forEach(c => c.setAttribute("aria-checked", String(c === card))); err.textContent = ""; actualizarVista(true); };
        card.addEventListener("click", elegir);
        card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(); } });
        box.append(card);
      });
      form.append(box);
    }
    if (paso === 2) {
      form.append(
        fila(campo("Nombre (1)", inp("nombre1", { maxlength: "40", autocomplete: "off", placeholder: "Ej.: Ana", required: true })), campo("Nombre (2)", inp("nombre2", { maxlength: "40", autocomplete: "off", placeholder: "Ej.: Luis", required: true }))),
        campo("Su frase", inp("frase", { maxlength: "120", placeholder: "Ej.: Elegimos el mismo camino" }), "Va en la portada.", true),
        fila(campo("Fecha de la boda", inp("fecha", { type: "date", min: hoy(), max: maxFecha(), required: true }), "", false), campo("Hora", inp("hora", { type: "time", required: true }))),
        el("p", { class: "fecha-clara", id: "fechaClara", "aria-live": "polite" }),
        campo("País o zona horaria", (() => { const s = el("select", { name: "zona", id: "f-zona" }); [["America/Panama", "Panamá"], ["America/Costa_Rica", "Costa Rica"], ["America/Bogota", "Colombia"], ["America/Mexico_City", "México"], ["America/New_York", "Nueva York / Miami"], ["Europe/Madrid", "España"]].forEach(([v, t]) => s.append(el("option", { value: v, text: t }))); s.value = data.zona; return s; })(), "Para que la cuenta atrás sea exacta."),
      );
      fechaClara();
    }
    if (paso === 3) {
      const box = el("div", { class: "plan-pick", role: "radiogroup", "aria-label": "Plan" });
      PLANES.forEach(pl => {
        const c = el("div", { class: "pp" + (pl.destacado ? " rec" : ""), role: "radio", tabindex: "0", "aria-checked": String(data.plan === pl.id) }, [
          pl.destacado ? el("span", { class: "badge", text: "Recomendado" }) : null,
          el("div", { class: "pp-h" }, [el("b", { text: pl.nombre }), el("span", { class: "pp-price", html: `${money(pl.precio)}` })]),
          el("p", { class: "pp-r", text: pl.resumen }),
          el("ul", {}, pl.incluye.map(t => el("li", { text: t }))),
        ]);
        const elegir = () => { data.plan = pl.id; save(); $$(".pp", box).forEach(x => x.setAttribute("aria-checked", String(x === c))); };
        c.addEventListener("click", elegir); c.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); elegir(); } });
        box.append(c);
      });
      form.append(box, el("p", { class: "hint", text: "Corregir datos después (fecha, lugar, horas) es gratis y no gasta revisiones." }));
    }
    if (paso === 4) {
      const rec = el("div", { class: "sub-block", id: "recBlock" }, [
        campo("Lugar de la recepción", inp("recepcion.lugar", { maxlength: "80", placeholder: "Ej.: Salón Las Américas" })),
        campo("Dirección de la recepción", inp("recepcion.direccion", { maxlength: "160" })),
        fila(campo("Hora de la recepción", inp("recepcion.hora", { type: "time" }), "", true), campo("Enlace de Google Maps", inp("recepcion.mapa", { type: "url", inputmode: "url", placeholder: "https://maps.app.goo.gl/…" }), "", true)),
      ]);
      const otro = el("label", { class: "check" }, [el("input", { type: "checkbox", id: "f-otroLugar", ...(data.recepcion && data.recepcion.lugar ? { checked: true } : {}) }), el("span", { text: "La recepción es en otro lugar" })]);
      rec.hidden = !(data.recepcion && data.recepcion.lugar);
      otro.querySelector("input").addEventListener("change", e => { rec.hidden = !e.target.checked; if (!e.target.checked) { data.recepcion = null; save(); } });
      const prog = el("div", { class: "program", id: "progList" });
      form.append(
        campo("¿Cómo llaman a la ceremonia?", (() => { const s = el("select", { name: "ceremonia", id: "f-ceremonia" }); ["Ceremonia", "Ceremonia religiosa", "Misa", "Ceremonia civil", "Ceremonia simbólica"].forEach(v => s.append(el("option", { value: v, text: v }))); s.value = data.ceremonia || "Ceremonia"; return s; })()),
        campo("Lugar", inp("lugar", { maxlength: "80", placeholder: "Ej.: Iglesia San Francisco de Asís", required: true })),
        campo("Dirección", inp("direccion", { maxlength: "160", placeholder: "Ciudad, calle o referencia", required: true })),
        campo("Enlace de Google Maps", inp("mapa", { type: "url", inputmode: "url", placeholder: "https://maps.app.goo.gl/…" }), "Si no lo tienen, armamos el botón con la dirección.", true),
        otro, rec,
        el("p", { class: "label", style: "margin-top:18px", text: "Programa del día (opcional)" }), prog,
        el("button", { class: "link", type: "button", text: "+ Añadir momento", onclick: () => { data.programa = data.programa || []; if (data.programa.length < 8) { data.programa.push({ hora: "", acto: "" }); save(); pintarPrograma(); } } }),
      );
      pintarPrograma();
    }
    if (paso === 5) {
      const premium = p.id === "premium";
      form.append(
        fila(campo("Padres de " + (data.nombre1 || "(1)"), inp("padres1", { maxlength: "120", placeholder: "Ej.: Carlos Pérez y María Gómez" }), "", true), campo("Padres de " + (data.nombre2 || "(2)"), inp("padres2", { maxlength: "120" }), "", true)),
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
          campo("Su WhatsApp", inp("whatsapp", { type: "tel", inputmode: "tel", autocomplete: "tel", required: true, placeholder: "+507 6000-0000" }), "Con código de país si no es de Panamá.")),
        el("label", { class: "check" }, [el("input", { type: "checkbox", id: "f-quiereFactura", ...(data.quiereFactura ? { checked: true } : {}) }), el("span", { text: "Necesito factura" })]),
        (() => {
          const b = el("div", { class: "sub-block", id: "facBlock" }, [
            campo("Nombre o razón social", el("input", { id: "fx-nombre", maxlength: "120", value: fx.nombre || "" })),
            fila(campo("RUC o cédula", el("input", { id: "fx-ruc", maxlength: "40", value: fx.ruc || "" })), campo("DV", el("input", { id: "fx-dv", maxlength: "4", inputmode: "numeric", value: fx.dv || "" }), "", true)),
            campo("Correo para la factura", el("input", { id: "fx-correo", type: "email", maxlength: "200", value: fx.correo || "" }))]);
          b.hidden = !data.quiereFactura; return b;
        })(),
        el("div", { class: "w-legal" }, [el("p", { html: "<b>Condiciones</b>" }),
          el("p", { text: "Usamos sus datos y fotos solo para crear y publicar su invitación. Es privada: no aparece en buscadores y vive hasta tres meses después de la boda; después la borramos." }),
          el("p", { text: "Desde que confirmamos su pago empezamos a diseñar. Por eso no hacemos devoluciones, ni si la boda se cancela. Si se pospone, la invitación sigue siendo suya." }),
          el("p", { html: '<a href="aviso/" target="_blank" rel="noopener">Leer el aviso completo</a>' })]),
        el("label", { class: "check" }, [el("input", { type: "checkbox", id: "ac-aviso" }), el("span", { text: "Leí y acepto el aviso de uso de información." })]),
        el("label", { class: "check" }, [el("input", { type: "checkbox", id: "ac-fotos" }), el("span", { text: "Tengo permiso para usar las fotos que subí." })]),
        el("label", { class: "check" }, [el("input", { type: "checkbox", id: "ac-reembolso" }), el("span", { text: "Entiendo que no hay devoluciones." })]),
      );
      $("#f-quiereFactura", form).addEventListener("change", e => { data.quiereFactura = e.target.checked; $("#facBlock", form).hidden = !e.target.checked; save(); });
    }
    if (paso === 8) {
      const m = Motor.modelById(data.modelo);
      const filas = [
        ["Modelo", m.name, 1], ["Ustedes", `${data.nombre1} & ${data.nombre2}${data.frase ? ` · “${data.frase}”` : ""}`, 2],
        ["Fecha", `${Motor.longDate(data.fecha)} · ${Motor.hora12(data.hora)}`, 2], ["Plan", `${p.nombre} · ${money(p.precio)} · ${p.revisiones} revisiones`, 3],
        [data.ceremonia || "Ceremonia", `${data.lugar}, ${data.direccion}`, 4],
        data.recepcion && data.recepcion.lugar ? ["Recepción", `${data.recepcion.lugar}${data.recepcion.hora ? " · " + Motor.hora12(data.recepcion.hora) : ""}`, 4] : null,
        (data.programa || []).filter(a => a.hora && a.acto).length ? ["Programa", data.programa.filter(a => a.hora && a.acto).map(a => `${Motor.hora12(a.hora)} ${a.acto}`).join(" · "), 4] : null,
        ["Detalles", [data.padres1 || data.padres2 ? "padres" : "", data.vestimenta ? "vestimenta" : "", data.regalos || data.regalosYappy ? "regalos" : "", data.soloAdultos ? "solo adultos" : "", data.historia ? "historia" : ""].filter(Boolean).join(", ") || "—", 5],
        ["Confirmar antes del", data.fechaLimite ? Motor.longDate(data.fechaLimite) : "Sin fecha límite", 5],
        ["Fotos", fotos.length ? `${fotos.length}` : "Sin fotos", 6],
        ["Contacto", `${data.correo} · ${data.whatsapp}`, 7], ["Factura", data.quiereFactura ? `${data.factura.nombre} · ${data.factura.ruc}` : "No", 7],
      ].filter(Boolean);
      form.append(el("dl", { class: "summary" }, filas.flatMap(([k, v, s]) => [el("dt", { text: k }), el("dd", {}, [el("span", { text: v }), el("button", { class: "link", type: "button", text: "Editar", onclick: () => irA(s) })])])),
        el("div", { class: "total" }, [el("span", { text: "Total" }), el("b", { text: `${money(p.precio)} USD` })]),
        el("p", { class: "hint", text: "Al confirmar, les mostramos cómo pagar con Yappy. Apenas confirmemos su pago, Claude diseña su invitación y les llega al correo en minutos." }));
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
    n.textContent = fechaOk(data.fecha) ? `Su boda: ${Motor.longDate(data.fecha)}` : "";
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
    Motor.construir($("#wPreview"), { modelo: data.modelo, datos: datosVista(), fotos: fotos.map(f => f.url), portada, vista: true, autoAbrir: abrirSobre && !reduced, abierta: !abrirSobre });
  }

  // Validación de cada paso (las mismas reglas valen en el servidor)
  function falla(input, msg) { if (input) { input.setAttribute("aria-invalid", "true"); input.focus(); } err.textContent = msg; return false; }
  const urlOk = v => !v || /^https:\/\/\S+$/i.test(v);
  function validar(n) {
    const f = name => form.querySelector(`[name="${name}"]`);
    if (n === 1 && !data.modelo) return falla(null, "Elijan un modelo para seguir.");
    if (n === 2) {
      if (!(data.nombre1 || "").trim()) return falla(f("nombre1"), "Falta el primer nombre.");
      if (!(data.nombre2 || "").trim()) return falla(f("nombre2"), "Falta el segundo nombre.");
      if (!fechaOk(data.fecha)) return falla(f("fecha"), "Elijan la fecha de la boda.");
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
      if (planById(data.plan).id !== "premium") { data.historia = ""; data.hospedaje = ""; data.transporte = ""; save(); }
    }
    if (n === 6) {
      if (fotos.length > planById(data.plan).maxFotos) return falla(null, `Su plan incluye hasta ${planById(data.plan).maxFotos} fotos.`);
      if (!urlOk(data.musicaEnlace)) return falla(f("musicaEnlace"), "El enlace de la canción debe empezar con https://");
    }
    if (n === 7) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.correo || "")) return falla(f("correo"), "Revisen su correo: ahí les llega su invitación.");
      const d = digits(data.whatsapp);
      if (d.length < 8 || d.length > 15) return falla(f("whatsapp"), "Revisen su WhatsApp (con código de país si no es de Panamá).");
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
      save();
    }
    return true;
  }
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (paso < 8) { if (validar(paso)) irA(paso === 5 && planById(data.plan).id !== "premium" ? 6 : paso + 1); }
    else enviarPedido();
  });

  // ---------- Envío y pago ----------
  async function enviarPedido() {
    const btn = $("#wNext"); err.textContent = "";
    if (!API) { err.textContent = "La tienda todavía no está conectada. Escríbannos por WhatsApp."; return; }
    btn.disabled = true; btn.innerHTML = fotos.length ? "Subiendo sus fotos…" : "Creando su pedido…";
    const datos = { ...data }; ["plan", "modelo", "correo", "whatsapp", "factura", "aceptaciones", "quiereFactura"].forEach(k => delete datos[k]);
    try {
      const r = await fetch(API + "/love/api/pedido", { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: data.plan, modelo: data.modelo, correo: data.correo, whatsapp: data.whatsapp, factura: data.quiereFactura ? data.factura : null,
          aceptaciones: data.aceptaciones, datos, fotos: fotos.map(f => f.b64), portada }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.mensaje || "No pudimos crear su pedido. Revisen su conexión e intenten de nuevo.");
      const pend = { id: j.id, key: j.key, codigo: j.codigo, monto: j.monto, yappy: j.yappy, portal: j.portal, nombres: `${data.nombre1} y ${data.nombre2}`, plan: planById(data.plan).nombre };
      store.set(PENDIENTE, pend);
      mostrarPago(pend);
    } catch (x) { err.textContent = x.message; }
    btn.disabled = false; btn.innerHTML = `Confirmar y pagar ${arrow}`;
  }

  let tPoll = null;
  function mostrarPago(p) {
    wiz.classList.add("pagando");
    $("#wNav").hidden = true; $(".w-side").hidden = true; err.textContent = "";
    $("#wCount").textContent = `Pedido ${p.codigo}`; $("#wTitle").textContent = "Último paso: el pago."; $("#wSub").textContent = `Plan ${p.plan} para ${p.nombres}.`;
    $$("#progress i").forEach(b => b.classList.add("on"));
    const msg = `Hola, Miguel. Somos ${p.nombres} y ya pagamos nuestra invitación de Mejorativa Love. Pedido ${p.codigo} por ${money(p.monto)}. Aquí va el comprobante de Yappy.`;
    form.textContent = "";
    form.append(el("div", { class: "pay", html: `
      <span class="label" style="color:#A9B6CB">Su invitación</span>
      <div class="price">${money(p.monto)}<small>pago único</small></div>
      <div class="manual-ok">
        <span class="label" style="color:#A9B6CB">Su código</span>
        <div class="code">${esc(p.codigo)}</div>
        <ol>
          <li>Envíen <b>${money(p.monto)}</b> por Yappy al <b>${esc(p.yappy || PAGO.yappy)}</b>.</li>
          <li>En la descripción del Yappy escriban <b>${esc(p.codigo)}</b>.</li>
          <li>Mándennos el comprobante por WhatsApp.</li>
        </ol>
        <a class="btn gold" href="https://wa.me/${digits(PAGO.whatsapp)}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener"><svg class="ico" aria-hidden="true" style="width:20px;height:20px"><use href="#i-wa"/></svg> Enviar comprobante ${arrow}</a>
        <p class="fine-w">Apenas confirmemos su pago, Claude diseña su invitación y les llega a <b>su correo</b> en minutos, junto con el enlace a su portal. Pueden cerrar esta pantalla: igual les llega.</p>
      </div>
      <div id="payStatus"><div class="wait-box"><span class="spinner"></span><b>Esperando la confirmación de su pago</b></div></div>
      <p class="fine-w">Al pagar aceptan las <a href="aviso/#condiciones" target="_blank" rel="noopener">condiciones</a>. No hay devoluciones.</p>
    ` }), el("button", { class: "link", type: "button", text: "Empezar otro pedido", onclick: () => { if (confirm("¿Empezar un pedido nuevo? Este seguirá esperando su pago.")) { store.del(PENDIENTE); clearInterval(tPoll); irA(1); } } }));
    clearInterval(tPoll);
    const revisar = async () => {
      try {
        const r = await fetch(`${API}/love/api/estado?id=${encodeURIComponent(p.id)}&key=${encodeURIComponent(p.key)}`);
        if (r.status === 404 || r.status === 410) { clearInterval(tPoll); store.del(PENDIENTE); $("#payStatus").innerHTML = '<div class="wait-box"><b>Este pedido ya no existe.</b><p>Si pagaron, escríbannos por WhatsApp con su código.</p></div>'; return; }
        const j = await r.json();
        if (j.listo) {
          clearInterval(tPoll); store.del(PENDIENTE); store.del(STORE);
          $("#payStatus").innerHTML = `<div class="wait-box"><b>¡Su invitación está lista!</b><p>También se la enviamos a su correo.</p><a class="btn gold" href="${esc(p.portal)}">Abrir mi portal ${arrow}</a></div>`;
        } else if (j.pagado) {
          $("#payStatus").innerHTML = '<div class="wait-box"><span class="spinner"></span><b>¡Pago confirmado!</b><p>Claude está diseñando su invitación. Toma unos minutos.</p></div>';
        }
      } catch {}
    };
    revisar(); tPoll = setInterval(revisar, 10000);
  }

  // Si vuelven con un pago pendiente, se retoma.
  if (store.get(PENDIENTE) && location.hash === "#pago") abrirPedido();
})();
