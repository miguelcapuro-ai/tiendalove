(() => {
  "use strict";
  const CFG = window.TIENDA;
  const MODELS = window.MODELOS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STORE_KEY = "ml-pedido-v1";
  const SAMPLE = { nombre1: "Ana", nombre2: "Luis", frase: "Elegimos el mismo camino", fecha: "", hora: "16:00",
    zona: "America/Panama", lugar: "Hacienda Los Robles", direccion: "Boquete, Chiriquí", programa: [
      { hora: "16:00", acto: "Ceremonia" }, { hora: "17:30", acto: "Cóctel" }, { hora: "19:00", acto: "Cena" }, { hora: "21:00", acto: "Fiesta" }] };

  const store = {
    get() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; } },
    set(v) { try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch {} },
    clear() { try { localStorage.removeItem(STORE_KEY); } catch {} }
  };
  const data = Object.assign({ plan: "clasico", zona: "America/Panama", hora: "16:00", acompanantes: "si", programa: [], extras: [] }, store.get());
  const save = () => store.set(data);
  let photos = []; // { blob, url, name }
  let cover = 0;

  const el = (tag, attrs = {}, kids = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "text") n.textContent = v;
      else if (k === "style") n.style.cssText = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) n.setAttribute(k, v === true ? "" : v);
    }
    for (const c of [].concat(kids)) if (c != null) n.append(c);
    return n;
  };
  const money = n => "$" + n;
  const planById = id => CFG.plans.find(p => p.id === id) || CFG.plans[1];
  const modelById = id => MODELS.find(m => m.id === id);
  const initials = (a, b) => ((a || "A")[0] + "&" + (b || "B")[0]).toUpperCase();
  const digits = s => (s || "").replace(/\D/g, "");

  $$("[data-cfg]").forEach(n => (n.textContent = CFG[n.dataset.cfg]));

  // Logo de Mejorativa (versión principal del manual: monograma + nombre).
  // En fondos navy (sobre de entrada y pie) va la versión blanca.
  if (CFG.logo && !document.querySelector(".wordmark .mark")) {
    $$(".wordmark").forEach(w => {
      const onDark = !!w.closest(".footer");
      const src = onDark && CFG.logoClaro ? CFG.logoClaro : CFG.logo;
      const img = el("img", { class: "logo-img", src, alt: "", "aria-hidden": "true" });
      img.onerror = () => img.remove();
      const txt = el("span", { class: "wm-text" }, [...w.childNodes]);
      w.append(img, txt);
      w.classList.add("with-logo");
    });
  }

  // ---------- Fechas con zona horaria ----------
  function tzOffsetMin(utcMs, tz) {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit",
      day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(utcMs)).map(x => [x.type, x.value]));
    const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return Math.round((asUtc - utcMs) / 60000);
  }
  function eventDate(fecha, hora, tz) {
    if (!fecha) return null;
    const [y, m, d] = fecha.split("-").map(Number);
    const [hh, mm] = (hora || "00:00").split(":").map(Number);
    const guess = Date.UTC(y, m - 1, d, hh, mm);
    const off = tzOffsetMin(guess, tz || "America/Panama");
    return new Date(guess - off * 60000);
  }
  function isoWithOffset(fecha, hora, tz) {
    const dt = eventDate(fecha, hora, tz);
    if (!dt) return "";
    const off = tzOffsetMin(dt.getTime(), tz);
    const sign = off >= 0 ? "+" : "-", a = Math.abs(off);
    return `${fecha}T${hora}:00${sign}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
  }
  const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
  const shortDate = fecha => { if (!fecha) return "14 FEB 2027"; const [y, m, d] = fecha.split("-"); return `${+d} ${MESES[+m - 1]} ${y}`; };
  const longDate = fecha => fecha ? new Intl.DateTimeFormat("es-PA", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(fecha + "T12:00:00Z")) : "";
  const pad2 = n => String(n).padStart(2, "0");
  const localISO = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayISO = () => localISO(new Date());
  const maxISO = () => { const d = new Date(); d.setFullYear(d.getFullYear() + 10); return localISO(d); };
  const validISO = v => /^\d{4}-\d{2}-\d{2}$/.test(v || "") && !isNaN(new Date(v + "T12:00:00"));

  // ---------- Arte de modelo (tarjeta) ----------
  const asset = (m, kind, thumb) => `assets/modelos/${m.id}/${thumb ? "thumb-" : ""}${kind}.webp`;
  function modelArt(m) {
    // Sobre cerrado; al pasar el cursor o enfocar, se ve la portada.
    return el("div", { class: "mart" }, [
      el("img", { class: "mart-a", src: asset(m, "sobre", true), alt: "", loading: "lazy", decoding: "async" }),
      el("img", { class: "mart-b", src: asset(m, "portada", true), alt: "", loading: "lazy", decoding: "async" })
    ]);
  }

  // ---------- Invitación en vivo (vista previa) ----------
  const timers = new WeakMap();
  // Receta de cada modelo: orden de secciones y estilo de cada componente.
  // cd: cuenta atrás · tl: programa · loc: ubicación · dark: ornamento generado sobre negro.
  const RECIPES = {
    arco:      { order: ["intro", "orn", "cd", "tl", "photo", "orn", "loc", "rsvp", "end"], cd: "elegant", tl: "centered", loc: "arch" },
    noche:     { order: ["orn", "intro", "cd", "tl", "photo", "loc", "rsvp", "end"], cd: "rings", tl: "constellation", loc: "moon", dark: true,
                 labels: { cd: "Bajo la luna, faltan", tl: "La noche", loc: "Dónde" } },
    galeria:   { order: ["intro", "cd", "orn", "loc", "tl", "photo", "rsvp", "end"], cd: "sentence", tl: "grid", loc: "block",
                 labels: { cd: "Cuenta atrás", tl: "Programa", loc: "Lugar", rsvp: "Confirmación" } },
    marco:     { order: ["intro", "orn", "cd", "tl", "photo", "loc", "orn", "rsvp", "end"], cd: "frames", tl: "rail", loc: "frame" },
    real:      { order: ["orn", "intro", "cd", "orn", "tl", "photo", "loc", "rsvp", "end"], cd: "medallions", tl: "filigree", loc: "frame", dark: true },
    deco:      { order: ["orn", "intro", "cd", "tl", "photo", "orn", "loc", "rsvp", "end"], cd: "pillars", tl: "steps", loc: "plaque", dark: true,
                 introText: (a, b) => [`${a} & ${b}`, el("br"), "solicitan el placer de su compañía"] },
    botanico:  { order: ["intro", "orn", "tl", "cd", "photo", "loc", "orn", "rsvp", "end"], cd: "handwritten", tl: "leaves", loc: "simple",
                 labels: { tl: "Nuestro día", cd: "Ya casi" } },
    desierto:  { order: ["intro", "cd", "orn", "tl", "photo", "loc", "rsvp", "end"], cd: "arches", tl: "rail", loc: "arch" },
    bitacora:  { order: ["intro", "orn", "loc", "cd", "tl", "photo", "rsvp", "end"], cd: "log", tl: "route", loc: "pass", rsvpLabel: "Confirmar mi lugar",
                 labels: { cd: "Faltan para zarpar", tl: "Itinerario", loc: "Destino", rsvp: "¿Se suman a la aventura?" },
                 introText: (a, b) => [`${a} & ${b}`, el("br"), "los invitan a la aventura más importante de sus vidas."] },
    cumbre:    { order: ["intro", "orn", "cd", "tl", "photo", "loc", "rsvp", "end"], cd: "peaks", tl: "trail", loc: "sign",
                 labels: { cd: "Faltan para la cumbre", tl: "El sendero del día", loc: "Punto de encuentro" } },
    selva:     { order: ["intro", "orn", "cd", "tl", "photo", "orn", "loc", "rsvp", "end"], cd: "pills", tl: "cards", loc: "card", dark: true },
    postal:    { order: ["intro", "loc", "orn", "cd", "tl", "photo", "rsvp", "end"], cd: "ticket", tl: "postcards", loc: "postcard",
                 labels: { cd: "Cuenta atrás", tl: "Programa", loc: "Saludos desde", rsvp: "Escríbannos" } }
  };
  function buildInvitation(screen, m, d, { autoOpen = false } = {}) {
    if (timers.has(screen)) clearInterval(timers.get(screen));
    screen.textContent = "";
    const n1 = d.nombre1 || SAMPLE.nombre1, n2 = d.nombre2 || SAMPLE.nombre2;
    const frase = d.nombre1 ? d.frase || "" : SAMPLE.frase;
    const fecha = d.fecha || defaultFutureDate();
    const tz = d.zona || "America/Panama";
    const lugar = d.lugar || SAMPLE.lugar, dir = d.direccion || SAMPLE.direccion;
    const prog = (d.programa || []).filter(a => a.hora && a.acto);
    const programa = prog.length ? prog : SAMPLE.programa;
    const T = `font-family:${m.title};${m.italic ? "font-style:italic;" : ""}`;

    const inv = el("div", { class: `inv L-${m.layout}`, style: `--paper:${m.paper};--ink:${m.ink};--acc:${m.accent};--title:${m.title};font-family:${m.body}` });

    // Portada
    const coverUrl = photos[cover] && photos[cover].url;
    const heroText = el("div", { class: "inv-hero-text", style: `top:${m.heroY * 100}%;color:${coverUrl ? "#fff" : m.heroInk}` }, [
      el("p", { class: "inv-kicker", text: m.layout === "bitacora" ? "Rumbo a nuestra boda" : m.layout === "galeria" ? "Nos casamos" : "Nuestra boda" }),
      el("p", { class: "inv-names", style: T }, [n1, el("span", { class: "amp", text: m.layout === "galeria" || m.layout === "deco" ? " & " : "&" }), n2]),
      el("p", { class: "inv-date", text: shortDate(fecha) }),
      frase ? el("p", { class: "inv-phrase", text: `“${frase}”` }) : null
    ]);
    const hero = el("div", { class: "inv-hero" + (coverUrl ? " has-photo" : "") }, [
      el("img", { class: "inv-hero-bg", src: coverUrl || asset(m, "portada"), alt: "" }),
      heroText,
      m.layout === "postal" ? el("div", { class: "stamp", "aria-hidden": "true" }, [el("span", { text: shortDate(fecha) }), el("small", { text: "Panamá" })]) : null
    ]);

    // ----- Interior propio de cada modelo -----
    const R = RECIPES[m.layout];
    const head = (t, n) => el("h4", { class: "inv-h", style: T }, [
      m.layout === "galeria" ? el("span", { class: "num", text: String(n).padStart(2, "0") }) : null, t]);
    const sec = (cls, t, n, kids) => el("section", { class: `inv-sec ${cls}` }, [head(t, n), ...kids]);
    const ornament = (k = "") => el("img", { class: `orn-img ${R.dark ? "on-dark" : "on-light"} ${k}`, src: `assets/modelos/${m.id}/ornamento.webp`, alt: "", loading: "lazy" });

    // Cuenta atrás
    const target = eventDate(fecha, d.hora || "16:00", tz);
    const cd = el("div", { class: `inv-cd cd-${R.cd}`, role: "timer", "aria-label": "Cuenta atrás" });
    const labels = ["Días", "Horas", "Minutos", "Segundos"];
    let units = [], line = null;
    if (R.cd === "sentence" || R.cd === "log") {
      line = el("p", { class: "cd-line" }); cd.append(line);
    } else {
      units = labels.map(l => { const b = el("b"); cd.append(el("div", { class: "u" }, [b, el("small", { text: R.cd === "pillars" ? l.toUpperCase() : l })])); return b; });
    }
    const tick = () => {
      const s = Math.max(0, Math.floor((target - Date.now()) / 1000));
      const v = [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60];
      const p2 = x => String(x).padStart(2, "0");
      if (R.cd === "sentence") line.textContent = `Faltan ${v[0]} días, ${v[1]} horas y ${v[2]} minutos.`;
      else if (R.cd === "log") line.textContent = `${v[0]}d · ${p2(v[1])}h · ${p2(v[2])}m · ${p2(v[3])}s`;
      else v.forEach((x, i) => (units[i].textContent = i ? p2(x) : x));
    };
    tick(); timers.set(screen, setInterval(tick, 1000));

    // Programa
    const tl = el("ol", { class: `inv-tl tl-${R.tl}` }, programa.map((a, i) => el("li", {}, [
      R.tl === "trail" ? el("span", { class: "mk", text: "▲", "aria-hidden": "true" }) : null,
      el("time", { text: a.hora }), el("span", { class: "act", text: a.acto })
    ])));

    // Ubicación
    const timeTxt = d.hora || "16:00";
    let loc;
    if (R.loc === "pass") {
      loc = el("div", { class: "loc loc-pass" }, [
        el("div", { class: "pass-top" }, [el("span", { text: "Pase de abordar" }), el("span", { text: initials(n1, n2) })]),
        el("div", { class: "pass-grid" }, [
          el("div", {}, [el("small", { text: "Destino" }), el("b", { text: lugar })]),
          el("div", {}, [el("small", { text: "Fecha" }), el("b", { text: shortDate(fecha) })]),
          el("div", {}, [el("small", { text: "Embarque" }), el("b", { text: timeTxt })]),
          el("div", {}, [el("small", { text: "Puerta" }), el("b", { text: dir })])
        ])
      ]);
    } else if (R.loc === "postcard") {
      loc = el("div", { class: "loc loc-postcard" }, [
        el("div", { class: "pc-left" }, [el("p", { class: "place", text: lugar }), el("p", { class: "addr", text: dir })]),
        el("div", { class: "pc-right" }, [el("span", { class: "postmark", text: shortDate(fecha) }), el("span", { class: "pc-lines" })])
      ]);
    } else if (R.loc === "sign") {
      loc = el("div", { class: "loc loc-sign" }, [el("p", { class: "place", text: `${lugar} →` }), el("p", { class: "addr", text: dir }), el("p", { class: "addr", text: `${shortDate(fecha)} · ${timeTxt}` })]);
    } else {
      loc = el("div", { class: `loc loc-${R.loc}` }, [el("p", { class: "place", text: lugar }), el("p", { class: "addr", text: dir }), el("p", { class: "when", text: `${shortDate(fecha)} · ${timeTxt}` })]);
    }

    const phone = digits(d.telefono);
    const rsvp = el("a", { class: "inv-btn", text: R.rsvpLabel || "Confirmar asistencia",
      href: phone ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hola, confirmo mi asistencia a la boda de ${n1} y ${n2}.`)}` : "#",
      target: phone ? "_blank" : false, rel: "noopener", onclick: e => { if (!phone) e.preventDefault(); } });
    const extraPhoto = photos.length > 1 ? el("img", { class: "inv-photo", src: photos[(cover + 1) % photos.length].url, alt: "Foto de la pareja" }) : null;

    const L = R.labels || {};
    const blocks = {
      intro: el("p", { class: "inv-intro" }, R.introText ? R.introText(n1, n2) : [`${n1} & ${n2}`, el("br"), "los invitan a celebrar con ellos este día tan especial."]),
      orn: () => ornament(),
      cd: sec("s-cd", L.cd || "La celebración comienza en", 1, [cd]),
      tl: sec("s-tl", L.tl || "Programa del día", 2, [tl]),
      photo: extraPhoto,
      loc: sec("s-loc", L.loc || "Ubicación", 3, [loc]),
      rsvp: sec("s-rsvp", L.rsvp || "¿Nos acompañan?", 4, [el("p", { class: "addr", text: d.fechaLimite ? `Confirmen antes del ${longDate(d.fechaLimite)}.` : "Confirmen por WhatsApp." }), rsvp]),
      end: el("div", { class: "inv-end" }, [ornament("end"), el("p", { style: T, text: initials(n1, n2) })])
    };
    inv.append(...[hero, ...R.order.map(k => (typeof blocks[k] === "function" ? blocks[k]() : blocks[k]))].filter(Boolean));

    // Sobre: foto cerrada → foto abierta con los nombres en la tarjeta → portada
    const stage = el("div", { class: "inv-env", role: "button", tabindex: "0", "aria-label": `Abrir el sobre del modelo ${m.name}` }, [
      el("img", { class: "env-closed", src: asset(m, "sobre"), alt: "" }),
      el("img", { class: "env-open", src: asset(m, "abierto"), alt: "" }),
      el("div", { class: "env-card", style: `top:${m.cardY * 100}%;color:${m.cardInk};${T}` }, [
        el("span", { class: "c-names", text: `${n1} & ${n2}` }),
        el("span", { class: "c-date", text: shortDate(fecha) })
      ]),
      el("p", { class: "env-hint", text: "Toca el sobre para abrir" })
    ]);
    const open = () => {
      if (stage.classList.contains("open")) return;
      stage.classList.add("open");
      setTimeout(() => stage.classList.add("gone"), reduced ? 60 : 2600);
    };
    stage.addEventListener("click", open);
    stage.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    screen.append(inv, stage);
    if (autoOpen) setTimeout(open, 1100);
    return { open };
  }
  function defaultFutureDate() {
    const d = new Date(); d.setMonth(d.getMonth() + 4); return d.toISOString().slice(0, 10);
  }

  // ---------- Apertura de la tienda ----------
  const intro = $("#intro");
  function endIntro(instant) {
    try { sessionStorage.setItem("ml-intro", "1"); } catch {}
    document.body.classList.remove("locked");
    intro.classList.add("gone");
    setTimeout(() => intro.remove(), instant ? 0 : 800);
  }
  let introSeen = false;
  try { introSeen = sessionStorage.getItem("ml-intro") === "1"; } catch {}
  if (introSeen) { intro.remove(); document.body.classList.remove("locked"); }
  else {
    $("#seal").addEventListener("click", () => {
      intro.classList.add("open");
      setTimeout(() => endIntro(false), reduced ? 100 : 2600);
    });
    $("#skip").addEventListener("click", () => endIntro(true));
  }

  // ---------- Hero ----------
  buildInvitation($("#heroDemo"), modelById("esmeralda"), {});

  // ---------- Catálogo ----------
  const families = ["Todos", ...new Set(MODELS.map(m => m.family))];
  const filters = $("#filters"), catalog = $("#catalog");
  const famLabel = { Elegante: "Elegantes", "Orgánico": "Orgánicos" };
  families.forEach((f, i) => filters.append(el("button", { class: "chip", type: "button", "aria-pressed": String(i === 0), text: famLabel[f] || f,
    onclick: e => {
      $$(".chip", filters).forEach(c => c.setAttribute("aria-pressed", String(c === e.currentTarget)));
      $$(".mcard", catalog).forEach(c => (c.hidden = f !== "Todos" && c.dataset.family !== f));
    } })));
  MODELS.forEach((m, i) => {
    const card = el("button", { class: "mcard", type: "button", "data-family": m.family, "aria-label": `Ver el modelo ${m.name} en vivo`, onclick: () => openPreview(m.id) }, [
      modelArt(m),
      el("div", { class: "mmeta" }, [el("div", {}, [el("b", { text: `${i + 1}. ${m.name}` }), el("small", { text: m.family })]), el("span", { class: "see", text: "Ver en vivo →" })])
    ]);
    catalog.append(card);
  });

  // ---------- Planes ----------
  const plansBox = $("#plans");
  CFG.plans.forEach(p => {
    plansBox.append(el("article", { class: "plan" + (p.featured ? " featured" : "") }, [
      p.featured ? el("span", { class: "badge", text: "El más elegido" }) : null,
      el("h3", { text: p.name }),
      el("p", { class: "price" }, [money(p.price), el("small", { text: " " + CFG.currency })]),
      el("p", { class: "rev" }, [el("b", { text: String(p.revisions) }), " rondas de revisión"]),
      el("ul", {}, p.features.slice(1).map(f => el("li", { text: f }))),
      el("button", { class: p.featured ? "btn" : "btn btn-ghost", type: "button", text: `Elegir ${p.name}`, onclick: () => { data.plan = p.id; save(); openOrder(1); } })
    ]));
  });

  // ---------- Vista previa ----------
  const preview = $("#preview");
  let previewModel = null, lastFocus = null, previewCtl = null;
  function openPreview(id) {
    const m = modelById(id); previewModel = m;
    lastFocus = document.activeElement;
    $("#previewTitle").textContent = m.name;
    $("#previewFamily").textContent = m.family;
    $("#previewBlurb").textContent = m.blurb;
    $("#previewChoose").textContent = data.modelo === m.id && !$("#order").hidden ? "Seguir con este modelo" : "Elegir este modelo";
    preview.hidden = false;
    document.body.classList.add("locked");
    previewCtl = buildInvitation($("#previewScreen"), m, data, { autoOpen: !reduced });
    $("[data-close]", preview).focus();
  }
  function closePreview() {
    preview.hidden = true;
    if ($("#order").hidden) document.body.classList.remove("locked");
    const t = timers.get($("#previewScreen")); if (t) clearInterval(t);
    if (lastFocus) lastFocus.focus();
  }
  $("[data-close]", preview).addEventListener("click", closePreview);
  preview.addEventListener("click", e => { if (e.target === preview) closePreview(); });
  $("#previewReplay").addEventListener("click", () => { previewCtl = buildInvitation($("#previewScreen"), previewModel, data, { autoOpen: true }); });
  $("#previewChoose").addEventListener("click", () => {
    data.modelo = previewModel.id; save();
    closePreview();
    if ($("#order").hidden) openOrder(data.nombre1 ? 4 : 1); else { renderPick(); showStep(4); }
  });

  // ---------- Pedido ----------
  const order = $("#order"), form = $("#orderForm"), steps = $$(".step", form), errBox = $("#formError");
  let current = 1;
  const F = name => form.elements[name];

  $("#planSelect").append(...CFG.plans.map(p => el("option", { value: p.id, text: `${p.name} · ${money(p.price)} · ${p.revisions} revisiones` })));
  $("#zoneSelect").append(...CFG.timeZones.map(z => el("option", { value: z.id, text: z.label })));

  function fillForm() {
    for (const k of ["nombre1", "nombre2", "frase", "plan", "fecha", "hora", "zona", "lugar", "direccion", "mapa", "telefono", "fechaLimite", "musica", "notas", "facNombre", "facRuc", "facDv", "facCorreo", "facDireccion"]) {
      if (F(k) && data[k] != null) F(k).value = data[k];
    }
    $$("input[name=acompanantes]", form).forEach(r => (r.checked = r.value === (data.acompanantes || "si")));
    F("quiereFactura").checked = !!data.quiereFactura;
    $("#facturaField").hidden = !data.quiereFactura;
    F("fecha").min = todayISO(); F("fecha").max = maxISO();
    F("fechaLimite").min = todayISO(); F("fechaLimite").max = maxISO();
    renderProgram(); renderPick(); renderPlanBits(); renderThumbs(); updateWa(); updateCount();
  }
  form.addEventListener("input", e => {
    const t = e.target;
    if (!t.name || t.type === "file" || t.name === "aviso" || t.name === "permisoFotos" || t.name === "quiereFactura" || t.name.startsWith("extra") || t.name.startsWith("act")) return;
    data[t.name] = t.value;
    t.removeAttribute("aria-invalid");
    if (t.name === "plan") renderPlanBits();
    if (t.name === "frase") updateCount();
    if (["nombre1", "nombre2", "acompanantes"].includes(t.name)) updateWa();
    save();
  });
  form.addEventListener("change", e => {
    if (e.target.name === "acompanantes") { data.acompanantes = e.target.value; updateWa(); save(); }
    if (e.target.name === "quiereFactura") { data.quiereFactura = e.target.checked; $("#facturaField").hidden = !e.target.checked; save(); }
  });
  function updateCount() { $("#fraseCount").textContent = (F("frase").value || "").length; }
  function updateWa() {
    const n1 = data.nombre1 || "Ana", n2 = data.nombre2 || "Luis";
    $("#waPreview").textContent = `Hola, soy Carla. Confirmo mi asistencia a la boda de ${n1} y ${n2}.` + (data.acompanantes !== "no" ? " Vamos 2 personas." : "");
  }

  // Programa
  function renderProgram() {
    const box = $("#programList"); box.textContent = "";
    (data.programa || []).forEach((a, i) => {
      const t = el("input", { type: "time", name: "act-h", value: a.hora || "", "aria-label": `Hora del acto ${i + 1}` });
      const n = el("input", { name: "act-n", value: a.acto || "", maxlength: "40", placeholder: "Ceremonia, cena…", "aria-label": `Nombre del acto ${i + 1}` });
      const sync = () => { data.programa[i] = { hora: t.value, acto: n.value }; save(); };
      t.addEventListener("input", sync); n.addEventListener("input", sync);
      box.append(el("div", { class: "act" }, [t, n, el("button", { type: "button", text: "×", "aria-label": `Quitar acto ${i + 1}`, onclick: () => { data.programa.splice(i, 1); save(); renderProgram(); } })]));
    });
  }
  $("#addAct").addEventListener("click", () => {
    data.programa = data.programa || [];
    if (data.programa.length >= 8) return;
    data.programa.push({ hora: "", acto: "" }); save(); renderProgram();
    $$("#programList .act").pop().querySelector("input").focus();
  });

  // Modelos en el pedido
  function renderPick() {
    const box = $("#modelPick"); box.textContent = "";
    MODELS.forEach(m => {
      const card = el("div", { class: "pcard", role: "radio", tabindex: "0", "aria-checked": String(data.modelo === m.id), "aria-label": m.name }, [
        modelArt(m, data.nombre1 || "Ana", data.nombre2 || "Luis"),
        el("div", { class: "mmeta" }, [el("div", {}, [el("b", { text: m.name }), el("small", { text: m.family })]),
          el("button", { class: "see", type: "button", text: "Ver", "aria-label": `Ver ${m.name} con sus datos`, onclick: e => { e.stopPropagation(); openPreview(m.id); } })])
      ]);
      const pick = () => { data.modelo = m.id; save(); $$(".pcard", box).forEach(c => c.setAttribute("aria-checked", String(c === card))); errBox.textContent = ""; };
      card.addEventListener("click", pick);
      card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
      box.append(card);
    });
  }

  // Plan: música, extras y fotos
  function renderPlanBits() {
    const p = planById(data.plan);
    $("#maxPhotos").textContent = p.maxPhotos;
    $("#musicField").hidden = !p.music;
    $("#extrasField").hidden = !p.extras;
    const list = $("#extrasList"); list.textContent = "";
    data.extras = (data.extras || []).filter(x => CFG.extrasOptions.includes(x)).slice(0, p.extras);
    CFG.extrasOptions.forEach(opt => {
      const cb = el("input", { type: "checkbox", name: "extra", value: opt });
      cb.checked = data.extras.includes(opt);
      cb.addEventListener("change", () => {
        data.extras = $$("input[name=extra]:checked", list).map(x => x.value);
        $$("input[name=extra]", list).forEach(x => (x.disabled = !x.checked && data.extras.length >= p.extras));
        save();
      });
      list.append(el("label", { class: "check" }, [cb, el("span", { text: opt })]));
    });
    $$("input[name=extra]", list).forEach(x => (x.disabled = !x.checked && data.extras.length >= p.extras));
  }

  // Fotos
  async function compress(file) {
    try {
      const bmp = await createImageBitmap(file);
      const max = 2000, k = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.86));
      return blob || file;
    } catch { return file; }
  }
  $("#photoInput").addEventListener("change", async e => {
    const max = planById(data.plan).maxPhotos;
    const files = [...e.target.files];
    e.target.value = "";
    errBox.textContent = "";
    for (const f of files) {
      if (photos.length >= max) { errBox.textContent = `Su plan incluye hasta ${max} fotos.`; break; }
      if (!f.type.startsWith("image/") && !/\.heic$/i.test(f.name)) continue;
      if (f.size > 25 * 1024 * 1024) { errBox.textContent = `"${f.name}" pesa demasiado (máximo 25 MB).`; continue; }
      const blob = await compress(f);
      photos.push({ blob, url: URL.createObjectURL(blob), name: f.name.replace(/\.\w+$/, "") + ".jpg" });
    }
    renderThumbs();
  });
  function renderThumbs() {
    const ul = $("#thumbs"); ul.textContent = "";
    if (cover >= photos.length) cover = 0;
    photos.forEach((p, i) => {
      ul.append(el("li", { class: i === cover ? "cover" : "" }, [
        el("img", { src: p.url, alt: `Foto ${i + 1}${i === cover ? ", portada" : ""}`, tabindex: "0",
          onclick: () => { cover = i; renderThumbs(); }, onkeydown: ev => { if (ev.key === "Enter") { cover = i; renderThumbs(); } } }),
        i === cover ? el("span", { class: "star", text: "★" }) : null,
        el("button", { class: "rm", type: "button", text: "×", "aria-label": `Quitar foto ${i + 1}`, onclick: () => { URL.revokeObjectURL(p.url); photos.splice(i, 1); if (cover > i) cover--; renderThumbs(); } })
      ]));
    });
    $("#coverHelp").hidden = photos.length < 2;
  }

  // Navegación
  function showStep(n) {
    current = n;
    steps.forEach(s => (s.hidden = +s.dataset.step !== n));
    const s = steps.find(x => +x.dataset.step === n);
    $("#orderTitle").textContent = s.dataset.title;
    $("#stepCount").textContent = n <= 6 ? `Paso ${n} de 6` : "Resumen";
    $$(".progress i").forEach((b, i) => b.classList.toggle("on", i < n));
    $("#back").textContent = n === 1 ? "Cancelar" : "Atrás";
    $("#next").textContent = n === 6 ? "Ver resumen" : n === 7 ? (CFG.orderEndpoint || CFG.whatsappPedidos ? "Enviar pedido" : "Enviar pedido (demostración)") : "Siguiente";
    errBox.textContent = "";
    if (n === 7) renderSummary();
    order.scrollTop = 0;
    $("#orderTitle").focus({ preventScroll: true });
  }
  function fail(input, msg) { if (input) { input.setAttribute("aria-invalid", "true"); input.focus(); } errBox.textContent = msg; return false; }
  function validate(n) {
    const req = $$("[required]", steps.find(x => +x.dataset.step === n)).filter(i => i.type !== "checkbox");
    for (const i of req) if (!String(i.value).trim()) return fail(i, "Falta un dato obligatorio.");
    if (n === 2) {
      if (!validISO(data.fecha)) return fail(F("fecha"), "Revisen la fecha de la boda.");
      if (data.fecha < todayISO()) return fail(F("fecha"), "La fecha de la boda no puede estar en el pasado.");
      if (data.fecha > maxISO()) return fail(F("fecha"), "La fecha de la boda no puede ser a más de 10 años.");
      if (data.mapa && !/^https?:\/\//i.test(data.mapa)) return fail(F("mapa"), "El enlace del mapa debe empezar con https://");
    }
    if (n === 3) {
      const d = digits(data.telefono);
      if (d.length < 8 || d.length > 15) return fail(F("telefono"), "Revisen el número de WhatsApp (con código de país).");
      if (d.length === 8) { data.telefono = "+507 " + data.telefono; F("telefono").value = data.telefono; save(); }
      if (!validISO(data.fechaLimite) || data.fechaLimite < todayISO() || (data.fecha && data.fechaLimite > data.fecha)) return fail(F("fechaLimite"), "La fecha límite debe estar entre hoy y el día de la boda.");
    }
    if (n === 4 && !modelById(data.modelo)) return fail(null, "Elijan un modelo para seguir.");
    if (n === 5) {
      const p = planById(data.plan);
      if (photos.length > p.maxPhotos) return fail(null, `Su plan incluye hasta ${p.maxPhotos} fotos. Quiten ${photos.length - p.maxPhotos}.`);
      if (p.extras && (data.extras || []).length !== p.extras) return fail(null, `Elijan ${p.extras} secciones extra.`);
    }
    if (n === 6) {
      if (data.quiereFactura) {
        if (!(data.facNombre || "").trim()) return fail(F("facNombre"), "Escriban el nombre o razón social para la factura.");
        if (!(data.facRuc || "").trim()) return fail(F("facRuc"), "Escriban el RUC o la cédula para la factura.");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.facCorreo || "")) return fail(F("facCorreo"), "Revisen el correo para enviar la factura.");
      }
      if (!F("aviso").checked) return fail(F("aviso"), "Para seguir, acepten el aviso de uso de información.");
      if (!F("permisoFotos").checked) return fail(F("permisoFotos"), "Confirmen que tienen permiso para usar las fotos.");
    }
    return true;
  }
  form.addEventListener("submit", e => {
    e.preventDefault();
    if (current < 7) { if (validate(current)) showStep(current + 1); }
    else submitOrder();
  });
  $("#back").addEventListener("click", () => (current === 1 ? closeOrder() : showStep(current - 1)));

  // Resumen
  function renderSummary() {
    const p = planById(data.plan), m = modelById(data.modelo);
    const rows = [
      ["Pareja", `${data.nombre1} & ${data.nombre2}`, 1],
      ["Frase", data.frase || "—", 1],
      ["Fecha", `${longDate(data.fecha)} · ${data.hora} (${(CFG.timeZones.find(z => z.id === data.zona) || {}).label || data.zona})`, 2],
      ["Lugar", `${data.lugar}, ${data.direccion}`, 2],
      ["Programa", (data.programa || []).filter(a => a.hora && a.acto).map(a => `${a.hora} ${a.acto}`).join(" · ") || "—", 2],
      ["Confirmaciones", `${data.telefono} · antes del ${longDate(data.fechaLimite)}`, 3],
      ["Modelo", m ? m.name : "—", 4],
      ["Fotos", photos.length ? `${photos.length}` : "Sin fotos", 5],
      p.music ? ["Música", data.musica || "—", 5] : null,
      p.extras ? ["Extras", (data.extras || []).join(", "), 5] : null,
      ["Plan", `${p.name} · ${p.revisions} revisiones · ${p.delivery.toLowerCase()}`, 1],
      ["Factura", data.quiereFactura ? `${data.facNombre} · ${data.facRuc}${data.facDv ? " DV" + data.facDv : ""} · ${data.facCorreo}` : "No", 6]
    ].filter(Boolean);
    const dl = $("#summary"); dl.textContent = "";
    rows.forEach(([k, v, st]) => dl.append(el("dt", { text: k }), el("dd", {}, [el("span", { text: v }),
      el("button", { class: "edit", type: "button", text: "Editar", "aria-label": `Editar ${k.toLowerCase()}`, onclick: () => showStep(st) })])));
    $("#total").textContent = `${money(p.price)} ${CFG.currency}`;
    const note = $("#demoNote");
    note.hidden = !!CFG.orderEndpoint;
    if (!CFG.orderEndpoint && CFG.whatsappPedidos) note.textContent = "Al enviar, se abrirá WhatsApp con su pedido completo. Ahí mismo adjunten sus fotos y el comprobante de Yappy.";
  }

  // Envío
  function buildPayload(code) {
    const p = planById(data.plan), m = modelById(data.modelo);
    return {
      pedido: code, creado: new Date().toISOString(),
      pareja: { nombre1: data.nombre1, nombre2: data.nombre2, monograma: initials(data.nombre1, data.nombre2) },
      frase: data.frase || "",
      fecha: { dia: data.fecha, hora: data.hora, zonaHoraria: data.zona, iso: isoWithOffset(data.fecha, data.hora, data.zona) },
      lugar: { nombre: data.lugar, direccion: data.direccion, mapa: data.mapa || "" },
      programa: (data.programa || []).filter(a => a.hora && a.acto),
      confirmacion: { telefono: data.telefono, whatsapp: digits(data.telefono), fechaLimite: data.fechaLimite, preguntarAcompanantes: data.acompanantes !== "no" },
      modelo: { id: m.id, nombre: m.name, familia: m.family },
      plan: { id: p.id, nombre: p.name, precio: p.price, moneda: CFG.currency, revisiones: p.revisions, entrega: p.delivery, maxFotos: p.maxPhotos },
      musica: p.music ? data.musica || "" : "",
      seccionesExtra: p.extras ? data.extras : [],
      notas: data.notas || "",
      fotos: photos.map((f, i) => ({ archivo: `foto-${String(i + 1).padStart(2, "0")}.jpg`, portada: i === cover })),
      aviso: { aceptado: true, permisoFotos: true, version: CFG.avisoVersion, fecha: new Date().toISOString() },
      factura: data.quiereFactura ? { nombre: data.facNombre.trim(), ruc: data.facRuc.trim(), dv: (data.facDv || "").trim(), correo: data.facCorreo.trim(), direccion: (data.facDireccion || "").trim() } : null,
      tratamiento: "ustedes"
    };
  }
  let lastPayload = null;
  const toBase64 = blob => new Promise((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1]);
    r.onerror = ko;
    r.readAsDataURL(blob);
  });
  async function submitOrder() {
    const btn = $("#next");
    const code = "ML-" + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 6).padEnd(4, "0").toUpperCase();
    const payload = buildPayload(code);
    lastPayload = payload;
    if (CFG.orderEndpoint) {
      btn.disabled = true; btn.textContent = "Enviando…"; errBox.textContent = "";
      try {
        // Google Apps Script recibe JSON en texto plano (evita la verificación previa de CORS).
        const fotos = [];
        for (let i = 0; i < photos.length; i++) {
          btn.textContent = `Subiendo fotos (${i + 1}/${photos.length})…`;
          fotos.push({ nombre: payload.fotos[i].archivo, tipo: photos[i].blob.type || "image/jpeg", datos: await toBase64(photos[i].blob) });
        }
        btn.textContent = "Enviando…";
        const res = await fetch(CFG.orderEndpoint, { method: "POST", body: JSON.stringify({ pedido: payload, fotos }), headers: { "Content-Type": "text/plain;charset=utf-8" } });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || out.ok !== true) throw new Error(out.error || res.status);
        store.clear();
      } catch {
        btn.disabled = false; showStep(7);
        errBox.textContent = "No se pudo enviar el pedido. Revisen su conexión e inténtenlo de nuevo.";
        return;
      }
    }
    showDone(payload);
  }
  function showDone(payload) {
    form.hidden = true; $(".progress").hidden = true; $("#stepCount").hidden = true; $("#orderTitle").hidden = true; $(".order-body .redline").hidden = true;
    const p = planById(data.plan);
    $("#orderCode").textContent = payload.pedido;
    $("#deliveryText").textContent = p.delivery.replace(/^Boceto /, "").toLowerCase() + (p.id === "premium" ? ` (pedidos antes de las ${CFG.sameDayCutoff}, una vez confirmado el pago)` : ", una vez confirmado el pago");
    $("#revText").textContent = `${p.revisions} rondas de revisión`;

    // Pago con Yappy
    const y = CFG.yappy || {};
    const box = $("#yappyBox"); box.textContent = "";
    $("#payAmount").textContent = `${money(p.price)} ${CFG.currency}`;
    if (y.directorio || y.telefono) {
      box.append(...[
        y.directorio ? el("p", {}, ["Directorio: ", el("b", { text: y.directorio })]) : null,
        y.telefono ? el("p", {}, ["Número: ", el("b", { text: y.telefono })]) : null,
        el("p", {}, ["Monto: ", el("b", { text: `${money(p.price)}` })]),
        el("p", {}, ["En la descripción escriban: ", el("b", { text: payload.pedido })])
      ].filter(Boolean));
      $("#payText").textContent = "Paguen con Yappy y envíennos el comprobante por WhatsApp.";
    } else {
      $("#payText").textContent = "Les enviamos los datos de Yappy por WhatsApp para completar el pago.";
      box.hidden = true;
    }
    if (CFG.whatsappPedidos) {
      // Sin Apps Script, el pedido completo viaja en el mensaje de WhatsApp (las fotos se adjuntan en el chat).
      const full = !CFG.orderEndpoint;
      const f = payload.factura;
      const hora12 = h => { const [H, M] = (h || "00:00").split(":").map(Number); return `${H % 12 || 12}:${String(M).padStart(2, "0")} ${H < 12 ? "a. m." : "p. m."}`; };
      const diaLargo = d => new Intl.DateTimeFormat("es-PA", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
      const lines = [
        `¡Hola, Miguel! Somos ${payload.pareja.nombre1} y ${payload.pareja.nombre2} 💍`,
        `Acabamos de pedir nuestra invitación en Mejorativa Love.`,
        "",
        `*Pedido ${payload.pedido}*`,
        `Plan ${p.name} · ${money(p.price)} · Modelo ${payload.modelo.nombre}`,
        `Nos casamos el ${diaLargo(payload.fecha.dia)}, a las ${hora12(payload.fecha.hora)}, en ${payload.lugar.nombre}.`
      ];
      if (full) lines.push(
        "",
        "*Los detalles*",
        payload.frase ? `Frase: “${payload.frase}”` : null,
        `Dirección: ${payload.lugar.direccion}${payload.lugar.mapa ? " · " + payload.lugar.mapa : ""}`,
        payload.programa.length ? `Programa: ${payload.programa.map(a => hora12(a.hora) + " " + a.acto).join(" · ")}` : null,
        `Confirmaciones al ${payload.confirmacion.telefono}, hasta el ${longDate(payload.confirmacion.fechaLimite)}${payload.confirmacion.preguntarAcompanantes ? ", con acompañantes" : ""}.`,
        payload.musica ? `Canción: ${payload.musica}` : null,
        payload.seccionesExtra.length ? `Secciones extra: ${payload.seccionesExtra.join(", ")}` : null,
        payload.notas ? `Notas: ${payload.notas}` : null,
        payload.fotos.length ? `Les adjunto ${payload.fotos.length} ${payload.fotos.length === 1 ? "foto" : "fotos"}.` : "Sin fotos: usen la ilustración del modelo.",
        f ? `Factura a nombre de ${f.nombre} · ${f.ruc}${f.dv ? " DV " + f.dv : ""} · ${f.correo}` : null
      );
      lines.push("", "Aquí va el comprobante de Yappy 👇");
      const msg = lines.filter(x => x != null).join("\n");
      const wa = $("#waBtn"); wa.href = `https://wa.me/${digits(CFG.whatsappPedidos)}?text=${encodeURIComponent(msg)}`; wa.hidden = false;
    }
    $("#downloadBtn").hidden = !!CFG.orderEndpoint || !!CFG.whatsappPedidos;
    if (!CFG.orderEndpoint && CFG.whatsappPedidos) $("#waBtn").textContent = "Enviar pedido y comprobante por WhatsApp";
    $("#done").hidden = false; order.scrollTop = 0; $("#done").focus({ preventScroll: true });
  }
  $("#downloadBtn").addEventListener("click", () => {
    if (!lastPayload) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(lastPayload, null, 2)], { type: "application/json" }));
    el("a", { href: url, download: `pedido-${lastPayload.pedido}.json` }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  // Abrir y cerrar
  function openOrder(step = 1) {
    lastFocus = document.activeElement;
    form.hidden = false; $("#done").hidden = true;
    [".progress", "#stepCount", "#orderTitle", ".order-body .redline"].forEach(s => ($(s).hidden = false));
    fillForm();
    order.hidden = false;
    document.body.classList.add("locked");
    showStep(step);
  }
  function closeOrder() {
    order.hidden = true;
    document.body.classList.remove("locked");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $$("[data-start]").forEach(b => b.addEventListener("click", () => openOrder(1)));
  $("#orderClose").addEventListener("click", closeOrder);
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (!preview.hidden) closePreview();
    else if (!order.hidden) closeOrder();
  });
  addEventListener("beforeunload", () => photos.forEach(p => URL.revokeObjectURL(p.url)));
})();
