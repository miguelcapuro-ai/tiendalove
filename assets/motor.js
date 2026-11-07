/* Mejorativa Love · motor de invitaciones.
   Dibuja una invitación a partir del modelo (arte y composición), la ficha de diseño de Claude
   (paleta, letra, textos, orden, animación) y los datos del evento. Lo usan la tienda (vista previa),
   el portal de los novios y la página de cada invitado. */
(() => {
  "use strict";
  const MODELS = window.MODELOS || [];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const EASE = "cubic-bezier(.22,1,.36,1)";
  const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
  const SAMPLE = { nombre1: "Ana", nombre2: "Luis", frase: "Elegimos el mismo camino", hora: "16:00", zona: "America/Panama",
    lugar: "Hacienda Los Robles", direccion: "Boquete, Chiriquí",
    programa: [{ hora: "16:00", acto: "Ceremonia" }, { hora: "17:30", acto: "Cóctel" }, { hora: "19:00", acto: "Cena" }, { hora: "21:00", acto: "Fiesta" }] };

  // ---------- Utilidades ----------
  const el = (tag, attrs = {}, kids = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k === "text") n.textContent = v;
      else if (k === "style") n.style.cssText = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    for (const c of [].concat(kids)) if (c != null && c !== false) n.append(c);
    return n;
  };
  const modelById = id => MODELS.find(m => m.id === id) || MODELS[0];
  const initials = (a, b) => ((a || "A")[0] + "&" + (b || "B")[0]).toUpperCase();
  const digits = s => String(s || "").replace(/\D/g, "");
  const pad = n => String(n).padStart(2, "0");
  const shortDate = f => { if (!f) return ""; const [y, m, d] = f.split("-"); return `${+d} ${MESES[+m - 1]} ${y}`; };
  const longDate = f => f ? new Intl.DateTimeFormat("es-PA", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(f + "T12:00:00Z")) : "";
  const hora12 = h => { if (!/^\d\d:\d\d$/.test(h || "")) return h || ""; const [H, M] = h.split(":").map(Number); return `${H % 12 || 12}:${pad(M)} ${H < 12 ? "a. m." : "p. m."}`; };
  const futura = () => { const d = new Date(); d.setMonth(d.getMonth() + 4); return d.toISOString().slice(0, 10); };
  function tzOffsetMin(utcMs, tz) {
    try {
      const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
        .formatToParts(new Date(utcMs)).map(x => [x.type, x.value]));
      return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - utcMs) / 60000);
    } catch { return -300; }
  }
  function eventDate(fecha, hora, tz) {
    const [y, m, d] = fecha.split("-").map(Number); const [hh, mm] = (hora || "16:00").split(":").map(Number);
    const guess = Date.UTC(y, m - 1, d, hh, mm);
    return new Date(guess - tzOffsetMin(guess, tz || "America/Panama") * 60000);
  }

  // Fuentes de las invitaciones (una sola carga).
  let fuentes = false;
  function cargarFuentes() {
    if (fuentes) return; fuentes = true;
    document.head.append(el("link", { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Pinyon+Script&family=Bodoni+Moda:wght@500&family=Playfair+Display:ital,wght@0,500;1,500&family=Italiana&family=Poiret+One&family=Fraunces:wght@400;600&family=Josefin+Sans:wght@300;400;600&family=Cinzel:wght@500&family=Great+Vibes&family=Orbitron:wght@500;700&family=VT323&family=Shippori+Mincho:wght@500;700&family=Rajdhani:wght@500;600&display=swap" }));
  }
  const familia = f => `'${f}', ${/Josefin|Archivo|Orbitron|Rajdhani/.test(f) ? "sans-serif" : /VT323/.test(f) ? "monospace" : /Pinyon|Vibes/.test(f) ? "cursive" : "serif"}`;

  // ---------- Composición propia de cada modelo ----------
  const RECIPES = {
    arco: { cd: "elegant", tl: "centered", loc: "arch" },
    noche: { cd: "rings", tl: "constellation", loc: "moon", dark: true },
    galeria: { cd: "sentence", tl: "grid", loc: "block", numerar: true },
    marco: { cd: "frames", tl: "rail", loc: "frame" },
    real: { cd: "medallions", tl: "filigree", loc: "frame", dark: true },
    deco: { cd: "pillars", tl: "steps", loc: "plaque", dark: true },
    botanico: { cd: "handwritten", tl: "leaves", loc: "simple" },
    desierto: { cd: "arches", tl: "rail", loc: "arch" },
    bitacora: { cd: "log", tl: "route", loc: "pass", kicker: "Rumbo a nuestra boda" },
    cumbre: { cd: "peaks", tl: "trail", loc: "sign" },
    selva: { cd: "pills", tl: "cards", loc: "card", dark: true },
    postal: { cd: "ticket", tl: "postcards", loc: "postcard" },
  };
  // Los modelos nuevos (remoto: true) guardan su arte en el servidor de Love, no en este repositorio.
  const asset = (m, kind, thumb) => m.remoto && window.LOVE && window.LOVE.api
    ? `${window.LOVE.api}/love/m/${m.id}/${thumb ? "thumb-" : ""}${kind}.webp`
    : `${window.LOVE_BASE || ""}assets/modelos/${m.id}/${thumb ? "thumb-" : ""}${kind}.webp`;

  // Ficha mínima cuando todavía no hay diseño de Claude (catálogo y vista previa de la tienda).
  function disenoInicial(m) {
    const f = s => s.replace(/'/g, "").split(",")[0].trim();
    return { modelo: m.id, paleta: { papel: m.paper, tinta: m.ink, acento: m.accent, suave: "" }, tipografia: { titulo: f(m.title), cuerpo: f(m.body) },
      textos: { encabezado: m.layout === "galeria" ? "Nos casamos" : "Nuestra boda", intro: "Queremos compartir con ustedes el día más importante de nuestra historia.",
        titulo_cuenta: "Falta poco", titulo_programa: "El programa", titulo_lugar: "Dónde", titulo_rsvp: "¿Nos acompañan?",
        mensaje_rsvp: "Confirmen su asistencia para guardarles su lugar.", boton_rsvp: "Confirmar asistencia", cierre: "Los esperamos con todo el corazón." },
      preguntas: [], secciones: ["cuenta", "programa", "fotos", "lugar", "rsvp"], animacion: { duracion_ms: 3000, particulas: "ninguna" } };
  }

  // ---------- Partículas (pétalos, destellos, hojas, estrellas) ----------
  function particulas(contenedor, tipo, color) {
    if (reduced || !tipo || tipo === "ninguna") return () => {};
    const c = el("canvas", { class: "inv-particulas", "aria-hidden": "true" });
    contenedor.append(c);
    const ctx = c.getContext("2d");
    const dpr = Math.min(2, devicePixelRatio || 1);
    const W = c.width = contenedor.clientWidth * dpr, H = c.height = contenedor.clientHeight * dpr;
    const n = tipo === "estrellas" || tipo === "destellos" ? 46 : 26;
    const ps = Array.from({ length: n }, () => ({ x: Math.random() * W, y: -Math.random() * H * .6, r: (tipo === "petalos" || tipo === "hojas" ? 5 + Math.random() * 6 : 1 + Math.random() * 2) * dpr,
      vy: (0.5 + Math.random() * 1.1) * dpr, vx: (Math.random() - .5) * .6 * dpr, a: Math.random() * 6.28, va: (Math.random() - .5) * .05, f: Math.random() * 6.28 }));
    let vivo = true, t0 = performance.now();
    const col = tipo === "petalos" ? "#f6d3d6" : tipo === "hojas" ? "#9cb18f" : tipo === "estrellas" ? "#ffffff" : (/^#[0-9a-f]{6}$/i.test(color || "") ? color : "#f3d48a");
    (function frame(t) {
      if (!vivo) return;
      const k = Math.min(1, (t - t0) / 600), fin = Math.max(0, 1 - Math.max(0, t - t0 - 4200) / 1400);
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = k * fin;
      for (const p of ps) {
        p.y += p.vy; p.x += p.vx + Math.sin((t / 900) + p.f) * .4 * dpr; p.a += p.va;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = col;
        if (tipo === "petalos" || tipo === "hojas") { ctx.globalAlpha = k * fin * .85; ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * .55, 0, 0, 6.28); ctx.fill(); }
        else {
          // Punto de luz suave que titila (sin bordes duros)
          const brillo = .35 + .65 * Math.abs(Math.sin(t / 420 + p.f)), rad = p.r * 3.2;
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
          g.addColorStop(0, col); g.addColorStop(.25, col + "cc"); g.addColorStop(1, col + "00");
          ctx.globalAlpha = k * fin * brillo; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rad, 0, 6.28); ctx.fill();
        }
        ctx.restore();
      }
      if (fin > 0) requestAnimationFrame(frame); else c.remove();
    })(t0);
    return () => { vivo = false; c.remove(); };
  }

  // ---------- Construcción ----------
  const timers = new WeakMap();
  function construir(screen, o) {
    cargarFuentes();
    if (timers.has(screen)) timers.get(screen)();
    screen.textContent = "";
    const m = modelById(o.modelo);
    const R = RECIPES[m.layout] || RECIPES.arco;
    const D = o.diseno && o.diseno.paleta ? o.diseno : disenoInicial(m);
    const T = D.textos || {};
    const d = Object.assign({}, o.datos || {});
    const muestra = !d.nombre1;
    const n1 = d.nombre1 || SAMPLE.nombre1, n2 = d.nombre2 || SAMPLE.nombre2;
    const frase = muestra ? SAMPLE.frase : (d.frase || "");
    const fecha = d.fecha || futura();
    const tz = d.zona || "America/Panama";
    const lugar = d.lugar || SAMPLE.lugar, dir = d.direccion || SAMPLE.direccion;
    const programa = (d.programa || []).filter(a => a.hora && a.acto);
    const prog = programa.length ? programa : (muestra ? SAMPLE.programa : []);
    const fotos = o.fotos || [];
    const portada = fotos[o.portada || 0] || null;
    const P = D.paleta;
    const tituloCSS = `font-family:${familia(D.tipografia.titulo)};${/Cormorant|Playfair/.test(D.tipografia.titulo) && m.italic ? "font-style:italic;" : ""}`;
    const limpiezas = [];

    const inv = el("div", { class: `inv L-${m.layout}`, style: `--paper:${P.papel};--ink:${P.tinta};--acc:${P.acento};--suave:${P.suave || "transparent"};--titulo:${familia(D.tipografia.titulo)};--cuerpo:${familia(D.tipografia.cuerpo)}` });

    // Portada
    const hero = el("div", { class: "inv-hero" + (portada ? " has-photo" : "") }, [
      el("img", { class: "inv-hero-bg", src: portada || asset(m, "portada"), alt: "" }),
      el("div", { class: "inv-hero-text", style: `top:${m.heroY * 100}%;color:${portada ? "#fff" : m.heroInk}` }, [
        el("p", { class: "inv-kicker", text: m.kicker || R.kicker || T.encabezado || "Nuestra boda" }),
        el("p", { class: "inv-names", style: tituloCSS }, [n1, el("span", { class: "amp", text: m.layout === "galeria" || m.layout === "deco" ? " & " : "&" }), n2]),
        el("p", { class: "inv-date", text: shortDate(fecha) }),
        frase ? el("p", { class: "inv-phrase", text: `“${frase}”` }) : null,
      ]),
      m.layout === "postal" ? el("div", { class: "stamp", "aria-hidden": "true" }, [el("span", { text: shortDate(fecha) }), el("small", { text: "Panamá" })]) : null,
    ]);

    const body = el("div", { class: "inv-body" });
    let numero = 0;
    const head = t => el("h4", { class: "inv-h", style: tituloCSS }, [R.numerar ? el("span", { class: "num", text: pad(++numero) }) : null, t]);
    const sec = (cls, t, kids) => el("section", { class: `inv-sec ${cls} rv` }, [t ? head(t) : null, ...kids]);
    const ornament = (k = "") => el("img", { class: `orn-img ${R.dark ? "on-dark" : "on-light"}${m.remoto ? " fade" : ""} ${k} rv`, src: asset(m, "ornamento"), alt: "", loading: "lazy" });

    // Intro, saludo personal y padres
    body.append(el("p", { class: "inv-intro rv" }, [T.intro || `${n1} & ${n2} los invitan a celebrar con ellos.`]));
    if (o.invitado) {
      body.append(el("div", { class: "inv-pase rv" }, [
        el("small", { text: "Esta invitación es para" }), el("b", { class: "t-titulo", text: o.invitado.nombre }),
        el("span", { text: `Válida para ${o.invitado.cupos} ${o.invitado.cupos === 1 ? "persona" : "personas"}` }),
      ]));
    }
    if (d.padres1 || d.padres2) {
      body.append(el("div", { class: "inv-padres rv" }, [el("small", { text: "Con la bendición de nuestros padres" }),
        d.padres1 ? el("p", { text: d.padres1 }) : null, d.padres2 ? el("p", { text: d.padres2 }) : null,
        d.padrinos ? el("p", {}, [el("small", { text: "Y nuestros padrinos" }), d.padrinos]) : null]));
    }
    body.append(ornament());

    // Cuenta atrás
    const target = eventDate(fecha, d.hora || "16:00", tz);
    const cd = el("div", { class: `inv-cd cd-${R.cd}`, role: "timer", "aria-label": "Cuenta atrás" });
    let units = [], line = null;
    if (R.cd === "sentence" || R.cd === "log") { line = el("p", { class: "cd-line" }); cd.append(line); }
    else units = ["Días", "Horas", "Minutos", "Segundos"].map(l => { const b = el("b"); cd.append(el("div", { class: "u" }, [b, el("small", { text: R.cd === "pillars" ? l.toUpperCase() : l })])); return b; });
    const tick = () => {
      const s = Math.max(0, Math.floor((target - Date.now()) / 1000));
      if (s === 0) { cd.textContent = ""; cd.append(el("p", { class: "cd-line", text: Date.now() - target < 86400000 ? "¡Hoy es el gran día!" : "Gracias por haber sido parte de este día." })); clearInterval(iv); return; }
      const v = [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60];
      if (R.cd === "sentence") line.textContent = `Faltan ${v[0]} días, ${v[1]} horas y ${v[2]} minutos.`;
      else if (R.cd === "log") line.textContent = `${v[0]}d · ${pad(v[1])}h · ${pad(v[2])}m · ${pad(v[3])}s`;
      else v.forEach((x, i) => (units[i].textContent = i ? pad(x) : x));
    };
    const iv = setInterval(tick, 1000); tick();
    limpiezas.push(() => clearInterval(iv));

    // Calendario
    const titulo = `Boda de ${n1} y ${n2}`;
    const fin = new Date(target.getTime() + 6 * 3600000);
    const fmtCal = x => x.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titulo)}&dates=${fmtCal(target)}/${fmtCal(fin)}&location=${encodeURIComponent(`${lugar}, ${dir}`)}`;
    const ics = () => {
      const txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mejorativa Love//ES", "BEGIN:VEVENT", `UID:${o.slug || "demo"}@love.mejorativa.com`, `DTSTAMP:${fmtCal(new Date())}`,
        `DTSTART:${fmtCal(target)}`, `DTEND:${fmtCal(fin)}`, `SUMMARY:${titulo}`, `LOCATION:${lugar}, ${dir}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
      const a = el("a", { href: URL.createObjectURL(new Blob([txt], { type: "text/calendar" })), download: "boda.ics" }); a.click();
    };

    // Lugar(es)
    const mapsUrl = (mapa, lug, dr) => mapa || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lug}, ${dr}`)}`;
    const wazeUrl = (lug, dr) => `https://waze.com/ul?q=${encodeURIComponent(`${lug}, ${dr}`)}&navigate=yes`;
    function bloqueLugar(lug, dr, hora, mapa) {
      let loc;
      if (R.loc === "pass") {
        loc = el("div", { class: "loc loc-pass" }, [
          el("div", { class: "pass-top" }, [el("span", { text: "Pase de abordar" }), el("span", { text: initials(n1, n2) })]),
          el("div", { class: "pass-grid" }, [el("div", {}, [el("small", { text: "Destino" }), el("b", { text: lug })]), el("div", {}, [el("small", { text: "Fecha" }), el("b", { text: shortDate(fecha) })]),
            el("div", {}, [el("small", { text: "Embarque" }), el("b", { text: hora12(hora) })]), el("div", {}, [el("small", { text: "Puerta" }), el("b", { text: dr })])]),
        ]);
      } else if (R.loc === "postcard") {
        loc = el("div", { class: "loc loc-postcard" }, [el("div", { class: "pc-left" }, [el("p", { class: "place", text: lug }), el("p", { class: "addr", text: dr }), el("p", { class: "addr", text: hora12(hora) })]),
          el("div", { class: "pc-right" }, [el("span", { class: "postmark", text: shortDate(fecha) }), el("span", { class: "pc-lines" })])]);
      } else if (R.loc === "sign") {
        loc = el("div", { class: "loc loc-sign" }, [el("p", { class: "place", text: `${lug} →` }), el("p", { class: "addr", text: dr }), el("p", { class: "addr", text: `${shortDate(fecha)} · ${hora12(hora)}` })]);
      } else {
        loc = el("div", { class: `loc loc-${R.loc}` }, [el("p", { class: "place", text: lug }), el("p", { class: "addr", text: dr }), el("p", { class: "when", text: `${shortDate(fecha)} · ${hora12(hora)}` })]);
      }
      return [loc, el("div", { class: "inv-acc" }, [
        el("a", { class: "inv-mini", href: mapsUrl(mapa, lug, dr), target: "_blank", rel: "noopener", text: "Google Maps" }),
        el("a", { class: "inv-mini", href: wazeUrl(lug, dr), target: "_blank", rel: "noopener", text: "Waze" }),
      ])];
    }

    const rc = d.recepcion && d.recepcion.lugar ? d.recepcion : null;
    const bloques = {
      cuenta: () => sec("s-cd", T.titulo_cuenta || "Falta poco", [cd, el("div", { class: "inv-acc" }, [
        el("a", { class: "inv-mini", href: gcal, target: "_blank", rel: "noopener", text: "Google Calendar" }),
        el("button", { class: "inv-mini", type: "button", onclick: ics, text: "Calendario del teléfono" })])]),
      programa: () => prog.length ? sec("s-tl", T.titulo_programa || "El programa", [el("ol", { class: `inv-tl tl-${R.tl}` }, prog.map(a => el("li", {}, [
        R.tl === "trail" ? el("span", { class: "mk", text: "▲", "aria-hidden": "true" }) : null, el("time", { text: hora12(a.hora) }), el("span", { class: "act", text: a.acto })])))]) : null,
      fotos: () => {
        const resto = fotos.filter((_, i) => i !== (o.portada || 0));
        return resto.length ? el("div", { class: "inv-gal rv", tabindex: "0", role: "region", "aria-label": "Fotos de los novios" }, resto.map(u => el("img", { src: u, alt: "Foto de los novios", loading: "lazy" }))) : null;
      },
      lugar: () => sec("s-loc", T.titulo_lugar || "Dónde", [
        rc ? el("span", { class: "inv-sub", text: d.ceremonia || "Ceremonia" }) : null,
        ...bloqueLugar(lugar, dir, d.hora || "16:00", d.mapa),
        rc ? el("div", { class: "inv-loc2" }, [el("span", { class: "inv-sub", text: "Recepción" }), ...bloqueLugar(rc.lugar, rc.direccion || "", rc.hora || d.hora, rc.mapa)]) : null,
        d.transporte ? el("p", { class: "inv-nota", text: d.transporte }) : null,
      ]),
      historia: () => (T.historia || d.historia) ? sec("s-hist", "Nuestra historia", [el("p", { class: "inv-texto", text: T.historia || d.historia })]) : null,
      vestimenta: () => (T.vestimenta || d.vestimenta) ? sec("s-vest", "Código de vestimenta", [el("p", { class: "inv-texto", text: T.vestimenta || d.vestimenta })]) : null,
      regalos: () => (T.regalos || d.regalos || d.regalosYappy || d.regalosEnlace) ? sec("s-reg", "Regalos", [
        (T.regalos || d.regalos) ? el("p", { class: "inv-texto", text: T.regalos || d.regalos }) : null,
        d.regalosYappy ? el("div", {}, [el("div", { class: "inv-yappy" }, [`Yappy ${d.regalosYappy}`]),
          el("div", { class: "inv-acc" }, [el("button", { class: "inv-mini", type: "button", text: "Copiar número", onclick: e => { navigator.clipboard?.writeText(digits(d.regalosYappy)); e.currentTarget.textContent = "Copiado"; } })])]) : null,
        d.regalosEnlace ? el("div", { class: "inv-acc" }, [el("a", { class: "inv-mini", href: d.regalosEnlace, target: "_blank", rel: "noopener", text: "Ver mesa de regalos" })]) : null,
      ]) : null,
      hospedaje: () => (T.hospedaje || d.hospedaje) ? sec("s-hosp", "Hospedaje", [el("p", { class: "inv-texto", text: T.hospedaje || d.hospedaje })]) : null,
      preguntas: () => (D.preguntas || []).length ? sec("s-faq", "Preguntas", [el("div", { class: "inv-faq" }, D.preguntas.map(q => el("details", {}, [el("summary", { text: q.p }), el("p", { text: q.r })])))]) : null,
      rsvp: () => sec("s-rsvp", T.titulo_rsvp || "¿Nos acompañan?", [rsvp()]),
    };

    // Confirmación de asistencia
    function rsvp() {
      const caja = el("div");
      const cerrado = o.cerrado;
      const max = o.invitado ? o.invitado.cupos : (d.acompanantes === "no" ? 1 : (o.cupoGeneral || 2));
      const intro = el("p", { class: "addr", text: cerrado ? "La fecha para confirmar ya pasó. Escríbanles directamente a los novios." :
        `${T.mensaje_rsvp || "Confirmen su asistencia."}${d.fechaLimite ? ` Antes del ${longDate(d.fechaLimite)}.` : ""}` });
      caja.append(intro);
      if (d.soloAdultos) caja.append(el("p", { class: "inv-nota", text: "Celebración solo para adultos." }));
      if (cerrado) return caja;
      const previa = o.invitado && o.invitado.rsvp;
      function formulario() {
        let asiste = previa ? !!previa.asiste : true, personas = previa && previa.personas ? previa.personas : Math.min(max, max);
        const err = el("p", { class: "inv-err", role: "alert" });
        const out = el("output", { text: String(personas) });
        const menos = el("button", { type: "button", "aria-label": "Una persona menos", text: "−" });
        const mas = el("button", { type: "button", "aria-label": "Una persona más", text: "+" });
        const sync = () => { out.textContent = personas; menos.disabled = personas <= 1; mas.disabled = personas >= max; cupos.hidden = !asiste; extra.hidden = !asiste; };
        menos.onclick = () => { personas = Math.max(1, personas - 1); sync(); };
        mas.onclick = () => { personas = Math.min(max, personas + 1); sync(); };
        const si = el("button", { type: "button", "aria-pressed": String(asiste), text: "Sí, ahí estaremos" });
        const no = el("button", { type: "button", "aria-pressed": String(!asiste), text: "No podremos ir" });
        si.onclick = () => { asiste = true; si.setAttribute("aria-pressed", "true"); no.setAttribute("aria-pressed", "false"); sync(); };
        no.onclick = () => { asiste = false; no.setAttribute("aria-pressed", "true"); si.setAttribute("aria-pressed", "false"); sync(); };
        const nombre = o.invitado ? null : el("input", { name: "nombre", maxlength: "80", autocomplete: "name", placeholder: "Nombre y apellido" });
        const cupos = el("label", {}, [max > 1 ? `¿Cuántos van? (hasta ${max})` : "Va 1 persona", max > 1 ? el("div", { class: "inv-cupos" }, [menos, out, mas]) : null]);
        const nombres = el("input", { name: "nombres", maxlength: "300", placeholder: "Ej.: Ana, Pedro y Sofía" });
        const alergias = el("input", { name: "alergias", maxlength: "200", placeholder: "Ej.: maní, mariscos" });
        const cancion = el("input", { name: "cancion", maxlength: "120", placeholder: "La que no puede faltar" });
        const mensaje = el("textarea", { name: "mensaje", rows: "2", maxlength: "400", placeholder: "Unas palabras para los novios" });
        const extra = el("div", { style: "display:grid;gap:3.6cqw" }, [
          max > 1 ? el("label", {}, ["Nombres de quienes van (opcional)", nombres]) : null,
          d.preguntarAlergias !== false ? el("label", {}, ["Alergias o comida especial (opcional)", alergias]) : null,
          d.preguntarCancion ? el("label", {}, ["Una canción para la fiesta (opcional)", cancion]) : null,
        ]);
        if (previa) { nombres.value = previa.nombres || ""; }
        const enviar = el("button", { class: "inv-btn", type: "submit", text: previa ? "Actualizar mi respuesta" : (T.boton_rsvp || "Confirmar asistencia") });
        const f = el("form", { class: "inv-rsvp-form", novalidate: true }, [
          nombre ? el("label", {}, ["Su nombre", nombre]) : null,
          el("div", { class: "inv-sino" }, [si, no]), cupos, extra, el("label", {}, ["Mensaje (opcional)", mensaje]), err, enviar]);
        sync();
        f.addEventListener("submit", async e => {
          e.preventDefault(); err.textContent = "";
          if (nombre && !nombre.value.trim()) { err.textContent = "Escriban su nombre."; nombre.focus(); return; }
          if (o.vista || !o.api) { err.textContent = "Así confirmarán sus invitados. En la vista previa no se guarda."; return; }
          enviar.disabled = true; enviar.textContent = "Enviando…";
          try {
            const body = { s: o.slug, g: o.invitado ? o.invitado.id : undefined, asiste, personas: asiste ? personas : 0, nombre: nombre ? nombre.value : undefined,
              nombres: nombres.value, alergias: alergias.value, mensaje: [mensaje.value, cancion.value ? `Canción: ${cancion.value}` : ""].filter(Boolean).join(" · ") };
            const r = await fetch(o.api + "/love/api/rsvp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
            const j = await r.json().catch(() => ({}));
            if (!r.ok || !j.ok) throw new Error(j.mensaje || "No se pudo guardar. Intenten de nuevo.");
            if (o.invitado) o.invitado.rsvp = { asiste: asiste ? 1 : 0, personas: asiste ? personas : 0, nombres: nombres.value };
            mostrarOk(j.mensaje, asiste);
          } catch (x) { err.textContent = x.message; enviar.disabled = false; enviar.textContent = T.boton_rsvp || "Confirmar asistencia"; }
        });
        return f;
      }
      function mostrarOk(msg, asiste) {
        caja.querySelectorAll(".inv-rsvp-form, .inv-ok").forEach(x => x.remove());
        caja.append(el("div", { class: "inv-ok" }, [el("b", { class: "t-titulo", text: asiste ? "¡Gracias!" : "Gracias por avisar" }), msg || "",
          el("div", { class: "inv-acc" }, [el("button", { class: "inv-mini", type: "button", text: "Cambiar mi respuesta", onclick: () => { caja.querySelector(".inv-ok").remove(); caja.append(formulario()); } })])]));
      }
      if (previa) mostrarOk(previa.asiste ? `Confirmaron ${previa.personas} ${previa.personas === 1 ? "persona" : "personas"}.` : "Nos dijeron que no podrán ir.", !!previa.asiste);
      else caja.append(formulario());
      return caja;
    }

    const orden = (D.secciones && D.secciones.length ? D.secciones : ["cuenta", "programa", "fotos", "lugar", "rsvp"]);
    orden.forEach((k, i) => {
      const b = bloques[k] && bloques[k]();
      if (b) body.append(b);
      if (k === "lugar" && i < orden.length - 2) body.append(ornament());
    });
    if (d.transmision) body.append(sec("s-live", "", [el("div", { class: "inv-acc" }, [el("a", { class: "inv-mini", href: d.transmision, target: "_blank", rel: "noopener", text: "Ver la transmisión en vivo" })])]));
    body.append(el("div", { class: "inv-end" }, [ornament("end"), el("p", { class: "inv-texto rv", style: "font-size:4.6cqw;color:var(--ink);text-align:center;margin:0 auto 3cqw;font-style:italic", text: T.cierre || "" }),
      el("p", { style: tituloCSS, text: initials(n1, n2) }), d.hashtag ? el("p", { class: "inv-tag", text: d.hashtag.startsWith("#") ? d.hashtag : "#" + d.hashtag }) : null]));
    inv.append(hero, body);
    if (d.musica || d.musicaEnlace) {
      const href = d.musicaEnlace || `https://open.spotify.com/search/${encodeURIComponent(d.musica)}`;
      hero.append(el("a", { class: "inv-mini inv-musica", style: `color:${portada ? "#fff" : m.heroInk};border-color:currentColor`, href, target: "_blank", rel: "noopener", "aria-label": `Escuchar nuestra canción${d.musica ? ": " + d.musica : ""}`, text: "♪ Nuestra canción" }));
    }

    // Aparición suave al bajar
    const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { x.target.classList.add("in"); io.unobserve(x.target); } }), { root: inv, threshold: .12 });
    inv.querySelectorAll(".rv").forEach(x => io.observe(x));
    limpiezas.push(() => io.disconnect());

    // ---------- El sobre: apertura cinematográfica ----------
    // Si el modelo tiene video de apertura (apertura.mp4), el sobre se abre de verdad;
    // si no carga, se usa el fundido entre fotos como respaldo.
    const glow = el("div", { class: "env-glow" });
    const closed = el("img", { class: "env-closed", src: asset(m, "sobre"), alt: "" });
    const opened = el("img", { class: "env-open", src: asset(m, "abierto"), alt: "" });
    const conVideo = m.video !== false && !reduced && !o.abierta && Boolean(window.LOVE && window.LOVE.api);
    const video = conVideo ? el("video", { class: "env-video", muted: "", playsinline: "", "webkit-playsinline": "", preload: "auto", poster: asset(m, "sobre"), "aria-hidden": "true" }) : null;
    const apiVideos = (window.LOVE && window.LOVE.api) || "";
    if (video && apiVideos) { video.muted = true; video.src = `${apiVideos}/love/v/${m.id}.mp4`; video.load(); }
    let videoListo = false;
    if (video) { video.addEventListener("canplaythrough", () => { videoListo = true; }, { once: true }); video.addEventListener("error", () => { videoListo = false; video.remove(); }, { once: true }); }
    const flash = el("div", { class: "env-flash" });
    const vign = el("div", { class: "env-vignette" });
    const card = el("div", { class: "env-card", style: `top:${m.cardY * 100}%;color:${m.cardInk};${tituloCSS}` }, [el("span", { class: "c-names", text: `${n1} & ${n2}` }), el("span", { class: "c-date", text: shortDate(fecha) })]);
    const hint = el("p", { class: "env-hint", text: "Toca el sobre para abrir" });
    const para = o.invitado ? el("p", { class: "env-para" }, ["Para", el("b", { text: o.invitado.nombre })]) : null;
    const cam = el("div", { class: "env-cam" }, [closed, opened, video, glow, card]);
    const stage = el("div", { class: "inv-env", role: "button", tabindex: "0", "aria-label": `Abrir la invitación${o.invitado ? " de " + o.invitado.nombre : ""}` }, [cam, vign, flash, para, hint]);
    // Respiración del sobre mientras espera (anticipación)
    const respira = reduced ? null : cam.animate([{ transform: "scale(1)" }, { transform: "scale(1.035)" }], { duration: 5200, iterations: Infinity, direction: "alternate", easing: "ease-in-out" });
    let abierto = false, actualCam = "none";
    function abrir() {
      if (abierto) return; abierto = true;
      if (reduced) { stage.classList.add("done"); hero.style.opacity = "1"; if (o.alAbrir) o.alAbrir(); return; }
      actualCam = respira ? getComputedStyle(cam).transform : "none";
      if (respira) { respira.commitStyles && respira.commitStyles(); respira.cancel(); }
      const opt = (delay, duration, extra = {}) => ({ delay, duration, easing: EASE, fill: "forwards", ...extra });
      hint.animate([{ opacity: 1 }, { opacity: 0 }], opt(0, 350));
      // Conexión lenta: se espera un momento al video antes de usar el respaldo
      if (video && video.isConnected && video.readyState < 3) {
        let listo = false;
        const seguir = () => { if (listo) return; listo = true; secuencia(); };
        video.addEventListener("canplay", seguir, { once: true });
        setTimeout(seguir, 1200);
        return;
      }
      secuencia();
    }
    function secuencia() {
      const opt = (delay, duration, extra = {}) => ({ delay, duration, easing: EASE, fill: "forwards", ...extra });
      if (para) para.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-4cqw)", filter: "blur(3px)" }], opt(0, 700));
      // Fase 1 · el sobre se abre (video real o fundido de respaldo). A = cuánto dura.
      const usarVideo = video && video.isConnected && (videoListo || video.readyState >= 3);
      const A = usarVideo ? Math.max(2600, (video.duration || 4) * 1000 / 0.92) : 1600;
      if (usarVideo) {
        video.playbackRate = 0.92;
        video.style.opacity = "1";
        const p = video.play(); if (p && p.catch) p.catch(() => {});
      } else {
        glow.animate([{ opacity: 0, transform: "scale(.4)" }, { opacity: .95, transform: "scale(1)", offset: .4 }, { opacity: 0, transform: "scale(2.2)" }], opt(0, A * .9));
        opened.animate([{ opacity: 0 }, { opacity: 1 }], { delay: A * .15, duration: A * .7, easing: "ease-in-out", fill: "forwards" });
      }
      // Una sola cámara que avanza sin detenerse: empuje lento durante la apertura,
      // y al final se zambulle en la tarjeta (origen en la tarjeta) hasta la portada.
      cam.style.transformOrigin = `50% ${m.cardY * 100}%`;
      const T = A + 1500;
      cam.animate([
        { transform: actualCam === "none" ? "scale(1)" : actualCam, filter: "brightness(1)" },
        { transform: "scale(1.12)", filter: "brightness(1.02)", offset: A / T * .98, easing: "cubic-bezier(.55,0,.75,.2)" },
        { transform: "scale(3.2)", filter: "brightness(1.6) blur(2px)" }
      ], { duration: T, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards" });
      vign.animate([{ opacity: 0 }, { opacity: .85, offset: .55 }, { opacity: 0 }], opt(0, T));
      // Los nombres aparecen escritos en la tarjeta cuando ya salió del sobre
      card.animate([{ opacity: 0, transform: "translate(-50%, -44%)", filter: "blur(6px)", letterSpacing: ".08em" }, { opacity: 1, transform: "translate(-50%, -50%)", filter: "blur(0)", letterSpacing: "0em" }], opt(A * .78, 900));
      // Destello cálido que funde el sobre con la portada
      flash.animate([{ opacity: 0 }, { opacity: .9, offset: .55 }, { opacity: 0 }], { delay: A + 500, duration: 1500, easing: "ease-in-out", fill: "forwards" });
      stage.animate([{ opacity: 1 }, { opacity: 0 }], { delay: A + 900, duration: 700, easing: "ease-out", fill: "forwards" });
      hero.animate([{ opacity: 0, transform: "scale(1.14)" }, { opacity: 1, transform: "scale(1)" }], { delay: A + 800, duration: 2200, easing: EASE, fill: "forwards" });
      setTimeout(() => { const parar = particulas(screen, D.animacion && D.animacion.particulas, P.acento); limpiezas.push(parar); }, A + 700);
      setTimeout(() => { stage.classList.add("done"); if (video) { video.pause(); video.removeAttribute("src"); video.load(); } inv.focus && inv.focus({ preventScroll: true }); if (o.alAbrir) o.alAbrir(); }, A + 1700);
    }
    stage.addEventListener("click", abrir);
    stage.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); } });
    hero.style.opacity = "0";
    screen.append(inv, stage);
    if (o.autoAbrir) setTimeout(abrir, reduced ? 0 : 1000);
    if (o.abierta) { abierto = true; stage.classList.add("done"); hero.style.opacity = "1"; }
    timers.set(screen, () => limpiezas.forEach(f => f()));
    return { abrir, destruir: () => { limpiezas.forEach(f => f()); screen.textContent = ""; } };
  }

  window.Motor = { construir, modelById, shortDate, longDate, hora12, disenoInicial, asset };
})();
