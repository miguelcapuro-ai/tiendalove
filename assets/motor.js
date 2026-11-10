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
  const PAISES = { "America/Panama": "Panamá", "America/Mexico_City": "México", "America/Cancun": "México", "America/Tijuana": "México", "Europe/Madrid": "España", "Atlantic/Canary": "España",
    "America/New_York": "USA", "America/Chicago": "USA", "America/Denver": "USA", "America/Los_Angeles": "USA", "America/Puerto_Rico": "Puerto Rico", "America/Santo_Domingo": "R. Dominicana",
    "America/Costa_Rica": "Costa Rica", "America/Guatemala": "Centroamérica", "America/Bogota": "Colombia", "America/Lima": "Perú" };
  const paisDeZona = z => PAISES[z || "America/Panama"] || "";
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
  const initials = (a, b) => (b === "" ? (a || "A")[0] : (a || "A")[0] + "&" + (b || "B")[0]).toUpperCase();
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
  const asset = (m, kind, thumb) => m.arte && m.arte[kind] ? `${(window.LOVE && window.LOVE.api) || ""}${m.arte[kind]}`
    : m.remoto && window.LOVE && window.LOVE.api
    ? `${window.LOVE.api}/love/m/${m.id}/${thumb ? "thumb-" : ""}${kind}.webp${m.v ? `?v=${m.v}` : ""}`
    : `${window.LOVE_BASE || ""}assets/modelos/${m.id}/${thumb ? "thumb-" : ""}${kind}.webp`;

  // Ficha mínima cuando todavía no hay diseño de Claude (catálogo y vista previa de la tienda).
  function disenoInicial(m) {
    const f = s => s.replace(/'/g, "").split(",")[0].trim();
    return { modelo: m.id, paleta: { papel: m.paper, tinta: m.ink, acento: m.accent, suave: "" }, tipografia: { titulo: f(m.title), cuerpo: f(m.body) },
      textos: { encabezado: m.layout === "galeria" ? "Nos casamos" : "Nuestra boda", intro: "Nos casamos y queremos que estén ahí, cerca de nosotros.",
        titulo_cuenta: "Falta poco", titulo_programa: "El programa", titulo_lugar: "Dónde", titulo_rsvp: "¿Nos acompañan?",
        mensaje_rsvp: "Confirmen su asistencia para guardarles su lugar.", boton_rsvp: "Confirmar asistencia", cierre: "Los esperamos. Va a ser una fiesta de las que se cuentan." },
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

  // ---------- Pareja en el escenario (modelos con «baile») ----------
  // El arte trae el escenario vacío; la pareja recortada (foto.webp, fondo transparente) va encima, en el mismo
  // lugar que ocupaba en el arte de 720×1280, con su reflejo en el piso. Queda quieta, como una foto de teatro:
  // el movimiento lo ponen la cámara, el foco y el humo. Devuelve la capa para animar la profundidad.
  function bailarines(cont, m) {
    const b = m.baile; if (!b) return { caja: null, quitar: () => {} };
    const src = asset(m, "foto");
    const par = el("img", { class: "tl-par", src, alt: "", draggable: false });
    const reflejo = el("img", { class: "tl-reflejo", src, alt: "", draggable: false });
    const giro = el("div", { class: "tl-giro" }, [reflejo, par]);
    const caja = el("div", { class: "tl-baile", "aria-hidden": "true" }, [giro]);
    const humo = el("div", { class: "tl-humo", "aria-hidden": "true" });
    caja.style.transformOrigin = `50% ${b.pie * 100}%`;
    reflejo.style.transformOrigin = `50% ${b.pie * 100}%`;
    const ancla = cont.querySelector(":scope > .inv-hero-bg, :scope > .env-open");
    ancla ? ancla.after(humo, caja) : cont.append(humo, caja);
    const ubicar = () => {
      const W = cont.clientWidth, H = cont.clientHeight; if (!W || !H) return;
      const k = Math.max(W / 720, H / 1280), ox = (W - 720 * k) / 2, oy = (H - 1280 * k) / 2;
      Object.assign(caja.style, { left: ox + b.x * 720 * k + "px", top: oy + b.y * 1280 * k + "px", width: b.w * 720 * k + "px", height: b.h * 1280 * k + "px" });
    };
    ubicar();
    const ro = window.ResizeObserver ? new ResizeObserver(ubicar) : null; ro && ro.observe(cont);
    return { caja, quitar: () => { ro && ro.disconnect(); caja.remove(); humo.remove(); } };
  }

  // ---------- Aperturas interactivas (modelos con «apertura») ----------
  // El invitado hace una o más acciones sencillas para abrir su invitación. Cada juego recibe el
  // escenario (sobre, imágenes, nombres) y llama a fin() al terminar; el motor sigue con la portada.
  // Siempre hay «Saltar» y el teclado (Enter) avanza un paso, para que nadie se quede atascado.

  // Punto (fracciones 0–1 del arte de 720×1280) a píxeles del escenario, con object-fit: cover.
  function puntoArte(stage, fx, fy) {
    const W = stage.clientWidth, H = stage.clientHeight, k = Math.max(W / 720, H / 1280);
    return { x: W / 2 + (fx - .5) * 720 * k, y: H / 2 + (fy - .5) * 1280 * k, k };
  }
  const vibrar = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
  const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
  // Anima y deja el estado final escrito en el estilo (así los arrastres posteriores no quedan tapados).
  const fijar = (n, kf, op) => { const a = n.animate(kf, { fill: "forwards", ...op }); a.onfinish = () => { try { a.commitStyles(); } catch (e) {} a.cancel(); }; return a; };

  // Kit común: capa, indicador de pasos, chispas, temblor y «Saltar».
  function kit(x, total) {
    const capa = el("div", { class: "ix" });
    const pasos = el("div", { class: "ix-pasos", "aria-hidden": "true" }, Array.from({ length: total }, () => el("i")));
    const saltar = el("button", { class: "ix-saltar", type: "button", text: "Saltar ›", "aria-label": "Saltar y abrir la invitación" });
    capa.append(pasos, saltar);
    x.stage.append(capa);
    x.stage.style.touchAction = "none"; x.stage.classList.add("ix-on");
    x.stage.querySelectorAll("img").forEach(i => (i.draggable = false));
    const timers = [];
    const luego = (f, ms) => { const t = setTimeout(f, ms); timers.push(t); return t; };
    const k = {
      capa, luego,
      paso(i, texto) {
        [...pasos.children].forEach((d, j) => d.className = j < i ? "ok" : j === i ? "on" : "");
        x.hint.textContent = texto; x.hint.animate([{ opacity: 0, transform: "translateY(2cqw)" }, { opacity: 1, transform: "none" }], { duration: 450, easing: EASE });
      },
      chispas(px, py, colores, n = 18, fuerza = 1) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * 6.283, d = (30 + Math.random() * 90) * fuerza, s = 4 + Math.random() * 7;
          const c = el("span", { class: "ix-chispa", style: `left:${px}px;top:${py}px;width:${s}px;height:${s}px;background:${colores[i % colores.length]};border-radius:${Math.random() < .5 ? "50%" : "2px"}` });
          capa.append(c);
          c.animate([{ transform: "translate(-50%,-50%) scale(1)", opacity: 1 }, { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + 40 * fuerza}px)) rotate(${Math.random() * 540}deg) scale(.3)`, opacity: 0 }],
            { duration: 700 + Math.random() * 700, easing: "cubic-bezier(.15,.7,.3,1)", fill: "forwards" }).onfinish = () => c.remove();
        }
      },
      temblor(fuerza = 1) {
        const f = 1.4 * fuerza;
        x.stage.animate([{ transform: "none" }, { transform: `translate(${-f}cqw,${f * .4}cqw) rotate(${-f * .4}deg)` }, { transform: `translate(${f}cqw,${-f * .4}cqw) rotate(${f * .4}deg)` },
          { transform: `translate(${-f * .5}cqw,0)` }, { transform: "none" }], { duration: 320, easing: "ease-out" });
      },
      destello(px, py, color = "#fff", tam = 60) {
        const d = el("span", { class: "ix-destello", style: `left:${px}px;top:${py}px;width:${tam}cqw;height:${tam}cqw;background:radial-gradient(circle, ${color} 0%, ${color}00 65%)` });
        capa.append(d);
        d.animate([{ opacity: 0, transform: "translate(-50%,-50%) scale(.3)" }, { opacity: 1, offset: .25 }, { opacity: 0, transform: "translate(-50%,-50%) scale(1.6)" }], { duration: 900, easing: "ease-out", fill: "forwards" }).onfinish = () => d.remove();
      },
      cerrar(op) {
        timers.forEach(clearTimeout);
        x.hint.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" });
        pasos.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" });
        saltar.remove();
        x.fin(op);
      },
      parar() { timers.forEach(clearTimeout); ro && ro.disconnect(); },
    };
    const ro = window.ResizeObserver ? new ResizeObserver(() => k.ubicar && k.ubicar()) : null;
    ro && ro.observe(x.stage);
    saltar.addEventListener("click", e => { e.stopPropagation(); k.saltar && k.saltar(); });
    return k;
  }

  // Arrastre vertical u horizontal con progreso 0–1 (ratón, dedo o lápiz).
  function arrastre(zona, eje, distancia, alMover, alSoltar) {
    let ini = null;
    const abajo = e => { if (e.pointerType === "mouse") e.preventDefault(); ini = { x: e.clientX, y: e.clientY }; try { zona.setPointerCapture(e.pointerId); } catch (_) {} };
    const mueve = e => { if (!ini) return; const d = eje === "y" ? ini.y - e.clientY : Math.abs(e.clientX - ini.x); alMover(limitar(d / distancia(), 0, 1), e); };
    const suelta = e => { if (!ini) return; const d = eje === "y" ? ini.y - e.clientY : Math.abs(e.clientX - ini.x); ini = null; alSoltar(limitar(d / distancia(), 0, 1), e); };
    zona.addEventListener("pointerdown", abajo); zona.addEventListener("pointermove", mueve);
    zona.addEventListener("pointerup", suelta); zona.addEventListener("pointercancel", suelta);
    return () => { zona.removeEventListener("pointerdown", abajo); zona.removeEventListener("pointermove", mueve); zona.removeEventListener("pointerup", suelta); zona.removeEventListener("pointercancel", suelta); };
  }

  // Grietas dibujadas en SVG; se revelan por grupos (un grupo por golpe).
  function grietas(grupos, color) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg"); svg.setAttribute("viewBox", "-50 -50 100 100"); svg.setAttribute("class", "ix-grietas");
    const gs = grupos.map(lineas => {
      const g = document.createElementNS(ns, "g"); g.style.opacity = "0";
      lineas.forEach(d => { const p = document.createElementNS(ns, "path"); p.setAttribute("d", d); p.setAttribute("stroke", color); p.setAttribute("fill", "none"); p.setAttribute("stroke-width", "2.4"); p.setAttribute("stroke-linecap", "round"); g.append(p); });
      svg.append(g); return g;
    });
    return { svg, mostrar: i => { if (gs[i]) gs[i].animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: "forwards" }); } };
  }
  const GRIETAS = [
    ["M0 0 L-9 -12 L-14 -15", "M0 0 L10 -6 L18 -4"],
    ["M0 0 L-4 13 L-10 20", "M0 0 L13 9 L16 18", "M-9 -12 L-20 -8"],
    ["M0 0 L-16 2 L-24 9", "M0 0 L4 -16 L9 -24", "M10 -6 L22 -14", "M-4 13 L4 22"],
  ];
  const ORO = ["#ffe6a0", "#f3c757", "#fff6d6", "#e0a83a"];
  const CONFETI = ["#3fe0f5", "#ff4fd8", "#ffd23f", "#8a5bff", "#ffffff", "#5cff9d"];

  const INTERACCIONES = {
    // 1) Cofre: romper el candado a toques y deslizar hacia arriba para abrir.
    cofre: {
      invita: "Toca el candado 3 veces para romperlo",
      jugar(x) {
        const k = kit(x, 2);
        let golpes = 0, fase = 0, quitarArrastre = null, toquesSinDeslizar = 0;
        const p = () => x.punto(.5, .49);
        const hot = el("button", { class: "ix-hot", type: "button", "aria-label": "Golpear el candado" });
        const g = grietas(GRIETAS, "#fff4cf");
        hot.append(g.svg);
        const ubicar = () => { const q = p(); hot.style.left = q.x + "px"; hot.style.top = q.y + "px"; };
        k.ubicar = ubicar; ubicar(); k.capa.append(hot);
        const flecha = el("div", { class: "ix-flecha", "aria-hidden": "true" }, [el("i"), el("i"), el("i")]);
        k.paso(0, "Toca el candado 3 veces para romperlo");
        function golpe() {
          if (fase !== 0) return;
          golpes++; vibrar(golpes < 3 ? 25 : [40, 30, 80]);
          const q = p(); g.mostrar(golpes - 1); k.temblor(golpes * .5); k.chispas(q.x, q.y, ORO, 10 + golpes * 6, .7 + golpes * .2);
          hot.animate([{ transform: "translate(-50%,-50%) scale(1)" }, { transform: "translate(-50%,-50%) scale(.86)" }, { transform: "translate(-50%,-50%) scale(1)" }], { duration: 220 });
          x.closed.animate([{ filter: "brightness(1)" }, { filter: `brightness(${1.15 + golpes * .1})` }, { filter: "brightness(1)" }], { duration: 350 });
          if (golpes >= 3) romper();
        }
        function romper() {
          fase = 1; const q = p();
          k.destello(q.x, q.y, "#ffe9a8", 70); k.chispas(q.x, q.y, ORO, 40, 1.6);
          hot.animate([{ opacity: 1, transform: "translate(-50%,-50%) scale(1)" }, { opacity: 0, transform: "translate(-50%,-30%) scale(1.3) rotate(18deg)" }], { duration: 600, easing: "ease-in", fill: "forwards" }).onfinish = () => hot.remove();
          k.luego(() => { k.paso(1, "Ahora desliza hacia arriba para abrir el cofre"); k.capa.append(flecha); quitarArrastre = arrastre(x.stage, "y", () => x.stage.clientHeight * .22, mover, soltar); }, 650);
        }
        function mover(t) {
          x.opened.style.opacity = String(t * .75);
          x.glow.style.opacity = String(t); x.glow.style.transform = `scale(${.4 + t * .8})`;
          flecha.style.opacity = String(1 - t);
        }
        function soltar(t) {
          if (fase !== 1) return;
          if (t >= .6) return abrirCofre();
          if (t < .05 && ++toquesSinDeslizar >= 2) return abrirCofre(); // quien solo toca, también entra
          fijar(x.opened, [{ opacity: x.opened.style.opacity || 0 }, { opacity: 0 }], { duration: 300 });
          x.glow.style.opacity = "0"; flecha.style.opacity = "1";
        }
        function abrirCofre() {
          fase = 2; quitarArrastre && quitarArrastre(); flecha.remove(); vibrar([30, 40, 90]);
          const q = p(); k.destello(q.x, q.y - 80, "#fff1c4", 110); k.chispas(q.x, q.y - 40, ORO, 50, 2);
          x.opened.getAnimations().forEach(a => a.cancel());
          fijar(x.opened, [{ opacity: x.opened.style.opacity || 0 }, { opacity: 1 }], { duration: 500 });
          x.glow.animate([{ opacity: 1, transform: "scale(1.2)" }, { opacity: 0, transform: "scale(2.4)" }], { duration: 1000, fill: "forwards" });
          k.luego(() => k.cerrar({ yaAbierto: true }), 500);
        }
        hot.addEventListener("click", e => { e.stopPropagation(); golpe(); });
        k.saltar = () => { fase = 2; quitarArrastre && quitarArrastre(); k.cerrar({ yaAbierto: false }); };
        return { avanzar: () => (fase === 0 ? golpe() : fase === 1 ? abrirCofre() : null), parar: () => { k.parar(); quitarArrastre && quitarArrastre(); } };
      },
    },

    // 2) Caja: tres toques; cada uno la hace saltar y agrieta el cristal. Al tercero, explota en confeti.
    caja: {
      invita: "Toca la caja 3 veces",
      jugar(x) {
        const k = kit(x, 1);
        let golpes = 0, listo = false;
        const p = () => x.punto(.5, .43);
        const hot = el("button", { class: "ix-hot ix-hot-caja", type: "button", "aria-label": "Tocar la caja" });
        const g = grietas(GRIETAS, "#e9fbff");
        hot.append(g.svg);
        const combo = el("b", { class: "ix-combo", "aria-hidden": "true" });
        const ubicar = () => { const q = p(); hot.style.left = q.x + "px"; hot.style.top = q.y + "px"; combo.style.left = q.x + "px"; combo.style.top = (q.y - q.k * 330) + "px"; };
        k.ubicar = ubicar; ubicar(); k.capa.append(hot, combo);
        k.paso(0, "Toca la caja 3 veces");
        function golpe() {
          if (listo) return;
          golpes++; vibrar(golpes < 3 ? 30 : [50, 30, 120]);
          const q = p(); g.mostrar(golpes - 1); k.chispas(q.x, q.y, CONFETI, 12 + golpes * 8, .8 + golpes * .3); k.temblor(golpes * .6);
          x.cam.animate([{ transform: "translateY(0) scale(1,1)" }, { transform: "translateY(1.5%) scale(1.06,.92)", offset: .2 }, { transform: "translateY(-6%) scale(.96,1.06)", offset: .55 }, { transform: "translateY(0) scale(1,1)" }],
            { duration: 520, easing: "cubic-bezier(.3,1.4,.5,1)", composite: "add" });
          x.closed.animate([{ filter: "brightness(1) hue-rotate(0deg)" }, { filter: `brightness(${1.2 + golpes * .15}) hue-rotate(${golpes * 25}deg)` }, { filter: "brightness(1)" }], { duration: 500 });
          combo.textContent = golpes < 3 ? `×${golpes}` : "¡BOOM!";
          combo.animate([{ opacity: 0, transform: "translate(-50%,0) scale(.4)" }, { opacity: 1, transform: "translate(-50%,-30%) scale(1.15)", offset: .35 }, { opacity: 0, transform: "translate(-50%,-90%) scale(1)" }], { duration: 900, easing: "ease-out", fill: "forwards" });
          if (golpes < 3) k.paso(0, golpes === 1 ? "¡Otra vez! Faltan 2" : "¡Una más!");
          else explotar();
        }
        function explotar() {
          listo = true; const q = p(); hot.remove();
          k.destello(q.x, q.y, "#ffffff", 140);
          k.chispas(q.x, q.y, CONFETI, 70, 2.6); k.luego(() => k.chispas(q.x, q.y - 30, CONFETI, 40, 2), 180);
          fijar(x.opened, [{ opacity: 0 }, { opacity: 1 }], { duration: 350 });
          k.luego(() => k.cerrar({ yaAbierto: true }), 650);
        }
        hot.addEventListener("click", e => { e.stopPropagation(); golpe(); });
        k.saltar = () => { listo = true; k.cerrar({ yaAbierto: false }); };
        return { avanzar: golpe, parar: k.parar };
      },
    },

    // 3) Cartas: rasgar el sobre con el dedo y voltear tres cartas; la última es la de los novios (holográfica).
    cartas: {
      invita: "Desliza el dedo por la línea para rasgar el sobre",
      jugar(x) {
        const k = kit(x, 3);
        let fase = 0, quitar = null, actual = 0;
        // El sobre ocupa de 19% a 78% del ancho del arte; la línea para rasgar va arriba (21%).
        const A = () => x.punto(.19, .215), B = () => x.punto(.78, .215);
        const linea = el("div", { class: "ix-linea", "aria-hidden": "true" }, [el("span")]);
        const ubicar = () => { const a = A(), b = B(); Object.assign(linea.style, { left: a.x + "px", top: a.y + "px", width: (b.x - a.x) + "px" }); };
        k.ubicar = ubicar; ubicar(); k.capa.append(linea);
        const relleno = linea.firstChild;
        k.paso(0, "Desliza el dedo por la línea para rasgar el sobre");
        quitar = arrastre(x.stage, "x", () => B().x - A().x, (t, e) => {
          relleno.style.width = t * 100 + "%";
          if (Math.random() < .35) { const r = x.stage.getBoundingClientRect(); k.chispas(e.clientX - r.left, A().y, ["#fff", "#ffd1f2", "#c9f3ff", "#e7d1ff"], 3, .4); }
        }, t => { if (fase === 0) { if (t >= .7) rasgar(); else fijar(relleno, [{ width: relleno.style.width }, { width: "0%" }], { duration: 250 }); } });
        // Las tres cartas
        const fecha = longDate(x.fecha);
        const caras = [
          [el("small", { text: "Carta 1 · Guarden la fecha" }), el("b", { style: x.tituloCSS, text: shortDate(x.fecha) }), el("span", { text: fecha })],
          [el("small", { text: "Carta 2 · El lugar" }), el("b", { style: x.tituloCSS, text: x.lugar }), el("span", { text: "Los esperamos" })],
          [el("div", { class: "ix-holo-foto", style: `background-image:url("${x.foto}")` }), el("b", { style: x.tituloCSS, text: x.n2 ? `${x.n1} & ${x.n2}` : x.n1 }), el("small", { text: "Edición única · 1 de 1" })],
        ];
        const cartas = caras.map((cara, i) => el("div", { class: "ix-carta" + (i === 2 ? " holo" : ""), style: `--i:${i}` }, [
          el("div", { class: "ix-carta-in" }, [el("div", { class: "ix-dorso" }, [el("span", { text: "♥" })]), el("div", { class: "ix-cara" }, cara)])]));
        function rasgar() {
          fase = 1; quitar && quitar(); vibrar([20, 20, 60]);
          const a = A(), b = B();
          // El trozo de arriba del sobre sale volando
          const W = x.stage.clientWidth, H = x.stage.clientHeight, q0 = x.punto(.19, .17), q1 = x.punto(.78, .235);
          const trozo = x.closed.cloneNode(); trozo.className = "ix-trozo"; trozo.draggable = false;
          trozo.style.clipPath = `inset(${q0.y / H * 100}% ${100 - q1.x / W * 100}% ${100 - q1.y / H * 100}% ${q0.x / W * 100}%)`;
          k.capa.prepend(trozo);
          trozo.animate([{ transform: "none", opacity: 1 }, { transform: "translate(18%,-22%) rotate(16deg)", opacity: 0 }], { duration: 900, easing: "cubic-bezier(.3,.6,.4,1)", fill: "forwards" }).onfinish = () => trozo.remove();
          linea.remove();
          k.destello((a.x + b.x) / 2, a.y, "#ffffff", 90); k.chispas((a.x + b.x) / 2, a.y, ["#fff", "#ffd1f2", "#c9f3ff", "#e7d1ff", "#fff3b0"], 40, 1.6);
          fijar(x.opened, [{ opacity: 0 }, { opacity: 1 }], { duration: 600 });
          // Salen las cartas del sobre
          // El mazo tapa justo la carta en blanco que sale del sobre en el arte (x 30–70 %, y 7–40 %).
          const mazo = el("div", { class: "ix-mazo" }, cartas);
          const ubicarMazo = () => { const c0 = x.punto(.5, .235), c1 = x.punto(.7, .235); Object.assign(mazo.style, { left: c0.x + "px", top: c0.y + "px", width: (c1.x - c0.x) * 2 + "px" }); };
          ubicarMazo(); k.ubicar = ubicarMazo;
          k.capa.append(mazo);
          cartas.forEach((c, i) => c.animate([{ transform: "translateY(60%) scale(.5)", opacity: 0 }, { transform: "none", opacity: 1 }], { delay: 450 + i * 120, duration: 700, easing: EASE, fill: "backwards" }));
          cartas.forEach(c => c.addEventListener("click", e => { e.stopPropagation(); voltear(); }));
          k.luego(() => { fase = 2; k.paso(1, "Toca la carta para voltearla · 1 de 3"); }, 900);
        }
        function voltear() {
          if (fase !== 2) return;
          if (actual >= cartas.length) return entrar();
          if (actual > 0) {
            // Aparta la carta ya vista y sigue con la siguiente
            const c = cartas[actual - 1]; c.classList.add("fuera");
            c.animate([{ transform: getComputedStyle(c).transform }, { transform: `translate(${actual % 2 ? "-" : ""}75%, 10%) rotate(${actual % 2 ? -14 : 14}deg) scale(.55)`, opacity: .0 }], { duration: 550, easing: EASE, fill: "forwards" });
          }
          const c = cartas[actual];
          c.classList.add("vista"); c.style.zIndex = 10 + actual; vibrar(20);
          const r = c.getBoundingClientRect(), s = x.stage.getBoundingClientRect();
          k.chispas(r.left - s.left + r.width / 2, r.top - s.top + r.height / 2, actual === 2 ? ["#fff", "#ffd1f2", "#c9f3ff", "#fff3b0", "#e7d1ff"] : ["#fff", "#e7d1ff"], actual === 2 ? 40 : 14, actual === 2 ? 1.8 : .8);
          actual++;
          if (actual === 3) { k.paso(2, "¡Su carta! Inclina el teléfono y tócala para entrar"); holo(c); }
          else k.paso(1, `Toca para ver la siguiente · ${actual + 1} de 3`);
        }
        function holo(c) {
          const brillo = e => {
            const r = c.getBoundingClientRect();
            const px = e.gamma != null ? limitar((e.gamma + 30) / 60, 0, 1) : limitar((e.clientX - r.left) / r.width, 0, 1);
            const py = e.beta != null ? limitar((e.beta - 20) / 50, 0, 1) : limitar((e.clientY - r.top) / r.height, 0, 1);
            c.style.setProperty("--hx", px * 100 + "%"); c.style.setProperty("--hy", py * 100 + "%");
            c.style.setProperty("--rx", ((py - .5) * -16) + "deg"); c.style.setProperty("--ry", ((px - .5) * 18) + "deg");
          };
          x.stage.addEventListener("pointermove", brillo);
          window.addEventListener("deviceorientation", brillo);
          k.limpiar = () => { x.stage.removeEventListener("pointermove", brillo); window.removeEventListener("deviceorientation", brillo); };
        }
        function entrar() {
          fase = 3; k.limpiar && k.limpiar(); vibrar([30, 30, 90]);
          const c = cartas[2];
          c.animate([{ transform: getComputedStyle(c).transform, opacity: 1 }, { transform: "translateY(-4%) scale(2.6)", opacity: 0 }], { duration: 900, easing: "cubic-bezier(.5,0,.7,.4)", fill: "forwards" });
          k.capa.querySelectorAll(".ix-carta").forEach(o => o !== c && o.animate([{ opacity: getComputedStyle(o).opacity }, { opacity: 0 }], { duration: 300, fill: "forwards" }));
          k.luego(() => k.cerrar({ yaAbierto: true, sinTarjeta: true }), 350);
        }
        k.saltar = () => { fase = 3; quitar && quitar(); k.limpiar && k.limpiar(); k.capa.querySelectorAll(".ix-mazo").forEach(n => n.remove()); k.cerrar({ yaAbierto: true, sinTarjeta: true }); };
        return { avanzar: () => (fase === 0 ? rasgar() : fase === 2 ? voltear() : null), parar: () => { k.parar(); quitar && quitar(); k.limpiar && k.limpiar(); } };
      },
    },

    // 4) El Ritual: mantener presionado el sello, deslizar la foto hacia arriba y raspar la fecha.
    ritual: {
      invita: "Mantén presionado el sello para romperlo",
      jugar(x) {
        const k = kit(x, 3);
        let fase = 0, carga = 0, presionando = false, raf = 0, quitar = null;
        const p = () => x.punto(.5, .5);
        const R = 15.9;
        const anillo = el("button", { class: "ix-anillo", type: "button", "aria-label": "Mantener presionado el sello" });
        anillo.innerHTML = `<svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="${R}" class="base"/><circle cx="18" cy="18" r="${R}" class="carga" stroke-dasharray="${2 * Math.PI * R}" stroke-dashoffset="${2 * Math.PI * R}"/></svg>`;
        const arco = anillo.querySelector(".carga");
        const ubicar = () => { const q = p(); anillo.style.left = q.x + "px"; anillo.style.top = q.y + "px"; };
        k.ubicar = ubicar; ubicar(); k.capa.append(anillo);
        k.paso(0, "Mantén presionado el sello para romperlo");
        const DUR = 1300;
        let t0 = 0;
        function bucle(t) {
          if (fase !== 0) return;
          const dt = t - (t0 || t); t0 = t;
          carga = limitar(carga + (presionando ? dt / DUR : -dt / 500), 0, 1);
          arco.setAttribute("stroke-dashoffset", String(2 * Math.PI * R * (1 - carga)));
          const f = carga * 1.1;
          x.cam.style.translate = presionando ? `${(Math.random() - .5) * f}cqw ${(Math.random() - .5) * f}cqw` : "";
          anillo.style.setProperty("--brillo", carga);
          if (presionando && Math.random() < carga * .5) { const q = p(); k.chispas(q.x, q.y, ["#c9a646", "#ffe6a0", "#b3202a"], 2, .5); }
          if (carga >= 1) return romper();
          raf = requestAnimationFrame(bucle);
        }
        const empezar = e => { e.preventDefault(); e.stopPropagation(); presionando = true; vibrar(15); };
        const soltar = () => { presionando = false; };
        anillo.addEventListener("pointerdown", empezar);
        ["pointerup", "pointerleave", "pointercancel"].forEach(ev => anillo.addEventListener(ev, soltar));
        anillo.addEventListener("contextmenu", e => e.preventDefault());
        raf = requestAnimationFrame(bucle);

        // La foto de los novios, lista para salir del sobre
        const foto = el("div", { class: "ix-foto" }, [el("div", { class: "ix-foto-img", style: `background-image:url("${x.foto}")` })]);
        const placa = el("div", { class: "ix-placa" }, [el("span", { class: "ix-placa-txt", style: x.tituloCSS, text: shortDate(x.fecha) }), el("small", { text: longDate(x.fecha) })]);
        const lienzo = el("canvas", { class: "ix-raspa", "aria-hidden": "true" });
        placa.append(lienzo);
        const nombres = el("p", { class: "ix-nombres", style: x.tituloCSS, text: x.n2 ? `${x.n1} & ${x.n2}` : x.n1 });
        const flecha = el("div", { class: "ix-flecha", "aria-hidden": "true" }, [el("i"), el("i"), el("i")]);

        function romper() {
          fase = 1; cancelAnimationFrame(raf); x.cam.style.translate = ""; vibrar([40, 30, 120]);
          const q = p(); k.destello(q.x, q.y, "#ffd9a0", 80); k.chispas(q.x, q.y, ["#b3202a", "#7d1219", "#c9a646", "#ffe6a0"], 46, 1.8); k.temblor(1.2);
          anillo.animate([{ opacity: 1 }, { opacity: 0, transform: "translate(-50%,-50%) scale(1.5)" }], { duration: 500, fill: "forwards" }).onfinish = () => anillo.remove();
          fijar(x.opened, [{ opacity: 0 }, { opacity: 1 }], { duration: 700 });
          k.luego(() => {
            // La foto aparece justo donde quedó la tarjeta dentro del sobre
            const c = x.punto(.5, .38);
            Object.assign(foto.style, { left: c.x + "px", top: c.y + "px", width: 360 * c.k + "px" });
            k.capa.append(foto, flecha);
            fijar(foto, [{ opacity: 0, transform: "translate(-50%,-50%) scale(.9)" }, { opacity: 1, transform: "translate(-50%,-50%) scale(1)" }], { duration: 600, easing: EASE });
            fase = 2; k.paso(1, "Desliza hacia arriba para sacar la foto");
            quitar = arrastre(x.stage, "y", () => x.stage.clientHeight * .2, t => {
              foto.style.transform = `translate(-50%, calc(-50% - ${t * 12}cqw)) scale(${1 + t * .25})`; flecha.style.opacity = String(1 - t);
            }, t => { if (t >= .5) elevar(); else { foto.style.transition = "transform .3s"; foto.style.transform = "translate(-50%,-50%)"; flecha.style.opacity = "1"; setTimeout(() => (foto.style.transition = ""), 320); } });
          }, 650);
        }
        function elevar() {
          if (fase !== 2) return;
          fase = 3; quitar && quitar(); flecha.remove(); vibrar(30);
          const H = x.stage.clientHeight;
          k.capa.classList.add("velo");
          foto.style.transition = ""; const top = parseFloat(foto.style.top);
          fijar(foto, [{ transform: getComputedStyle(foto).transform, top: top + "px" }, { transform: "translate(-50%,-50%) scale(1.15) rotate(-2deg)", top: H * .33 + "px" }], { duration: 900, easing: EASE });
          k.luego(() => {
            placa.style.top = H * .7 + "px"; k.capa.append(placa);
            placa.animate([{ opacity: 0, transform: "translate(-50%,20%)" }, { opacity: 1, transform: "translate(-50%,0)" }], { duration: 500, easing: EASE, fill: "forwards" });
            prepararRaspa(); fase = 4; k.paso(2, "Raspa con el dedo para descubrir la fecha");
          }, 800);
        }
        function prepararRaspa() {
          const r = placa.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
          lienzo.width = r.width * dpr; lienzo.height = r.height * dpr;
          const c = lienzo.getContext("2d"); c.scale(dpr, dpr);
          const g = c.createLinearGradient(0, 0, r.width, r.height);
          g.addColorStop(0, "#8c6a22"); g.addColorStop(.3, "#f3d27a"); g.addColorStop(.55, "#b8913a"); g.addColorStop(.8, "#f7e2a1"); g.addColorStop(1, "#9a7428");
          c.fillStyle = g; c.fillRect(0, 0, r.width, r.height);
          for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * .25})`; c.fillRect(Math.random() * r.width, Math.random() * r.height, 1.2, 1.2); }
          c.fillStyle = "rgba(60,40,10,.75)"; c.font = `600 ${r.height * .26}px 'Cormorant Garamond', serif`; c.textAlign = "center"; c.textBaseline = "middle";
          c.fillText("✦  Raspa aquí  ✦", r.width / 2, r.height / 2);
          c.globalCompositeOperation = "destination-out";
          let pinta = false, n = 0, ultimo = null;
          const raspar = e => {
            if (!pinta || fase !== 4) return;
            const b = lienzo.getBoundingClientRect(), px = e.clientX - b.left, py = e.clientY - b.top;
            c.lineWidth = b.height * .42; c.lineCap = "round";
            c.beginPath(); c.moveTo(ultimo ? ultimo.x : px, ultimo ? ultimo.y : py); c.lineTo(px, py); c.stroke(); ultimo = { x: px, y: py };
            if (Math.random() < .3) { const s = x.stage.getBoundingClientRect(); k.chispas(e.clientX - s.left, e.clientY - s.top, ["#f3d27a", "#fff1c4"], 2, .35); }
            if (++n % 8 === 0 && limpio() > .5) descubrir();
          };
          const limpio = () => {
            const d = c.getImageData(0, 0, lienzo.width, lienzo.height).data; let v = 0, t = 0;
            for (let i = 3; i < d.length; i += 64) { t++; if (d[i] < 40) v++; }
            return v / t;
          };
          lienzo.addEventListener("pointerdown", e => { e.stopPropagation(); pinta = true; ultimo = null; try { lienzo.setPointerCapture(e.pointerId); } catch (_) {} raspar(e); });
          lienzo.addEventListener("pointermove", raspar);
          ["pointerup", "pointercancel"].forEach(ev => lienzo.addEventListener(ev, () => { pinta = false; ultimo = null; }));
          lienzo.addEventListener("click", e => e.stopPropagation());
        }
        function descubrir() {
          if (fase !== 4) return;
          fase = 5; vibrar([30, 40, 100]);
          lienzo.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: "forwards" });
          const r = placa.getBoundingClientRect(), s = x.stage.getBoundingClientRect();
          k.chispas(r.left - s.left + r.width / 2, r.top - s.top + r.height / 2, ["#f3d27a", "#fff1c4", "#ffffff"], 36, 1.4);
          // Ahora sí: los nombres de los novios
          nombres.style.top = x.stage.clientHeight * .585 + "px"; k.capa.append(nombres);
          nombres.animate([{ opacity: 0, filter: "blur(8px)", letterSpacing: ".2em", transform: "translate(-50%,10%)" }, { opacity: 1, filter: "blur(0)", letterSpacing: "0", transform: "translate(-50%,0)" }], { delay: 300, duration: 1300, easing: EASE, fill: "forwards" });
          k.paso(3, "");
          k.luego(() => {
            [foto, placa, nombres].forEach(n2 => n2.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, delay: 300, fill: "forwards" }));
            foto.animate([{ transform: getComputedStyle(foto).transform }, { transform: "translate(-50%,-50%) scale(2.2)" }], { duration: 1000, easing: "cubic-bezier(.5,0,.7,.4)", fill: "forwards" });
            k.capa.classList.remove("velo");
            k.cerrar({ yaAbierto: true, sinTarjeta: true });
          }, 2600);
        }
        k.saltar = () => { fase = 9; cancelAnimationFrame(raf); quitar && quitar(); x.cam.style.translate = ""; [anillo, foto, placa, nombres, flecha].forEach(n2 => n2.remove()); k.capa.classList.remove("velo"); k.cerrar({ yaAbierto: true, sinTarjeta: true }); };
        return {
          avanzar: () => { if (fase === 0) { carga = 1; presionando = true; } else if (fase === 2) elevar(); else if (fase === 4) descubrir(); },
          parar: () => { k.parar(); cancelAnimationFrame(raf); quitar && quitar(); },
        };
      },
    },

    // 5) Gran Estreno: un telón de terciopelo con brillo. El invitado toca (o separa con el dedo) y el telón
    //    se recoge hacia los lados; se encienden las luces del escenario y los nombres aparecen escritos.
    telon: {
      invita: "Toca el telón para abrirlo",
      jugar(x) {
        const k = kit(x, 1);
        let fase = 0, quitar = null;
        // El sobre cerrado se parte en dos mitades de telón que se recogen hacia los lados.
        const mitad = lado => {
          const img = el("img", { class: "tl-img", src: x.closed.src, alt: "", draggable: false });
          return el("div", { class: `tl-mitad tl-${lado}` }, [el("div", { class: "tl-tela" }, [img])]);
        };
        const izq = mitad("izq"), der = mitad("der");
        const luz = el("div", { class: "tl-luz", "aria-hidden": "true" });
        const polvo = el("canvas", { class: "tl-polvo", "aria-hidden": "true" });
        const borla = el("button", { class: "tl-borla", type: "button", "aria-label": "Abrir el telón" }, [el("span")]);
        const letras = el("div", { class: "tl-letras", style: x.tituloCSS }, [
          el("small", { text: "Junto a sus familias" }),
          el("b", { text: x.n1 }), x.n2 ? el("i", { text: "&" }) : null, x.n2 ? el("b", { text: x.n2 }) : null,
          el("span", { class: "tl-fecha", text: longDate(x.fecha) }),
        ]);
        x.closed.style.opacity = "0";
        x.opened.style.opacity = "1";
        const escena = bailarines(x.cam, x.m), quitarBaile = escena.quitar;
        const F = x.m.foco || { de: [.9, .3], a: [.5, .86] };
        const cono = el("div", { class: "tl-cono", "aria-hidden": "true" });
        (escena.caja ? escena.caja.after(cono) : x.cam.append(cono));
        let haz = null; // geometría del foco en píxeles del escenario
        const medirHaz = () => {
          const S = x.punto(F.de[0], F.de[1]), T = x.punto(F.a[0], F.a[1]);
          const dx = T.x - S.x, dy = T.y - S.y, L = Math.hypot(dx, dy), ang = -Math.atan2(dx, dy) * 180 / Math.PI;
          haz = { S, T, L, ang };
          Object.assign(cono.style, { left: S.x + "px", top: S.y + "px", height: L * 1.1 + "px", width: L * .62 + "px" });
          if (!cono.dataset.anim) cono.style.transform = `translateX(-50%) rotate(${ang + 30}deg)`;
        };
        medirHaz();
        x.cam.insertBefore(izq, null); x.cam.append(der);
        x.cam.classList.add("tl-oscuro");
        k.capa.append(luz, polvo, borla);
        k.paso(0, "Toca el telón para abrirlo");
        const btnSaltar = k.capa.querySelector(".ix-saltar");
        btnSaltar && btnSaltar.addEventListener("pointerdown", e => e.stopPropagation());

        // Polvo de brillo que cae sobre el telón mientras espera (y en la luz del foco al abrir).
        let vivo = true, foco = 0;
        const dpr = Math.min(2, devicePixelRatio || 1);
        const ctx = polvo.getContext("2d");
        let W = 0, H = 0, motas = [];
        const medir = () => {
          W = polvo.width = x.stage.clientWidth * dpr; H = polvo.height = x.stage.clientHeight * dpr;
          motas = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: (.5 + Math.random() * 1.6) * dpr, v: (.25 + Math.random() * .6) * dpr, f: Math.random() * 6.28 }));
        };
        medir(); k.ubicar = () => { medir(); medirHaz(); };
        (function cuadro(t) {
          if (!vivo) return;
          ctx.clearRect(0, 0, W, H);
          for (const p of motas) {
            p.y += p.v * (1 + foco); p.x += Math.sin(t / 1100 + p.f) * .3 * dpr;
            if (p.y > H) { p.y = -4; p.x = Math.random() * W; }
            // con el foco encendido, las motas brillan más dentro del haz (de arriba a la derecha hacia el centro)
            let enHaz = 0;
            if (foco && haz) {
              const sx = haz.S.x * dpr, sy = haz.S.y * dpr, ux = (haz.T.x - haz.S.x) * dpr, uy = (haz.T.y - haz.S.y) * dpr, LL = ux * ux + uy * uy;
              const u = ((p.x - sx) * ux + (p.y - sy) * uy) / LL;
              if (u > 0 && u < 1.05) { const d = Math.abs((p.x - sx) * uy - (p.y - sy) * ux) / Math.sqrt(LL); enHaz = Math.max(0, 1 - d / ((.02 + .2 * u) * Math.sqrt(LL))); }
            }
            const b = (.25 + .75 * Math.abs(Math.sin(t / 380 + p.f))) * (.45 + enHaz * foco);
            ctx.globalAlpha = Math.min(1, b);
            ctx.fillStyle = p.f > 3 ? "#ffe9b0" : "#ffffff";
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + enHaz * foco), 0, 6.28); ctx.fill();
          }
          requestAnimationFrame(cuadro);
        })(performance.now());

        // Separar el telón con el dedo (de lado a lado) o con un toque.
        const abrir = (desde = 0) => {
          if (fase !== 0) return;
          fase = 1; quitar && quitar(); vibrar([20, 40, 60]);
          borla.remove(); k.paso(1, "");
          const dur = 2300 * (1 - desde * .5);
          const kf = s => [{ transform: `translateX(${s * desde * 22}%) scaleX(${1 - desde * .35})` }, { transform: `translateX(${s * 46}%) scaleX(.22)`, offset: .82 }, { transform: `translateX(${s * 50}%) scaleX(.16)` }];
          fijar(izq, kf(-1), { duration: dur, easing: "cubic-bezier(.55,.05,.25,1)" });
          fijar(der, kf(1), { duration: dur, easing: "cubic-bezier(.55,.05,.25,1)" });
          // Las telas se ondulan al recogerse
          [izq, der].forEach(m2 => m2.firstChild.animate([{ transform: "skewY(0)" }, { transform: `skewY(${m2 === izq ? 1.2 : -1.2}deg)`, offset: .4 }, { transform: "skewY(0)" }], { duration: dur, easing: "ease-in-out" }));
          k.luego(() => { izq.style.opacity = "0"; der.style.opacity = "0"; }, dur);
          // El foco: se enciende con parpadeos, barre el escenario y cae sobre la pareja
          const A = dur * .55, BARRE = 1900, CAE = A + 500 + BARRE;
          k.luego(() => {
            cono.dataset.anim = "1";
            cono.animate([{ opacity: 0 }, { opacity: .9, offset: .1 }, { opacity: 0, offset: .2 }, { opacity: .75, offset: .32 }, { opacity: .1, offset: .42 }, { opacity: 1, offset: .6 }, { opacity: .95 }], { duration: 900, fill: "forwards" });
            fijar(cono, [{ transform: `translateX(-50%) rotate(${haz.ang + 30}deg)` }, { transform: `translateX(-50%) rotate(${haz.ang - 4}deg)`, offset: .8 }, { transform: `translateX(-50%) rotate(${haz.ang}deg)` }],
              { delay: 500, duration: BARRE, easing: "cubic-bezier(.45,.05,.3,1)" });
          }, A);
          // Cae sobre ellos: se encienden las luces del escenario y la cámara se acerca despacio
          k.luego(() => {
            vibrar(25);
            x.cam.classList.remove("tl-oscuro");
            fijar(luz, [{ opacity: 0 }, { opacity: 1 }], { duration: 1400, easing: "ease-out" });
            cono.animate([{ opacity: .95 }, { opacity: 0 }], { duration: 1800, easing: "ease-in", fill: "forwards" });
            k.destello(haz.T.x, haz.T.y, "#fff3d6", 60);
            const t0 = performance.now();
            (function sube(t) { foco = limitar((t - t0) / 900, 0, 1); if (foco < 1 && vivo) requestAnimationFrame(sube); })(t0);
            const oT = `${(haz.T.x / x.stage.clientWidth) * 100}% ${(haz.T.y / x.stage.clientHeight) * 100}%`;
            x.cam.style.transformOrigin = oT;
            x.cam.animate([{ scale: "1" }, { scale: "1.12" }], { duration: 7000, easing: "cubic-bezier(.3,0,.4,1)", fill: "forwards" });
            if (escena.caja) escena.caja.animate([{ scale: "1" }, { scale: "1.035" }], { duration: 7000, easing: "cubic-bezier(.3,0,.4,1)", fill: "forwards" });
          }, CAE);
          // Los nombres, como en una marquesina
          k.luego(() => {
            k.capa.append(letras);
            [...letras.children].forEach((n2, i) => n2.animate(
              [{ opacity: 0, filter: "blur(8px)", transform: "translateY(3cqw)", letterSpacing: n2.tagName === "B" ? ".18em" : "normal" }, { opacity: 1, filter: "blur(0)", transform: "none", letterSpacing: "normal" }],
              { delay: i * 380, duration: 1200, easing: EASE, fill: "forwards" }));
          }, CAE + 500);
          k.luego(() => {
            letras.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, fill: "forwards" });
            luz.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, fill: "forwards" });
            k.cerrar({ yaAbierto: true, sinTarjeta: true });
            setTimeout(() => { vivo = false; }, 1800);
          }, CAE + 500 + 380 * 4 + 2600);
        };
        borla.addEventListener("click", e => { e.stopPropagation(); abrir(); });
        quitar = arrastre(x.stage, "x", () => x.stage.clientWidth * .35, t => {
          if (fase !== 0) return;
          izq.style.transform = `translateX(${-t * 22}%) scaleX(${1 - t * .35})`; der.style.transform = `translateX(${t * 22}%) scaleX(${1 - t * .35})`;
        }, t => {
          if (fase !== 0) return;
          if (t > .3 || t < .02) abrir(t > .3 ? t : 0);
          else { [izq, der].forEach(m2 => { m2.style.transition = "transform .35s"; m2.style.transform = ""; setTimeout(() => (m2.style.transition = ""), 380); }); }
        });
        const fin = () => { vivo = false; quitar && quitar(); quitarBaile(); };
        k.saltar = () => { fase = 9; fin(); [izq, der, borla, letras, luz, polvo, cono].forEach(n2 => n2.remove()); x.cam.classList.remove("tl-oscuro"); k.cerrar({ yaAbierto: true, sinTarjeta: true }); };
        return { avanzar: () => abrir(), parar: () => { k.parar(); fin(); } };
      },
    },
  };

  // ---------- Construcción ----------
  const timers = new WeakMap();
  function construir(screen, o) {
    cargarFuentes();
    if (timers.has(screen)) timers.get(screen)();
    screen.textContent = "";
    screen.classList.toggle("ix-vertical", Boolean(modelById(o.modelo).apertura));
    const base = modelById(o.modelo);
    // Diseño a medida (Premium): el arte propio del pedido reemplaza el del modelo; el diseño y el texto siguen igual.
    const m = o.arte && o.arte.sobre ? { ...base, arte: o.arte, remoto: false, v: undefined, cardY: o.arte.cardY || base.cardY, cardInk: o.arte.cardInk || base.cardInk, video: Boolean(o.arte.video) } : base;
    const R = RECIPES[m.layout] || RECIPES.arco;
    const D = o.diseno && o.diseno.paleta ? o.diseno : disenoInicial(m);
    const T = D.textos || {};
    const d = Object.assign({}, o.datos || {});
    const muestra = !d.nombre1;
    // Quince años: una sola festejada. Save the date: solo fecha y lugar.
    const quince = d.tipo === "quince", std = Boolean(o.std) || T.encabezado === "Reserven la fecha";
    const n1 = d.nombre1 || (quince ? "Valeria" : (m.muestra || [])[0] || SAMPLE.nombre1), n2 = quince ? "" : (d.nombre2 || (m.muestra || [])[1] || SAMPLE.nombre2);
    if (!(o.diseno && o.diseno.paleta)) {
      if (quince) Object.assign(T, { encabezado: "Mis XV años", intro: "Cumplo quince años y quiero celebrarlo con ustedes.", titulo_rsvp: "¿Me acompañan?", cierre: "Los espero esa noche. Vengan con ganas de bailar." });
      if (std) { Object.assign(T, { encabezado: "Reserven la fecha", intro: quince ? "Cumplo quince años. Guarden la fecha: la invitación con todos los detalles llega pronto." : "Nos casamos. Guarden la fecha: la invitación con todos los detalles llega pronto.", cierre: "Pronto, todos los detalles." }); D.secciones = ["cuenta", "lugar"]; }
    }
    const pareja = n2 ? `${n1} & ${n2}` : n1;
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

    // Las fuentes del modelo llegan de internet: se piden ya, y los nombres no se muestran hasta tenerlas
    // (así no aparecen con otra letra y luego "saltan" de lugar).
    const fuentesModelo = [D.tipografia.titulo, D.tipografia.cuerpo].filter(Boolean);
    const listoFuentes = (document.fonts && document.fonts.load)
      ? Promise.race([Promise.all(fuentesModelo.map(f => document.fonts.load(`600 48px '${f}'`).catch(() => {}))), new Promise(r => setTimeout(r, 2000))])
      : Promise.resolve();
    const inv = el("div", { class: `inv cargando-fuentes L-${m.layout} M-${m.id}`, style: `--paper:${P.papel};--ink:${P.tinta};--acc:${P.acento};--suave:${P.suave || "transparent"};--titulo:${familia(D.tipografia.titulo)};--cuerpo:${familia(D.tipografia.cuerpo)}` });

    // Portada
    const hero = el("div", { class: "inv-hero" + (portada ? " has-photo" : "") }, [
      el("img", { class: "inv-hero-bg", src: portada || asset(m, "portada"), alt: "" }),
      el("div", { class: "inv-hero-text", style: `top:${m.heroY * 100}%;color:${portada ? "#fff" : m.heroInk}` }, [
        el("p", { class: "inv-kicker", text: (quince || std) ? T.encabezado : (m.kicker || R.kicker || T.encabezado || "Nuestra boda") }),
        el("p", { class: "inv-names", style: tituloCSS }, n2 ? [n1, el("span", { class: "amp", text: m.layout === "galeria" || m.layout === "deco" ? " & " : "&" }), n2] : [n1]),
        el("p", { class: "inv-date", text: shortDate(fecha) }),
        frase ? el("p", { class: "inv-phrase", text: `“${frase}”` }) : null,
      ]),
      m.layout === "postal" ? el("div", { class: "stamp", "aria-hidden": "true" }, [el("span", { text: shortDate(fecha) }), el("small", { text: paisDeZona(d.zona) })]) : null,
    ]);

    const body = el("div", { class: "inv-body" });
    let numero = 0;
    const head = t => el("h4", { class: "inv-h", style: tituloCSS }, [R.numerar ? el("span", { class: "num", text: pad(++numero) }) : null, t]);
    const sec = (cls, t, kids) => el("section", { class: `inv-sec ${cls} rv` }, [t ? head(t) : null, ...kids]);
    const ornament = (k = "") => el("img", { class: `orn-img ${R.dark ? "on-dark" : "on-light"}${m.remoto ? " fade" : ""} ${k} rv`, src: asset(m, "ornamento"), alt: "", loading: "lazy" });

    // Intro, saludo personal y padres
    body.append(el("p", { class: "inv-intro rv" }, [T.intro || `${pareja} los invitan a celebrar.`]));
    if (o.invitado) {
      body.append(el("div", { class: "inv-pase rv" }, [
        el("small", { text: "Esta invitación es para" }), el("b", { class: "t-titulo", text: o.invitado.nombre }),
        el("span", { text: `Válida para ${o.invitado.cupos} ${o.invitado.cupos === 1 ? "persona" : "personas"}` }),
      ]));
    }
    if (d.padres1 || d.padres2) {
      body.append(el("div", { class: "inv-padres rv" }, [el("small", { text: quince ? "Con la bendición de mis padres" : "Con la bendición de nuestros padres" }),
        d.padres1 ? el("p", { text: d.padres1 }) : null, d.padres2 ? el("p", { text: d.padres2 }) : null,
        d.padrinos ? el("p", {}, [el("small", { text: "Y nuestros padrinos" }), d.padrinos]) : null]));
    }
    body.append(ornament());

    // Cuenta atrás
    const target = eventDate(fecha, d.hora || "16:00", tz);
    const cd = el("div", { class: `inv-cd cd-${R.cd}`, role: "timer", "aria-label": "Cuenta atrás" });
    let units = [], line = null;
    if (R.cd === "sentence" || R.cd === "log") { line = el("p", { class: "cd-line" }); cd.append(line); }
    else units = (R.cd === "pillars" ? ["Días", "Horas", "Min", "Seg"] : ["Días", "Horas", "Minutos", "Segundos"]).map(l => { const b = el("b"); cd.append(el("div", { class: "u" }, [b, el("small", { text: R.cd === "pillars" ? l.toUpperCase() : l })])); return b; });
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
    const titulo = quince ? `XV años de ${n1}` : `Boda de ${n1} y ${n2}`;
    const fin = new Date(target.getTime() + 6 * 3600000);
    const fmtCal = x => x.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(titulo)}&dates=${fmtCal(target)}/${fmtCal(fin)}&location=${encodeURIComponent(`${lugar}, ${dir}`)}`;
    const ics = () => {
      const txt = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Mejorativa Love//ES", "BEGIN:VEVENT", `UID:${o.slug || "demo"}@love.mejorativa.com`, `DTSTAMP:${fmtCal(new Date())}`,
        `DTSTART:${fmtCal(target)}`, `DTEND:${fmtCal(fin)}`, `SUMMARY:${titulo}`, `LOCATION:${lugar}, ${dir}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
      const a = el("a", { href: URL.createObjectURL(new Blob([txt], { type: "text/calendar" })), download: "boda.ics" }); a.click();
    };

    // Lugar(es)
    // Con el punto exacto (buscador de lugares) los botones llevan directo; si no, buscan por nombre y dirección.
    const mapsUrl = (mapa, lug, dr, geo) => mapa || (geo ? `https://www.google.com/maps/search/?api=1&query=${geo}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lug}, ${dr}`)}`);
    const wazeUrl = (lug, dr, geo) => geo ? `https://waze.com/ul?ll=${geo}&navigate=yes` : `https://waze.com/ul?q=${encodeURIComponent(`${lug}, ${dr}`)}&navigate=yes`;
    function bloqueLugar(lug, dr, hora, mapa, geo) {
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
        el("a", { class: "inv-mini", href: mapsUrl(mapa, lug, dr, geo), target: "_blank", rel: "noopener", text: "Google Maps" }),
        el("a", { class: "inv-mini", href: wazeUrl(lug, dr, geo), target: "_blank", rel: "noopener", text: "Waze" }),
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
        ...bloqueLugar(lugar, dir, d.hora || "16:00", d.mapa, d.geo),
        rc ? el("div", { class: "inv-loc2" }, [el("span", { class: "inv-sub", text: "Recepción" }), ...bloqueLugar(rc.lugar, rc.direccion || "", rc.hora || d.hora, rc.mapa, rc.geo)]) : null,
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
      // Confirmar en dos toques: «Sí» o «No» y el botón. Cuántos van solo si su invitación es para más de uno;
      // nombres, alergias y mensaje quedan plegados y son opcionales, para que nadie se abrume.
      function formulario() {
        let asiste = previa ? !!previa.asiste : null, personas = previa && previa.personas ? previa.personas : max;
        const err = el("p", { class: "inv-err", role: "alert" });
        const out = el("output", { text: String(personas) });
        const menos = el("button", { type: "button", "aria-label": "Una persona menos", text: "−" });
        const mas = el("button", { type: "button", "aria-label": "Una persona más", text: "+" });
        const si = el("button", { type: "button", "aria-pressed": String(asiste === true), text: "Sí, ahí estaremos" });
        const no = el("button", { type: "button", "aria-pressed": String(asiste === false), text: "No podremos ir" });
        const nombre = o.invitado ? null : el("input", { name: "nombre", maxlength: "80", autocomplete: "name", placeholder: "Nombre y apellido" });
        const cupos = el("label", {}, [`¿Cuántos van? (su invitación es para ${max})`, el("div", { class: "inv-cupos" }, [menos, out, mas])]);
        const nombres = el("input", { name: "nombres", maxlength: "300", placeholder: "Ej.: Ana, Pedro y Sofía" });
        const alergias = el("input", { name: "alergias", maxlength: "200", placeholder: "Ej.: maní, mariscos" });
        const cancion = el("input", { name: "cancion", maxlength: "120", placeholder: "La que no puede faltar" });
        const mensaje = el("textarea", { name: "mensaje", rows: "2", maxlength: "400", placeholder: "Unas palabras para los novios" });
        if (previa) nombres.value = previa.nombres || "";
        const camposSi = [
          max > 1 ? el("label", {}, ["Nombres de quienes van", nombres]) : null,
          d.preguntarAlergias !== false ? el("label", {}, ["Alergias o comida especial", alergias]) : null,
          d.preguntarCancion ? el("label", {}, ["Una canción para la fiesta", cancion]) : null,
        ];
        // Novedades de Mejorativa: solo si el invitado lo pide y escribe su propio correo. Nunca marcada de fábrica.
        const correoNov = el("input", { type: "email", name: "correo_novedades", maxlength: "200", autocomplete: "email", placeholder: "su@correo.com" });
        const cajaCorreo = el("label", { hidden: true }, ["Su correo", correoNov]);
        const quiere = el("input", { type: "checkbox" });
        quiere.onchange = () => { cajaCorreo.hidden = !quiere.checked; if (quiere.checked) correoNov.focus(); };
        const novedades = o.vista ? null : el("div", { class: "inv-nov" }, [el("label", { class: "inv-check" }, [quiere, el("span", { text: "(Opcional) Quiero recibir novedades y ofertas de Mejorativa, la marca que hizo esta invitación." })]), cajaCorreo]);
        // Captcha: solo en la invitación general (sin enlace personal) y si el servidor lo tiene activo.
        const cajaHumano = el("div", { class: "inv-humano" });
        const humano = !o.invitado && o.turnstile && window.Humano ? window.Humano(cajaHumano) : null;
        if (humano) humano.preparar(o.turnstile);
        const extras = el("details", { class: "inv-extra" }, [el("summary", { text: "Agregar un detalle (opcional)" }), el("div", { style: "display:grid;gap:3.6cqw;margin-top:3.6cqw" }, [...camposSi, el("label", {}, ["Mensaje para los novios", mensaje])])]);
        const enviar = el("button", { class: "inv-btn", type: "submit" });
        const sync = () => {
          out.textContent = personas; menos.disabled = personas <= 1; mas.disabled = personas >= max;
          cupos.hidden = asiste !== true || max <= 1;
          camposSi.forEach(x => { if (x) x.hidden = asiste !== true; });
          extras.hidden = asiste === null; enviar.hidden = asiste === null;
          enviar.textContent = asiste ? (max > 1 ? `Confirmar: ${personas === 1 ? "va 1 persona" : `van ${personas}`}` : (T.boton_rsvp || "Confirmar asistencia")) : "Avisar que no podremos ir";
          if (previa && asiste !== null) enviar.textContent = asiste ? `Actualizar: ${max > 1 ? (personas === 1 ? "va 1 persona" : `van ${personas}`) : "sí vamos"}` : "Actualizar: no podremos ir";
        };
        menos.onclick = () => { personas = Math.max(1, personas - 1); sync(); };
        mas.onclick = () => { personas = Math.min(max, personas + 1); sync(); };
        si.onclick = () => { asiste = true; si.setAttribute("aria-pressed", "true"); no.setAttribute("aria-pressed", "false"); sync(); };
        no.onclick = () => { asiste = false; no.setAttribute("aria-pressed", "true"); si.setAttribute("aria-pressed", "false"); sync(); };
        const f = el("form", { class: "inv-rsvp-form", novalidate: true }, [
          nombre ? el("label", {}, ["Su nombre", nombre]) : null,
          el("div", { class: "inv-sino" }, [si, no]), cupos, extras, novedades, humano ? cajaHumano : null, err, enviar]);
        sync();
        f.addEventListener("submit", async e => {
          e.preventDefault(); err.textContent = "";
          if (asiste === null) { err.textContent = "Toquen «Sí» o «No»."; return; }
          if (nombre && !nombre.value.trim()) { err.textContent = "Escriban su nombre."; nombre.focus(); return; }
          if (o.vista || !o.api) { err.textContent = "Así confirmarán sus invitados. En la vista previa no se guarda."; return; }
          if (quiere.checked && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(correoNov.value.trim())) { err.textContent = "Escriban su correo para recibir novedades, o desmarquen la casilla."; correoNov.focus(); return; }
          if (humano && humano.activo() && !humano.token()) { err.textContent = "Un segundo: confirmen que no son un robot y vuelvan a tocar el botón."; return; }
          const txt = enviar.textContent; enviar.disabled = true; enviar.textContent = "Enviando…";
          try {
            const body = { s: o.slug, g: o.invitado ? o.invitado.id : undefined, asiste, personas: asiste ? personas : 0, nombre: nombre ? nombre.value : undefined,
              nombres: nombres.value, alergias: alergias.value, mensaje: [mensaje.value, cancion.value ? `Canción: ${cancion.value}` : ""].filter(Boolean).join(" · "),
              novedades: quiere.checked, correo_novedades: quiere.checked ? correoNov.value.trim() : undefined, turnstile: humano ? humano.token() : undefined };
            const r = await fetch(o.api + "/love/api/rsvp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
            const j = await r.json().catch(() => ({}));
            if (!r.ok || !j.ok) throw new Error(j.mensaje || "No se pudo guardar. Intenten de nuevo.");
            if (o.invitado) o.invitado.rsvp = { asiste: asiste ? 1 : 0, personas: asiste ? personas : 0, nombres: nombres.value };
            mostrarOk(j.mensaje, asiste);
          } catch (x) { err.textContent = x.message; enviar.disabled = false; enviar.textContent = txt; if (humano) humano.reiniciar(); }
        });
        return f;
      }
      function mostrarOk(msg, asiste) {
        caja.querySelectorAll(".inv-rsvp-form, .inv-ok").forEach(x => x.remove());
        caja.append(el("div", { class: "inv-ok" }, [el("b", { class: "t-titulo", text: asiste ? "¡Gracias!" : "Gracias por avisar" }), msg || "",
          asiste && o.invitado && o.invitado.mesa ? el("p", { class: "inv-mesa" }, [el("small", { text: "Su mesa" }), el("b", { class: "t-titulo", text: o.invitado.mesa })]) : null,
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

    if (!portada && m.baile) limpiezas.push(bailarines(hero, m).quitar);

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
    const IX = m.apertura && !reduced && !o.abierta && INTERACCIONES[m.apertura] ? INTERACCIONES[m.apertura] : null;
    const conVideo = !IX && m.video !== false && !reduced && !o.abierta && Boolean(window.LOVE && window.LOVE.api);
    const video = conVideo ? el("video", { class: "env-video", muted: "", playsinline: "", "webkit-playsinline": "", preload: "auto", poster: asset(m, "sobre"), "aria-hidden": "true" }) : null;
    const apiVideos = (window.LOVE && window.LOVE.api) || "";
    if (video && apiVideos) { video.muted = true; video.src = m.arte ? `${apiVideos}${m.arte.video}` : `${apiVideos}/love/v/${m.id}.mp4${m.v ? `?v=${m.v}` : ""}`; video.load(); }
    let videoListo = false;
    if (video) { video.addEventListener("canplaythrough", () => { videoListo = true; }, { once: true }); video.addEventListener("error", () => { videoListo = false; video.remove(); }, { once: true }); }
    const flash = el("div", { class: "env-flash" });
    const vign = el("div", { class: "env-vignette" });
    const card = el("div", { class: "env-card", style: `top:${m.cardY * 100}%;color:${m.cardInk};${tituloCSS}` }, [el("span", { class: "c-names", text: pareja }), el("span", { class: "c-date", text: shortDate(fecha) })]);
    const hint = el("p", { class: "env-hint", text: IX ? IX.invita : "Toca el sobre para abrir" });
    const para = o.invitado ? el("p", { class: "env-para" }, ["Para", el("b", { text: o.invitado.nombre })]) : null;
    const cam = el("div", { class: "env-cam" }, [closed, opened, video, glow, card]);
    const stage = el("div", { class: "inv-env", role: "button", tabindex: "0", "aria-label": `Abrir la invitación${o.invitado ? " de " + o.invitado.nombre : ""}` }, [cam, vign, flash, para, hint]);
    // Respiración del sobre mientras espera (anticipación)
    const respira = reduced ? null : cam.animate([{ transform: "scale(1)" }, { transform: "scale(1.035)" }], { duration: 5200, iterations: Infinity, direction: "alternate", easing: "ease-in-out" });
    let abierto = false, actualCam = "none", juego = null;
    function abrir() {
      // Apertura interactiva: el primer toque (o la vista previa) empieza el juego; el juego llama a secuencia al terminar.
      if (IX) {
        if (juego) return;
        juego = IX.jugar({ stage, cam, closed, opened, glow, hint, m, n1, n2, fecha, lugar, tituloCSS, acento: P.acento, invitado: o.invitado,
          foto: portada || asset(m, "foto"), punto: (fx, fy) => puntoArte(stage, fx, fy),
          fin: (op = {}) => { if (abierto) return; abierto = true; if (respira) { try { respira.commitStyles(); } catch (e) {} respira.cancel(); actualCam = getComputedStyle(cam).transform; } listoFuentes.then(() => secuencia(op)); } });
        limpiezas.push(() => juego && juego.parar && juego.parar());
        return;
      }
      if (abierto) return; abierto = true;
      if (reduced) { stage.classList.add("done"); hero.style.opacity = "1"; if (o.alAbrir) o.alAbrir(); return; }
      actualCam = respira ? getComputedStyle(cam).transform : "none";
      if (respira) { try { respira.commitStyles(); } catch (e) {} respira.cancel(); }
      const opt = (delay, duration, extra = {}) => ({ delay, duration, easing: EASE, fill: "forwards", ...extra });
      hint.animate([{ opacity: 1 }, { opacity: 0 }], opt(0, 350));
      // Conexión lenta: se espera un momento al video antes de usar el respaldo
      if (video && video.isConnected && video.readyState < 3) {
        let listo = false;
        const seguir = () => { if (listo) return; listo = true; listoFuentes.then(secuencia); };
        video.addEventListener("canplay", seguir, { once: true });
        setTimeout(seguir, 1200);
        return;
      }
      listoFuentes.then(secuencia);
    }
    function secuencia(op = {}) {
      const opt = (delay, duration, extra = {}) => ({ delay, duration, easing: EASE, fill: "forwards", ...extra });
      if (op.yaAbierto) {
        // El juego ya abrió el objeto: se pasa directo a la tarjeta (o a la portada) sin repetir la apertura.
        const A = op.sinTarjeta ? 500 : 1500;
        if (op.sinTarjeta) card.style.display = "none";
        opened.style.opacity = "1";
        cam.style.transformOrigin = `50% ${m.cardY * 100}%`;
        const T = A + 1500;
        cam.animate([{ transform: actualCam === "none" ? "scale(1)" : actualCam, filter: "brightness(1)" }, { transform: "scale(1.08)", offset: A / T * .98 }, { transform: "scale(3.2)", filter: "brightness(1.6) blur(2px)" }], { duration: T, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards" });
        if (!op.sinTarjeta) {
          card.animate([{ opacity: 0, transform: "translate(-50%, -44%)", filter: "blur(6px)", letterSpacing: ".08em" }, { opacity: 1, transform: "translate(-50%, -50%)", filter: "blur(0)", letterSpacing: "0em" }], opt(100, 900));
          card.animate([{ opacity: 1 }, { opacity: 0 }], { delay: A + 250, duration: 420, easing: "ease-in", fill: "forwards", composite: "replace" });
        }
        flash.animate([{ opacity: 0 }, { opacity: .9, offset: .55 }, { opacity: 0 }], { delay: A + 300, duration: 1500, easing: "ease-in-out", fill: "forwards" });
        stage.animate([{ opacity: 1 }, { opacity: 0 }], { delay: A + 800, duration: 700, easing: "ease-out", fill: "forwards" });
        hero.animate([{ opacity: 0, transform: "scale(1.14)" }, { opacity: 1, transform: "scale(1)" }], { delay: A + 600, duration: 2200, easing: EASE, fill: "forwards" });
        setTimeout(() => { const parar = particulas(screen, D.animacion && D.animacion.particulas !== "ninguna" ? D.animacion.particulas : "destellos", P.acento); limpiezas.push(parar); }, A + 600);
        setTimeout(() => { stage.classList.add("done"); inv.focus && inv.focus({ preventScroll: true }); if (o.alAbrir) o.alAbrir(); }, A + 1600);
        return;
      }
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
      // Antes de que aparezca la portada, los nombres de la tarjeta se desvanecen: nunca hay dos juegos de nombres a la vez.
      card.animate([{ opacity: 1 }, { opacity: 0 }], { delay: A + 250, duration: 420, easing: "ease-in", fill: "forwards", composite: "replace" });
      // Destello cálido que funde el sobre con la portada
      flash.animate([{ opacity: 0 }, { opacity: .9, offset: .55 }, { opacity: 0 }], { delay: A + 500, duration: 1500, easing: "ease-in-out", fill: "forwards" });
      stage.animate([{ opacity: 1 }, { opacity: 0 }], { delay: A + 900, duration: 700, easing: "ease-out", fill: "forwards" });
      hero.animate([{ opacity: 0, transform: "scale(1.14)" }, { opacity: 1, transform: "scale(1)" }], { delay: A + 700, duration: 2200, easing: EASE, fill: "forwards" });
      setTimeout(() => { const parar = particulas(screen, D.animacion && D.animacion.particulas, P.acento); limpiezas.push(parar); }, A + 700);
      setTimeout(() => { stage.classList.add("done"); if (video) { video.pause(); video.removeAttribute("src"); video.load(); } inv.focus && inv.focus({ preventScroll: true }); if (o.alAbrir) o.alAbrir(); }, A + 1700);
    }
    stage.addEventListener("click", () => { if (!IX || !juego) abrir(); });
    stage.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (IX && juego) juego.avanzar(); else abrir(); } });
    hero.style.opacity = "0";
    screen.append(inv, stage);
    listoFuentes.then(() => inv.classList.remove("cargando-fuentes"));
    if (IX) requestAnimationFrame(() => abrir()); // el juego empieza solo: el primer toque ya cuenta
    if (o.autoAbrir) setTimeout(abrir, reduced ? 0 : 1000);
    if (o.abierta) { abierto = true; stage.classList.add("done"); hero.style.opacity = "1"; }
    timers.set(screen, () => limpiezas.forEach(f => f()));
    return { abrir, destruir: () => { limpiezas.forEach(f => f()); screen.textContent = ""; } };
  }

  window.Motor = { construir, modelById, shortDate, longDate, hora12, disenoInicial, asset };
})();
