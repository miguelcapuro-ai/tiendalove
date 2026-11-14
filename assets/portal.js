/* Mejorativa Love · portal de quien compró la invitación (novios, familia u organización). Se entra con el enlace privado del correo: /portal/#id.clave */
(() => {
  "use strict";
  const API = (window.LOVE.api || "").replace(/\/$/, "");
  const WA = window.LOVE.whatsapp || "50763454868";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const arrow = '<span class="arr"><svg class="ico" aria-hidden="true"><use href="#i-arrow"/></svg></span>';
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const el = (tag, attrs = {}, kids = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (v === false || v == null) continue; if (k === "text") n.textContent = v; else if (k === "html") n.innerHTML = v; else if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v === true ? "" : v); }
    for (const c of [].concat(kids)) if (c != null && c !== false) n.append(c);
    return n;
  };
  const digits = s => String(s || "").replace(/\D/g, "");
  const waNum = t => { let d = digits(t); if (d.length === 8) d = "507" + d; return d.length >= 10 ? d : ""; };
  const pad = n => String(n).padStart(2, "0");
  const hoy = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const maxF = () => { const d = new Date(); d.setFullYear(d.getFullYear() + 10); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const [id, key] = decodeURIComponent(location.hash.slice(1)).split(".");
  // "Ana y Luis", "Valeria" o "Grupo Andino": quién invita según el tipo de evento.
  const EV = () => Motor.evento(P && P.tipo);
  const pareja = d => Motor.quienInvita({ ...d, tipo: P && P.tipo });
  const invita = d => Motor.fraseInvita({ ...d, tipo: P && P.tipo });
  const NP = id => ({ esencial: "Íntima", clasico: "Celebración", premium: "Gran Fiesta" }[id] || id);
  let P = null, tab = sessionStorage.getItem("ml-tab") || "invitacion", tPoll = null;

  async function api(path, body) {
    const r = await fetch(API + path + (body ? "" : `?id=${encodeURIComponent(id)}&key=${encodeURIComponent(key)}`),
      body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, key, ...body }) } : undefined);
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) { const e = new Error(j.mensaje || "Algo falló. Intenten de nuevo."); e.status = r.status; throw e; }
    return j;
  }
  function aviso(t, mal) { const a = $("#pAviso"); a.textContent = t; a.className = "p-aviso" + (mal ? " mal" : ""); a.hidden = !t; if (t) setTimeout(() => { if (a.textContent === t) a.hidden = true; }, 7000); }

  // El acceso se recuerda en este dispositivo, para volver con un toque desde la tienda.
  const recordar = () => { try { localStorage.setItem("ml-boda", JSON.stringify({ h: `${id}.${key}`, nombres: pareja(P.datos), codigo: P.codigo, t: Date.now() })); } catch {} };
  async function cargar() {
    if (!id || !key) {
      let guardada = null; try { guardada = JSON.parse(localStorage.getItem("ml-boda")); } catch {}
      if (guardada && guardada.h) { location.replace(`#${guardada.h}`); setTimeout(() => location.reload(), 30); return; }
      return fallo("Este enlace no está completo", "Ábranlo desde el correo que les enviamos, o entren con su código de pedido.", true);
    }
    try {
      P = await api("/love/api/portal"); recordar();
      if (/[?&]resena=1/.test(location.search)) tab = "invitacion";
      pintar(); seguridad();
      if (/[?&]resena=1/.test(location.search)) setTimeout(() => { const r = $("#pResena"); if (r) r.scrollIntoView({ behavior: "smooth", block: "center" }); }, 600);
    }
    catch (e) { if ([403, 404, 410].includes(e.status)) olvidar(); fallo(e.status === 410 ? "Esta invitación ya cumplió su tiempo" : "No pudimos abrir su portal", e.message, e.status !== 410); }
  }
  // Seguridad: cambiar la llave (la vieja deja de servir) o salir de este dispositivo.
  function olvidar() { try { localStorage.removeItem("ml-boda"); sessionStorage.removeItem("ml-tab"); } catch {} }
  function seguridad() {
    const caja = $("#pSeguro"); if (!caja) return; caja.hidden = false;
    $("#pSalir").onclick = () => { olvidar(); history.replaceState(null, "", location.pathname); location.replace("../"); };
    $("#pCambiar").onclick = async (ev) => {
      if (!confirm("El enlace actual dejará de funcionar en todos los dispositivos, también en este. El nuevo les llega a su correo. ¿Cambiarlo?")) return;
      const b = ev.currentTarget; b.disabled = true;
      try {
        const j = await api("/love/api/cambiar-enlace", {});
        olvidar(); history.replaceState(null, "", location.pathname);
        $("#pCuerpo").textContent = ""; $("#pTabs").hidden = true; caja.hidden = true;
        $("#pTitulo").textContent = "Enlace cambiado"; $("#pLead").textContent = j.mensaje;
      } catch (e) { aviso(e.message, true); b.disabled = false; }
    };
  }
  // Si abren otro enlace de portal en la misma pestaña (otro correo, otra boda), se recarga con esos datos.
  addEventListener("hashchange", () => location.reload());
  function fallo(t, m, entrar) {
    $("#pTitulo").textContent = t; $("#pLead").textContent = m;
    if (entrar) $("#pLead").after(el("p", {}, [el("a", { class: "btn", href: "../entrar/", html: `Entrar con mi código ${arrow}` })]));
  }

  function pintar() {
    const d = P.datos;
    $("#pCodigo").textContent = `Pedido ${P.codigo}`;
    $("#pTitulo").textContent = EV().dos ? `Hola, ${pareja(d)}.` : EV().empresa ? `Hola, equipo de ${d.nombre1}.` : `${EV().nombre} de ${d.nombre1}`;
    $("#pEtapa").textContent = P.etapa;
    clearInterval(tPoll);
    if (!P.pagado) {
      $("#pLead").textContent = "Su pedido está esperando el pago.";
      $("#pTabs").hidden = true;
      // El pago se hace en la tienda: ahí aparecen los métodos disponibles (Yappy solo desde Panamá, tarjeta o PayPal) y se confirma solo.
      const pagar = `${location.origin}/#pagar=${id}.${encodeURIComponent(key)}`;
      const ayuda = `Hola, Miguel. Escribo por la invitación de ${pareja(d)}. Pedido ${P.codigo} por $${P.plan.precio}. Necesito ayuda con el pago.`;
      $("#pCuerpo").innerHTML = `<div class="pay" style="max-width:620px"><div class="price">US$${P.plan.precio}<small>plan ${esc(P.plan.nombre)}</small></div>
        <section class="pay-op"><h3>Pagar ahora <span class="tag">Al instante</span></h3><span class="label" style="color:#A9B6CB">Su código</span><div class="code">${esc(P.codigo)}</div>
        <p class="fine-w">Con Yappy (desde Panamá), tarjeta o PayPal. Se confirma solo y no tienen que enviarnos nada: al terminar el pago empezamos su invitación.</p>
        <a class="btn gold" href="${pagar}">Pagar mi invitación ${arrow}</a>
        <p class="fine-w">¿Algún problema con el pago? <a href="https://wa.me/${WA}?text=${encodeURIComponent(ayuda)}" target="_blank" rel="noopener">Escríbannos por WhatsApp</a>.</p></section>
        <div class="wait-box"><span class="spinner"></span><b>Esperando la confirmación</b></div></div>`;
      tPoll = setInterval(refrescar, 15000); return;
    }
    if (!P.diseno || (P.disenando && P.version === 0)) {
      $("#pLead").textContent = "Claude está diseñando su invitación. Toma unos minutos; esta página se actualiza sola.";
      $("#pTabs").hidden = true;
      $("#pCuerpo").innerHTML = '<div class="p-card center"><span class="spinner dark"></span><p style="margin-top:14px">Diseñando su invitación…</p></div>';
      tPoll = setInterval(refrescar, 8000); return;
    }
    $("#pLead").textContent = P.disenando ? "Estamos aplicando sus cambios. En un par de minutos ven la nueva versión aquí y en su correo." : "Su invitación está lista. Revísenla, carguen a sus invitados y envíenla cuando quieran.";
    if (P.disenando) tPoll = setInterval(refrescar, 8000);
    const tabs = P.plan.std ? [["invitacion", "Su Save the date"], ["datos", "Corregir datos"]] : [["invitacion", "Su invitación"], ["invitados", P.plan.listaInvitados ? `Invitados (${P.invitados.length})` : "Compartir"], ...(P.plan.mesas ? [["mesas", `Mesas (${(P.datos.mesas || []).length})`]] : []), ["respuestas", `Confirmaciones (${P.totales.personas})`], ["datos", "Corregir datos"], ["cambios", P.plan.cambiarModelo ? "Modelo y ajustes" : `Pedir ajustes (${P.revisiones.quedan})`]];
    if (!tabs.some(([k]) => k === tab)) tab = "invitacion";
    const nav = $("#pTabs"); nav.hidden = false; nav.textContent = "";
    tabs.forEach(([k, t]) => nav.append(el("button", { type: "button", role: "tab", "aria-selected": String(tab === k), text: t, onclick: () => { tab = k; sessionStorage.setItem("ml-tab", k); pintar(); } })));
    const c = $("#pCuerpo"); c.textContent = "";
    ({ invitacion, invitados, mesas, respuestas, datos: formDatos, cambios })[tab]?.(c);
  }
  async function refrescar() { try { const nuevo = await api("/love/api/portal"); const cambio = !P || nuevo.version !== P.version || nuevo.estado !== P.estado || nuevo.pagado !== P.pagado; P = nuevo; if (cambio) { pintar(); if (P.estado === "lista") aviso("Su invitación está lista."); } } catch {} }

  const kpi = (n, t) => el("div", { class: "kpi" }, [el("b", { text: String(n) }), el("span", { text: t })]);
  function totales() {
    const t = P.totales;
    return el("div", { class: "kpis" }, [kpi(t.personas, "personas confirmadas"), kpi(t.confirmados, "respuestas «sí»"), kpi(t.noVan, "no van"),
      P.plan.listaInvitados ? kpi(t.pendientes, "sin responder") : null, P.plan.listaInvitados ? kpi(t.cupos, "cupos repartidos") : null]);
  }

  // ---------- Invitación ----------
  function invitacion(c) {
    const box = el("div", { class: "p-inv" });
    const scr = el("div", { class: "screen" });
    box.append(el("div", { class: "phone" }, [scr]), el("div", { class: "p-inv-side" }, [
      el("span", { class: "label", text: `Versión ${P.version} · modelo ${Motor.modelById(P.modelo).name}` }),
      P.diseno.nota_para_novios ? el("p", { class: "p-nota", text: P.diseno.nota_para_novios }) : null,
      el("div", { class: "p-acc" }, [
        el("a", { class: "btn", href: P.enlaceGeneral + "?vista=1", target: "_blank", rel: "noopener", html: `Abrir en grande ${arrow}` }),
        el("button", { class: "link", type: "button", text: "Abrir el sobre otra vez", onclick: () => dibujar(true) })]),
      el("div", { class: "p-card" }, [el("b", { text: P.plan.listaInvitados ? "Enlace general" : "Su enlace para compartir" }),
        el("p", { class: "hint", text: P.plan.std ? "Compártanlo con todos sus invitados para que reserven la fecha. La invitación con confirmación llega después." : P.plan.listaInvitados ? "Sirve para quien no esté en su lista. Para cada invitado usen su enlace personal (pestaña Invitados)." : `Compártanlo con todos. Cada respuesta puede incluir hasta ${P.totales.cupoGeneral} ${P.totales.cupoGeneral === 1 ? "persona" : "personas"}.` }),
        el("div", { class: "p-link" }, [el("input", { value: P.enlaceGeneral, readonly: true, "aria-label": "Enlace general" }), el("button", { class: "btn sm", type: "button", text: "Copiar", onclick: e => copiar(P.enlaceGeneral, e.currentTarget) })]),
        el("a", { class: "link", href: `https://wa.me/?text=${encodeURIComponent(`${invita(P.datos)} 💌 Abran su invitación aquí: ${P.enlaceGeneral}`)}`, target: "_blank", rel: "noopener", text: "Compartir por WhatsApp" })]),
      P.plan.std ? tarjetaCredito() : totales(),
      P.plan.std || !P.pagado ? null : tarjetaResena(),
    ]));
    c.append(box);
    const dibujar = abrir => Motor.construir(scr, { arte: P.arte || null, modelo: P.modelo, diseno: P.diseno, datos: P.datos, fotos: P.fotos.map(u => API + u), portada: P.portada, vista: true, autoAbrir: abrir, cupoGeneral: P.totales.cupoGeneral });
    dibujar(true);
  }
  function copiar(t, btn) { navigator.clipboard?.writeText(t).then(() => { const o = btn.textContent; btn.textContent = "Copiado"; setTimeout(() => (btn.textContent = o), 1600); }); }

  // Save the date: pasar a la invitación completa con el crédito de lo que ya pagaron.
  function tarjetaCredito() {
    const cr = P.credito || {};
    if (cr.usado) return el("div", { class: "p-card" }, [el("b", { text: "Su crédito ya se usó" }), el("p", { class: "hint", text: "Lo descontamos de su invitación completa. Búsquenla en su correo." })]);
    return el("div", { class: "p-card credito" }, [
      el("b", { text: `Tienen US$${cr.monto || 29} de crédito` }),
      el("p", { text: "Cuando quieran la invitación completa (lista de invitados con cupos, confirmaciones y envío a cada uno), se les descuenta lo que pagaron por este Save the date. Sus datos ya van llenos." }),
      el("a", { class: "btn gold", href: `../#completa=${id}.${encodeURIComponent(key)}`, html: `Quiero la invitación completa ${arrow}` })]);
  }

  // Reseña: cuéntennos cómo les fue. Solo se publica con su permiso y después de que Miguel la revise.
  function tarjetaResena() {
    const caja = el("div", { class: "p-card resena", id: "pResena" });
    if (P.resena) {
      caja.append(el("b", { text: "Gracias por su opinión" }), el("p", { class: "estrellas", text: "★".repeat(P.resena.estrellas) + "☆".repeat(5 - P.resena.estrellas) }), el("p", { class: "hint", text: `«${P.resena.texto}»` }));
      return caja;
    }
    let estrellas = 0;
    const st = el("div", { class: "estrellas-pick", role: "radiogroup", "aria-label": "Calificación" });
    const pintarSt = () => [...st.children].forEach((b, i) => { b.textContent = i < estrellas ? "★" : "☆"; b.setAttribute("aria-checked", String(i + 1 === estrellas)); });
    for (let i = 1; i <= 5; i++) st.append(el("button", { type: "button", role: "radio", "aria-label": `${i} ${i === 1 ? "estrella" : "estrellas"}`, text: "☆", onclick: () => { estrellas = i; pintarSt(); } }));
    const t = el("textarea", { rows: "3", maxlength: "600", placeholder: "¿Qué les dijeron sus invitados? ¿Qué podemos mejorar?", "aria-label": "Su opinión" });
    const ok = el("input", { type: "checkbox", checked: true });
    const msg = el("p", { class: "hint", "aria-live": "polite" });
    const btn = el("button", { class: "btn sm", type: "button", text: "Enviar mi opinión", onclick: async () => {
      if (!estrellas) { msg.textContent = "Elijan de 1 a 5 estrellas."; return; }
      if (t.value.trim().length < 10) { msg.textContent = "Cuéntennos un poco más (al menos una frase)."; t.focus(); return; }
      btn.disabled = true; msg.textContent = "Enviando…";
      try { await api("/love/api/resena", { estrellas, texto: t.value.trim(), permiso: ok.checked }); P.resena = { estrellas, texto: t.value.trim() }; caja.replaceWith(tarjetaResena()); }
      catch (e) { msg.textContent = e.message; btn.disabled = false; }
    } });
    caja.append(el("b", { text: "¿Cómo les fue con su invitación?" }), el("p", { class: "hint", text: "Toma un minuto y nos ayuda muchísimo." }), st, t,
      el("label", { class: "check" }, [ok, el("span", { text: "Pueden publicarla en la tienda con nuestros nombres (solo los nombres)." })]), btn, msg);
    return caja;
  }

  // ---------- Invitados ----------
  // Cuadre de cupos, guardado automático, envío por fila y filas bloqueadas una vez enviadas.
  const ALFA = "abcdefghijkmnpqrstuvwxyz23456789";
  const nuevoId = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), v => ALFA[v % ALFA.length]).join("");
  const enlaceDe = i => `${P.enlaceGeneral}.${i.id}`;
  const fechaCorta = ts => new Date(ts * 1000).toLocaleDateString("es-PA", { day: "numeric", month: "short" });
  const svg = id => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;
  const telBonito = t => { const d = digits(t); return d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4)}` : d.length === 11 && d.startsWith("507") ? `+507 ${d.slice(3, 7)}-${d.slice(7)}` : (t || ""); };
  // Los contadores de las pestañas se actualizan al guardar, sin recargar.
  function contadores() {
    const nav = $("#pTabs"); if (!nav) return;
    [...nav.querySelectorAll("button")].forEach(b => {
      if (b.textContent.startsWith("Invitados (")) b.textContent = `Invitados (${P.invitados.length})`;
      else if (b.textContent.startsWith("Mesas (")) b.textContent = `Mesas (${(P.datos.mesas || []).length})`;
      else if (b.textContent.startsWith("Confirmaciones (")) b.textContent = `Confirmaciones (${P.totales.personas})`;
    });
  }
  function invitados(c) {
    if (!P.plan.listaInvitados) {
      c.append(el("div", { class: "p-card" }, [el("b", { text: "Su plan comparte un solo enlace con todos" }),
        el("p", { text: "Cópienlo en la pestaña «Su invitación» y envíenlo por WhatsApp. Las respuestas llegan a «Confirmaciones»." }),
        el("p", { class: "hint", html: `¿Quieren que cada invitado reciba la suya, con su nombre y sus cupos? Es parte del plan ${NP("clasico")}. <a href="https://wa.me/${WA}?text=${encodeURIComponent(`Hola, Miguel. Quiero pasar mi pedido ${P.codigo} al plan ${NP("clasico")}.`)}" target="_blank" rel="noopener">Escríbannos</a>.` })]));
      return;
    }
    const lista = P.invitados.map(i => ({ ...i }));
    const desbloqueados = new Set();
    const PLAN = P.plan;
    const conWa = (PLAN.canales || ["correo", "whatsapp"]).includes("whatsapp");
    const maxInv = PLAN.maxInvitaciones || 600;
    // Cupos que ocupa cada invitado: si respondió, lo que confirmó (0 si no va); si no, sus cupos.
    const ocupa = i => (i.rsvp ? (i.rsvp.asiste ? Math.min(+i.cupos || 0, i.rsvp.personas) : 0) : (+i.cupos || 0));
    let total = P.datos.cuposTotales || null;
    const conNombre = () => lista.filter(i => (i.nombre || "").trim());
    const bloqueada = i => Boolean(i.enviado_at) && !desbloqueados.has(i.id);

    // ----- Cuadre -----
    const totalIn = el("input", { type: "number", min: "1", max: "3000", inputmode: "numeric", value: total || "", placeholder: "150", "aria-label": `Total de invitados de ${EV().su}`, id: "cqTotal" });
    const relleno = el("i");
    const cqNum = el("div", { class: "cq-num", "aria-live": "polite" });
    const cqMsg = el("p", { class: "cq-msg" });
    const cqSub = el("p", { class: "cq-sub" });
    const cqLib = el("p", { class: "cq-lib", hidden: true });
    const cuadre = el("section", { class: "p-card cuadre", "aria-label": "Cuadre de cupos" }, [
      el("div", { class: "cq-top" }, [
        el("label", { class: "cq-total", for: "cqTotal" }, [el("span", { text: `Total de invitados de ${EV().su}` }), totalIn]),
        cqNum]),
      el("div", { class: "cq-barra", role: "progressbar", "aria-label": "Cupos asignados" }, [relleno]), cqMsg, cqLib, cqSub]);
    const asignados = () => conNombre().reduce((s, i) => s + ocupa(i), 0);
    const liberados = () => conNombre().reduce((s, i) => s + Math.max(0, (+i.cupos || 0) - ocupa(i)), 0);
    const pasado = () => total && asignados() > total;
    const pintarCuadre = () => {
      const a = asignados(), env = lista.filter(i => i.enviado_at), pEnv = env.reduce((s, i) => s + i.cupos, 0), porEnviar = conNombre().filter(i => !i.enviado_at).length;
      cuadre.classList.remove("exacto", "pasado", "sin-total");
      if (!total) {
        cuadre.classList.add("sin-total");
        cqNum.innerHTML = `<b>${a}</b><span>${a === 1 ? "cupo asignado" : "cupos asignados"}</span>`;
        cqMsg.textContent = "Escriban cuántas personas esperan en total y les llevamos la cuenta mientras reparten los cupos.";
        relleno.style.width = "0%";
      } else {
        const q = total - a;
        cqNum.innerHTML = `<b>${a}</b><span>de ${total}</span>`;
        relleno.style.width = `${Math.min(100, (a / total) * 100)}%`;
        cuadre.querySelector(".cq-barra").setAttribute("aria-valuenow", String(a)); cuadre.querySelector(".cq-barra").setAttribute("aria-valuemax", String(total));
        if (q > 0) cqMsg.textContent = `Les quedan ${q} ${q === 1 ? "cupo" : "cupos"} por asignar.`;
        else if (q === 0) { cuadre.classList.add("exacto"); cqMsg.textContent = "Cuadre perfecto: todos los cupos están asignados."; }
        else { cuadre.classList.add("pasado"); cqMsg.textContent = `Se pasaron por ${-q} ${q === -1 ? "cupo" : "cupos"}. Bajen cupos o suban el total para poder enviar.`; }
      }
      const lib = liberados(), n = conNombre().length;
      cqSub.textContent = `${env.length} ${env.length === 1 ? "invitación enviada" : "invitaciones enviadas"} (${pEnv} ${pEnv === 1 ? "persona" : "personas"}) · ${porEnviar} por enviar · ${n} de ${maxInv} invitaciones de su plan`;
      cqLib.hidden = !lib;
      cqLib.textContent = lib ? `${lib} ${lib === 1 ? "cupo quedó libre" : "cupos quedaron libres"} porque algunos invitados no van o van menos. Ya cuentan como disponibles: pueden dárselos a otra familia.` : "";
      lista.forEach(refrescarFila);
    };
    totalIn.addEventListener("input", () => { const v = Math.round(+totalIn.value); total = v >= 1 ? Math.min(3000, v) : null; pintarCuadre(); programar(); });

    // ----- Guardado automático -----
    const estadoG = el("span", { class: "autosave", "aria-live": "polite", text: "Todo guardado" });
    let timer = null, enCurso = null, otraVez = false;
    const programar = () => { estadoG.className = "autosave pend"; estadoG.textContent = "Guardando…"; clearTimeout(timer); timer = setTimeout(guardar, 800); };
    async function guardar() {
      clearTimeout(timer); timer = null;
      if (enCurso) { otraVez = true; return enCurso; }
      enCurso = (async () => {
        try {
          const R = await api("/love/api/invitados", { total, desbloqueados: [...desbloqueados],
            invitados: conNombre().map(i => ({ id: i.id, nombre: i.nombre, cupos: i.cupos, telefono: i.telefono, correo: i.correo, nota: i.nota, mesa: i.mesa })) });
          const porId = new Map(R.invitados.map(x => [x.id, x]));
          lista.forEach(i => { const x = porId.get(i.id); if (x) { i.enlace = x.enlace; i.enviado_at = x.enviado_at; i.enviado_por = x.enviado_por; i.abierto_at = x.abierto_at; i.rsvp = x.rsvp; i.guardado = true; } });
          P = { ...R }; contadores();
          estadoG.className = "autosave ok"; estadoG.textContent = "Todo guardado";
        } catch (e) { estadoG.className = "autosave mal"; estadoG.textContent = "No se pudo guardar"; aviso(e.message, true); }
        enCurso = null;
        pintarCuadre();
        if (otraVez) { otraVez = false; return guardar(); }
      })();
      return enCurso;
    }
    // Si cierran la pestaña con cambios pendientes, se los recordamos.
    window.onbeforeunload = () => (timer || enCurso ? true : undefined);

    // ----- Filas -----
    const tabla = el("div", { class: "p-tabla", role: "table", "aria-label": "Lista de invitados" });
    const cabecera = el("div", { class: "p-fila cab" + (PLAN.mesas ? " con-mesa" : ""), role: "row" }, ["Invitado o familia", "Cupos", conWa ? "WhatsApp" : "Teléfono", "Correo", ...(PLAN.mesas ? ["Mesa"] : []), "Estado", "Enviar"].map(t => el("span", { role: "columnheader", text: t })));
    const cuerpo = el("div", { role: "rowgroup" });
    const vacio = el("p", { class: "hint vacio", text: "Todavía no hay invitados. Agréguenlos uno por uno o péguenlos desde Excel." });
    const refs = new Map();

    function estadoTxt(i) {
      if (!i.guardado && !i.id) return ["", "Sin guardar"];
      if (i.rsvp) return [i.rsvp.asiste ? "si" : "no", i.rsvp.asiste ? (i.rsvp.personas < i.cupos ? `Confirmó ${i.rsvp.personas} de ${i.cupos}` : `Confirmó ${i.rsvp.personas}`) : "No asistirá"];
      if (i.abierto_at) return ["vista", "La abrió"];
      if (i.enviado_at) return ["env", `Enviada ${fechaCorta(i.enviado_at)}`];
      return ["", "Sin enviar"];
    }
    async function enviarCorreo(i, btn) {
      if (pasado()) { aviso(cqMsg.textContent, true); return; }
      if (!i.correo || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.correo)) { aviso(`Escriban un correo válido para ${i.nombre}.`, true); return; }
      if (P.estado !== "lista") { aviso("Su invitación todavía se está diseñando. En unos minutos pueden enviarla.", true); return; }
      btn.disabled = true; btn.classList.add("cargando");
      await guardar();
      try {
        const r = await api("/love/api/enviar", { canal: "correo", ids: [i.id] });
        if (!r.configurado) aviso("El envío por correo todavía no está activo. Usen WhatsApp por ahora.", true);
        else if (r.enviados) { i.enviado_at = Date.now() / 1000; i.enviado_por = "correo"; aviso(`Listo: ${i.nombre} ya tiene su invitación en su correo.`); }
        else aviso(`No pudimos enviarla a ${i.correo}. Revisen el correo e intenten de nuevo.`, true);
      } catch (e) { aviso(e.message, true); }
      btn.disabled = false; btn.classList.remove("cargando"); pintarCuadre();
    }
    function crearFila(i) {
      if (!i.id) i.id = nuevoId();
      const nombre = el("input", { class: "f-nombre", value: i.nombre || "", maxlength: "80", placeholder: "Ej.: Familia Castillo", "aria-label": "Nombre del invitado o familia" });
      const cuposIn = el("input", { class: "f-cupos", type: "number", min: "1", max: "20", inputmode: "numeric", value: i.cupos || 1, "aria-label": "Cupos" });
      const menos = el("button", { type: "button", class: "st", "aria-label": "Un cupo menos", text: "−" });
      const mas = el("button", { type: "button", class: "st", "aria-label": "Un cupo más", text: "+" });
      const stepper = el("div", { class: "stepper" }, [menos, cuposIn, el("span", { class: "st-lbl", text: "cupos" }), mas]);
      const tel = el("input", { class: "f-tel", value: telBonito(i.telefono), inputmode: "tel", placeholder: "WhatsApp 6000-0000", "aria-label": "WhatsApp" });
      const mail = el("input", { class: "f-mail", type: "email", value: i.correo || "", placeholder: "correo@ejemplo.com", "aria-label": "Correo" });
      const estado = el("span", { class: "est" });
      const acc = el("span", { class: "p-row-acc" });
      const MESAS = P.datos.mesas || [];
      let mesa = null;
      if (PLAN.mesas && MESAS.length) {
        mesa = el("select", { class: "f-mesa", "aria-label": "Mesa" }, [el("option", { value: "", text: "Sin mesa" }), ...MESAS.map(m => el("option", { value: m.n, text: m.n }))]);
        if (i.mesa && !MESAS.some(m => m.n === i.mesa)) mesa.append(el("option", { value: i.mesa, text: i.mesa }));
        mesa.value = i.mesa || "";
        mesa.addEventListener("change", () => { i.mesa = mesa.value; programar(); });
      } else if (PLAN.mesas) {
        mesa = el("input", { class: "f-mesa", value: i.mesa || "", maxlength: "30", placeholder: "Mesa", "aria-label": "Mesa", title: "Definan sus mesas en la pestaña «Mesas» para elegirlas de una lista" });
        mesa.addEventListener("input", () => { i.mesa = mesa.value; programar(); });
      }
      const nota = el("div", { class: "fila-nota", hidden: true });
      const fila = el("div", { class: "p-fila" + (mesa ? " con-mesa" : ""), role: "row" }, [nombre, stepper, tel, mail, mesa, estado, acc, nota]);
      const minimo = () => Math.max(1, i.rsvp && i.rsvp.asiste ? i.rsvp.personas : 1);
      const fijarCupos = v => { const n = Math.max(minimo(), Math.min(20, Math.round(+v) || 1)); i.cupos = n; cuposIn.value = n; if (+v < minimo()) aviso(`${i.nombre || "Este invitado"} ya confirmó ${minimo()} ${minimo() === 1 ? "persona" : "personas"}: no pueden darle menos cupos.`, true); pintarCuadre(); programar(); };
      menos.addEventListener("click", () => fijarCupos((+cuposIn.value || 1) - 1));
      mas.addEventListener("click", () => fijarCupos((+cuposIn.value || 1) + 1));
      cuposIn.addEventListener("change", () => fijarCupos(cuposIn.value));
      nombre.addEventListener("input", () => { i.nombre = nombre.value; pintarCuadre(); programar(); });
      tel.addEventListener("input", () => { i.telefono = tel.value; refrescarFila(i); programar(); });
      mail.addEventListener("input", () => { i.correo = mail.value; refrescarFila(i); programar(); });
      refs.set(i, { fila, nombre, cuposIn, menos, mas, tel, mail, estado, acc, nota });
      return fila;
    }
    function refrescarFila(i) {
      const r = refs.get(i); if (!r) return;
      const lock = bloqueada(i);
      r.fila.classList.toggle("locked", lock);
      [r.nombre, r.cuposIn, r.tel, r.mail, r.menos, r.mas].forEach(x => { x.disabled = lock; });
      r.tel.hidden = lock && !r.tel.value.trim(); r.mail.hidden = lock && !r.mail.value.trim();
      const [cls, txt] = estadoTxt(i);
      r.estado.className = `est ${cls}`;
      r.estado.innerHTML = (lock ? svg("i-lock") : "") + `<span>${txt}</span>`;
      r.acc.textContent = "";
      const listo = i.guardado && (i.nombre || "").trim() && !timer && !enCurso;
      const tieneWa = waNum(i.telefono), tieneMail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.correo || "");
      if ((i.nombre || "").trim()) {
        if (tieneWa && conWa) {
          const a = el("a", { class: "chip-wa" + (listo && !pasado() ? "" : " off"), href: `https://wa.me/${waNum(i.telefono)}?text=${encodeURIComponent(textoWa({ ...i, enlace: enlaceDe(i) }))}`, target: "_blank", rel: "noopener",
            title: i.enviado_at ? "Reenviar por WhatsApp" : "Enviar por WhatsApp", "aria-label": `${i.enviado_at ? "Reenviar" : "Enviar"} a ${i.nombre} por WhatsApp`, html: svg("i-wa") });
          a.addEventListener("click", ev => {
            if (pasado()) { ev.preventDefault(); aviso(cqMsg.textContent, true); return; }
            if (!listo) { ev.preventDefault(); aviso("Un segundo: estamos guardando la lista. Intenten de nuevo.", true); return; }
            if (P.estado !== "lista") { ev.preventDefault(); aviso("Su invitación todavía se está diseñando. En unos minutos pueden enviarla.", true); return; }
            api("/love/api/enviar", { canal: "whatsapp", ids: [i.id] }).then(() => { if (!i.enviado_at) { i.enviado_at = Date.now() / 1000; i.enviado_por = "whatsapp"; } desbloqueados.delete(i.id); pintarCuadre(); }).catch(e => aviso(e.message, true));
          });
          r.acc.append(a);
        }
        if (tieneMail) r.acc.append(el("button", { class: "chip-mail" + (pasado() ? " off" : ""), type: "button", title: i.enviado_at ? "Reenviar por correo" : "Enviar por correo", "aria-label": `${i.enviado_at ? "Reenviar" : "Enviar"} a ${i.nombre} por correo`, html: svg("i-mail"), onclick: e => enviarCorreo(i, e.currentTarget) }));
        if (!conWa && !tieneMail && !lock) r.acc.append(el("span", { class: "hint mini", text: "Agreguen su correo para enviarla" }));
        else if (!tieneWa && !tieneMail && !lock) r.acc.append(el("span", { class: "hint mini", text: "Agreguen WhatsApp o correo" }));
        if (i.guardado) r.acc.append(el("button", { class: "chip-s", type: "button", text: "Enlace", title: "Copiar su enlace personal", onclick: e => copiar(enlaceDe(i), e.currentTarget) }));
      }
      if (lock) r.acc.append(el("button", { class: "chip-s ghost", type: "button", text: "Editar", "aria-label": `Editar la invitación de ${i.nombre}`, onclick: () => pedirEdicion(i) }));
      else r.acc.append(el("button", { class: "rm", type: "button", "aria-label": `Quitar a ${i.nombre || "este invitado"}`, html: svg("i-x"), onclick: () => quitar(i) }));
    }
    function pedirEdicion(i) {
      const r = refs.get(i);
      r.nota.hidden = false; r.nota.textContent = "";
      r.nota.append(el("p", { text: `${i.nombre} ya recibió su invitación. Si cambian sus datos o sus cupos, lo verá con el mismo enlace la próxima vez que lo abra.` }),
        el("div", { class: "p-acc" }, [
          el("button", { class: "btn sm", type: "button", text: "Editar igual", onclick: () => { desbloqueados.add(i.id); r.nota.hidden = true; refrescarFila(i); r.nombre.focus(); } }),
          el("button", { class: "link", type: "button", text: "Cancelar", onclick: () => { r.nota.hidden = true; } })]));
    }
    function quitar(i) {
      if (i.rsvp && !confirm(`${i.nombre} ya respondió. Si lo quitan, se borra su respuesta. ¿Quitarlo igual?`)) return;
      if (i.enviado_at && !confirm(`${i.nombre} ya recibió su invitación y su enlace dejará de funcionar. ¿Quitarlo igual?`)) return;
      lista.splice(lista.indexOf(i), 1); refs.get(i)?.fila.remove(); refs.delete(i);
      vacio.hidden = lista.length > 0; pintarCuadre(); programar();
    }
    const agregar = (datos = {}, foco = true) => {
      if (conNombre().length >= maxInv && lista.some(x => !(x.nombre || "").trim()) === false && lista.length >= maxInv) { aviso(`Su plan ${PLAN.nombre} incluye hasta ${maxInv} invitaciones. Escríbannos para pasar a un plan con más.`, true); return null; }
      const i = { nombre: "", cupos: 1, telefono: "", correo: "", ...datos, id: nuevoId() };
      lista.push(i); cuerpo.append(crearFila(i)); vacio.hidden = true;
      if (foco) refs.get(i).nombre.focus();
      vacio.hidden = true;
      return i;
    };
    lista.forEach(i => { i.guardado = true; cuerpo.append(crearFila(i)); });
    vacio.hidden = lista.length > 0;
    tabla.append(cabecera, cuerpo, vacio);

    const pegar = el("textarea", { rows: "4", placeholder: "Peguen aquí desde Excel o escriban una por línea:\nFamilia Castillo, 3, 6000-0000, castillo@correo.com\nMiguel Capuro, 1, , miguel@correo.com" });
    const porEnviarCorreo = () => lista.filter(i => i.guardado && /@/.test(i.correo || "") && !i.enviado_at).length;
    const masivo = el("button", { class: "btn", type: "button", html: `Enviar por correo a los que faltan ${arrow}` });
    masivo.addEventListener("click", async () => {
      if (pasado()) { aviso(cqMsg.textContent, true); return; }
      await guardar();
      const n = porEnviarCorreo();
      if (!n) { aviso("No hay invitaciones por correo pendientes."); return; }
      if (!confirm(`¿Enviar ${n} ${n === 1 ? "invitación" : "invitaciones"} por correo ahora?`)) return;
      masivo.disabled = true; masivo.textContent = "Enviando…";
      try { const r = await api("/love/api/enviar", {}); aviso(r.configurado ? `Listo: enviamos ${r.enviados} ${r.enviados === 1 ? "invitación" : "invitaciones"}.${r.fallos.length ? ` No salieron: ${r.fallos.join(", ")}.` : ""}` : "El envío por correo todavía no está activo. Usen WhatsApp por ahora.", !r.configurado); P = await api("/love/api/portal"); pintar(); }
      catch (x) { aviso(x.message, true); masivo.disabled = false; masivo.innerHTML = `Enviar por correo a los que faltan ${arrow}`; }
    });
    c.append(...[
      cuadre,
      el("div", { class: "p-acc barra-inv" }, [el("button", { class: "btn sm", type: "button", text: "+ Agregar invitado", onclick: () => { agregar(); pintarCuadre(); } }), estadoG,
        el("button", { class: "link", type: "button", text: "Descargar en Excel (CSV)", onclick: descargarCSV })]),
      el("p", { class: "hint", text: "Todo se guarda solo. Pueden cerrar y volver cuando quieran con el enlace de su correo. Al enviar una invitación, su fila queda bloqueada para que no se cambie por error." }),
      tabla,
      el("details", { class: "p-card" }, [el("summary", { text: "Pegar varios desde Excel" }), el("p", { class: "hint", text: "Columnas: nombre, cupos, WhatsApp, correo. Separadas por coma o tabulación." }), pegar,
        el("button", { class: "btn sm", type: "button", text: "Agregar a la lista", onclick: () => {
          let n = 0;
          pegar.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(l => {
            const partes = (l.includes("\t") ? l.split("\t") : l.split(/[;,]/)).map(x => x.trim());
            const correo = partes.find(x => /@/.test(x)) || "";
            const resto = partes.filter(x => x !== correo);
            const nombre = resto.shift() || "";
            const cuposTxt = resto.find(x => /^\d{1,2}$/.test(x));
            const telefono = resto.find(x => x !== cuposTxt && digits(x).length >= 7) || "";
            if (nombre && agregar({ nombre, cupos: Math.max(1, Math.min(20, parseInt(cuposTxt, 10) || 1)), telefono, correo }, false)) n++;
          });
          pegar.value = ""; pintarCuadre(); programar(); aviso(n ? `Agregamos ${n} ${n === 1 ? "invitado" : "invitados"}.` : "No encontramos nombres en lo que pegaron.", !n);
        } })]),
      el("div", { class: "p-card" }, [el("b", { text: "Enviar todas por correo" }),
        el("p", { text: conWa ? "Les llega a nombre de ustedes, con su enlace personal. Para los que no tienen correo, usen el botón verde de WhatsApp de su fila." : "Les llega a nombre de ustedes, con su enlace personal." }),
        el("div", { class: "p-acc" }, [masivo])]),
      PLAN.recordatorios ? tarjetaRecordatorio() : null,
      !conWa ? el("div", { class: "p-card upsell" }, [el("b", { text: "¿Prefieren enviarlas por WhatsApp?" }),
        el("p", { text: `Con el plan ${NP("clasico")}, cada invitación sale por WhatsApp con un toque, con el nombre y los cupos ya escritos. También suben a 150 invitaciones.` }),
        el("a", { class: "btn sm", href: `https://wa.me/${WA}?text=${encodeURIComponent(`Hola, Miguel. Quiero pasar mi pedido ${P.codigo} al plan ${NP("clasico")}.`)}`, target: "_blank", rel: "noopener", text: `Pasar al plan ${NP("clasico")}` })]) : null,
    ].filter(Boolean));
    pintarCuadre();
  }
  // Premium: recordatorios por correo a quienes ya recibieron su invitación y no han respondido.
  // Salen solos 7 y 2 días antes del cierre de confirmaciones; además pueden mandar uno cuando quieran (uno por día).
  const diaCorto = f => new Date(f + "T12:00:00").toLocaleDateString("es-PA", { day: "numeric", month: "short" });
  function tarjetaRecordatorio() {
    const R = P.recordatorios || { auto: true, fechas: [], hechos: 0 };
    const pendientes = P.invitados.filter(i => i.enviado_at && !i.rsvp && /@/.test(i.correo || "")).length;
    const hace = P.recordatorioAt ? Math.round((Date.now() / 1000 - P.recordatorioAt) / 3600) : null;
    const btn = el("button", { class: "btn sm", type: "button", html: `Recordar ahora a ${pendientes} ${pendientes === 1 ? "invitado" : "invitados"} ${arrow}`, disabled: !pendientes || (hace !== null && hace < 24) });
    btn.addEventListener("click", async () => {
      if (!confirm(`¿Enviar ahora un recordatorio por correo a ${pendientes} ${pendientes === 1 ? "invitado que no ha respondido" : "invitados que no han respondido"}?`)) return;
      btn.disabled = true; btn.textContent = "Enviando…";
      try { const r = await api("/love/api/recordar", {}); aviso(r.configurado ? `Listo: enviamos ${r.enviados} ${r.enviados === 1 ? "recordatorio" : "recordatorios"}.` : "El envío por correo todavía no está activo.", !r.configurado); P.recordatorioAt = Date.now() / 1000; btn.textContent = "Recordatorio enviado hoy"; }
      catch (e) { aviso(e.message, true); btn.disabled = false; btn.innerHTML = `Recordar ahora ${arrow}`; }
    });
    const auto = el("input", { type: "checkbox", id: "recAuto", ...(R.auto ? { checked: true } : {}) });
    auto.addEventListener("change", async () => {
      try { P = await api("/love/api/mesas", { recordatorioAuto: auto.checked }); aviso(auto.checked ? "Listo: los recordatorios automáticos están encendidos." : "Apagamos los recordatorios automáticos."); }
      catch (e) { aviso(e.message, true); auto.checked = !auto.checked; }
    });
    const proximas = R.fechas.map((f, k) => `${diaCorto(f)}${k < R.hechos ? " (enviado)" : ""}`);
    return el("div", { class: "p-card rec-card" }, [el("b", { text: "Recordatorios a quienes no han respondido" }),
      el("label", { class: "check rec-auto" }, [auto, el("span", { html: R.fechas.length ? `<b>Automáticos.</b> Les escribimos solos el <b>${proximas.join("</b> y el <b>")}</b>: 7 y 2 días antes de que cierre la confirmación (${diaCorto(R.cierre)}). Solo a quienes recibieron su invitación por correo y no han respondido.` : "<b>Automáticos.</b> Les escribimos solos 7 y 2 días antes de que cierre la confirmación." })]),
      el("p", { class: "hint", text: pendientes ? `Hoy ${pendientes === 1 ? "hay 1 invitado" : `hay ${pendientes} invitados`} sin responder. También pueden recordarles ahora, una vez por día.` : "Por ahora nadie tiene pendiente responder (de los que recibieron su invitación por correo)." }),
      hace !== null && hace < 24 ? el("p", { class: "hint", text: "Ya enviaron un recordatorio hoy. Pueden enviar otro mañana." }) : null,
      el("div", { class: "p-acc" }, [btn])]);
  }

  // ----- Mesas (Premium): definen las mesas arriba y sientan a cada familia; ven cuántos caben en cada una. -----
  function mesas(c) {
    let M = (P.datos.mesas || []).map(m => ({ ...m }));
    const inv = P.invitados.map(i => ({ ...i }));
    const ocupa = i => (i.rsvp ? (i.rsvp.asiste ? Math.min(+i.cupos || 0, i.rsvp.personas) : 0) : (+i.cupos || 0));
    const sentados = n => inv.filter(i => i.mesa === n);
    const usados = n => sentados(n).reduce((a, i) => a + ocupa(i), 0);
    let renombrar = {}, asignar = new Map(), timer = null;
    const estado = el("span", { class: "autosave", "aria-live": "polite", text: "Todo guardado" });
    const guardar = async () => {
      timer = null;
      const body = { mesas: M, renombrar, asignar: [...asignar].map(([id, mesa]) => ({ id, mesa })) };
      renombrar = {}; asignar = new Map();
      try { P = await api("/love/api/mesas", body); contadores(); estado.className = "autosave ok"; estado.textContent = "Todo guardado"; }
      catch (e) { estado.className = "autosave mal"; estado.textContent = "No se pudo guardar"; aviso(e.message, true); }
    };
    const programar = () => { estado.className = "autosave pend"; estado.textContent = "Guardando…"; clearTimeout(timer); timer = setTimeout(guardar, 700); };
    window.onbeforeunload = () => (timer ? true : undefined);

    // Arriba: crear las mesas de una vez
    const cant = el("input", { type: "number", min: "1", max: "120", inputmode: "numeric", value: M.length || "", placeholder: "15", id: "mzCant" });
    const cap = el("input", { type: "number", min: "1", max: "40", inputmode: "numeric", value: M[0]?.c || 10, id: "mzCap" });
    const crear = el("button", { class: "btn sm", type: "button", text: M.length ? "Ajustar mesas" : "Crear mesas" });
    crear.addEventListener("click", () => {
      const n = Math.min(120, Math.max(1, Math.round(+cant.value) || 0)), k = Math.min(40, Math.max(1, Math.round(+cap.value) || 10));
      if (!+cant.value) { aviso("Escriban cuántas mesas tendrán.", true); cant.focus(); return; }
      if (n < M.length) {
        const sobran = M.slice(n).filter(m => sentados(m.n).length);
        if (sobran.length && !confirm(`Las mesas ${sobran.map(m => m.n).join(", ")} tienen invitados sentados: quedarán «sin mesa». ¿Seguir?`)) return;
        M.slice(n).forEach(m => sentados(m.n).forEach(i => { i.mesa = ""; asignar.set(i.id, ""); }));
        M = M.slice(0, n);
      }
      M.forEach(m => { m.c = k; });
      for (let x = M.length; x < n; x++) { let nom = `Mesa ${x + 1}`, z = x + 1; while (M.some(m => m.n === nom)) nom = `Mesa ${++z}`; M.push({ n: nom, c: k }); }
      programar(); dibujar();
    });
    const capTotal = el("b"), resumen = el("p", { class: "mz-res", "aria-live": "polite" });
    const arriba = el("section", { class: "p-card mz-top" }, [
      el("b", { text: "Sus mesas" }),
      el("div", { class: "mz-form" }, [
        el("label", { class: "field", for: "mzCant" }, [el("span", { text: "¿Cuántas mesas?" }), cant]),
        el("label", { class: "field", for: "mzCap" }, [el("span", { text: "Personas por mesa" }), cap]),
        crear]),
      resumen,
      el("p", { class: "hint", text: "Después cambian el nombre o la capacidad de cualquier mesa (por ejemplo, «Mesa de honor» para 12). Cada invitado ve su mesa en la invitación cuando confirma." })]);

    const grilla = el("div", { class: "mz-grilla" });
    const sinMesa = el("section", { class: "p-card mz-sin" });
    const opciones = (actual) => [el("option", { value: "", text: "Sin mesa" }), ...M.map(m => { const q = m.c - usados(m.n); return el("option", { value: m.n, text: `${m.n} (${q >= 0 ? `${q} libres` : `+${-q}`})` }); })].map(o => { if (o.value === (actual || "")) o.selected = true; return o; });
    const mover = (i, nueva) => { i.mesa = nueva; asignar.set(i.id, nueva); programar(); dibujar(); };
    const filaInv = (i) => {
      const sel = el("select", { "aria-label": `Mesa de ${i.nombre}` }, opciones(i.mesa));
      sel.addEventListener("change", () => mover(i, sel.value));
      const n = ocupa(i);
      return el("li", { class: "mz-inv" + (i.rsvp && !i.rsvp.asiste ? " no-va" : "") }, [el("span", { class: "mz-nom" }, [el("b", { text: i.nombre }), el("small", { text: i.rsvp ? (i.rsvp.asiste ? `confirmó ${n}` : "no asistirá") : `${n} ${n === 1 ? "cupo" : "cupos"}` })]), sel]);
    };
    function dibujar() {
      const capacidad = M.reduce((a, m) => a + m.c, 0), personas = inv.reduce((a, i) => a + ocupa(i), 0), conMesa = inv.filter(i => i.mesa && M.some(m => m.n === i.mesa)).reduce((a, i) => a + ocupa(i), 0);
      resumen.innerHTML = M.length ? `<b>${M.length}</b> mesas · <b>${capacidad}</b> sillas · <b>${conMesa}</b> de ${personas} personas sentadas${personas - conMesa ? ` · faltan ${personas - conMesa}` : " · ¡todos tienen mesa!"}${capacidad < personas ? ` · <span class="mal">faltan ${personas - capacidad} sillas</span>` : ""}` : "Escriban cuántas mesas tendrán y cuántas personas caben en cada una.";
      crear.textContent = M.length ? "Ajustar mesas" : "Crear mesas";
      grilla.replaceChildren(...M.map((m, k) => {
        const u = usados(m.n), q = m.c - u;
        const nom = el("input", { class: "mz-n", value: m.n, maxlength: "30", "aria-label": "Nombre de la mesa" });
        nom.addEventListener("change", () => {
          const v = nom.value.trim().slice(0, 30);
          if (!v || M.some((x, j) => j !== k && x.n.toLowerCase() === v.toLowerCase())) { aviso(v ? "Ya hay una mesa con ese nombre." : "La mesa necesita un nombre.", true); nom.value = m.n; return; }
          if (v === m.n) return;
          renombrar[m.n] = v; inv.forEach(i => { if (i.mesa === m.n) i.mesa = v; }); m.n = v; programar(); dibujar();
        });
        const capIn = el("input", { class: "mz-c", type: "number", min: "1", max: "40", value: m.c, "aria-label": `Capacidad de ${m.n}` });
        capIn.addEventListener("change", () => { m.c = Math.min(40, Math.max(1, Math.round(+capIn.value) || m.c)); programar(); dibujar(); });
        const quitarM = el("button", { class: "rm", type: "button", "aria-label": `Quitar ${m.n}`, html: svg("i-x") });
        quitarM.addEventListener("click", () => {
          if (sentados(m.n).length && !confirm(`${m.n} tiene ${sentados(m.n).length} ${sentados(m.n).length === 1 ? "invitado" : "invitados"}: quedarán sin mesa. ¿Quitarla?`)) return;
          sentados(m.n).forEach(i => { i.mesa = ""; asignar.set(i.id, ""); }); M.splice(k, 1); cant.value = M.length || ""; programar(); dibujar();
        });
        const lista = sentados(m.n);
        return el("article", { class: "mz-mesa" + (q < 0 ? " pasada" : q === 0 ? " llena" : "") }, [
          el("header", {}, [nom, el("span", { class: "mz-cap" }, [el("b", { text: String(u) }), el("span", { text: " de " }), capIn]), quitarM]),
          el("div", { class: "mz-barra" }, [el("i", { style: `width:${Math.min(100, m.c ? (u / m.c) * 100 : 0)}%` })]),
          el("p", { class: "mz-q", text: q > 0 ? `${q} ${q === 1 ? "silla libre" : "sillas libres"}` : q === 0 ? "Mesa completa" : `Se pasa por ${-q}` }),
          lista.length ? el("ul", { class: "mz-l" }, lista.map(filaInv)) : el("p", { class: "hint", text: "Nadie sentado todavía." })]);
      }));
      const libres = inv.filter(i => !i.mesa || !M.some(m => m.n === i.mesa)).filter(i => !(i.rsvp && !i.rsvp.asiste));
      sinMesa.replaceChildren(el("b", { text: `Sin mesa (${libres.length})` }),
        !inv.length ? el("p", { class: "hint", text: "Primero agreguen a sus invitados en la pestaña «Invitados»." })
          : libres.length ? el("ul", { class: "mz-l" }, libres.map(filaInv)) : el("p", { class: "hint", text: "Todos sus invitados tienen mesa." }));
      sinMesa.hidden = !M.length;
    }
    c.append(arriba, el("div", { class: "p-acc barra-inv" }, [estado]), sinMesa, grilla);
    dibujar();
  }

  const textoWa = i => `Hola, ${i.nombre} 💌 ${invita(P.datos)}${P.datos.fecha ? ` el ${Motor.longDate(P.datos.fecha)}` : ""}. Su invitación es para ${i.cupos} ${i.cupos === 1 ? "persona" : "personas"}. Ábranla y confirmen aquí: ${i.enlace}`;
  function descargarCSV() {
    const filas = [["Invitado", "Cupos", "WhatsApp", "Correo", "Respuesta", "Personas", "Nombres", "Alergias", "Mensaje", "Enlace"]];
    P.invitados.forEach(i => filas.push([i.nombre, i.cupos, i.telefono, i.correo, i.rsvp ? (i.rsvp.asiste ? "Sí" : "No") : "Pendiente", i.rsvp ? i.rsvp.personas : "", i.rsvp?.nombres || "", i.rsvp?.alergias || "", i.rsvp?.mensaje || "", i.enlace]));
    P.generales.forEach(r => filas.push([r.nombre + " (enlace general)", "", "", "", r.asiste ? "Sí" : "No", r.personas, r.nombres || "", r.alergias || "", r.mensaje || "", ""]));
    const csv = "﻿" + filas.map(f => f.map(x => `"${String(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    el("a", { href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })), download: `invitados-${P.codigo}.csv` }).click();
  }

  // ---------- Confirmaciones ----------
  function respuestas(c) {
    c.append(totales());
    const todas = [...P.invitados.filter(i => i.rsvp).map(i => ({ ...i.rsvp, nombre: i.nombre, cupos: i.cupos })), ...P.generales.map(r => ({ ...r, general: true }))].sort((a, b) => b.ts - a.ts);
    if (!todas.length) { c.append(el("p", { class: "hint", text: "Todavía no hay respuestas. Aparecen aquí apenas alguien confirme." })); return; }
    c.append(el("div", { class: "p-resp" }, todas.map(r => el("article", { class: "p-card " + (r.asiste ? "si" : "no") }, [
      el("div", { class: "p-resp-h" }, [el("b", { text: r.nombre }), el("span", { class: "est " + (r.asiste ? "si" : "no"), text: r.asiste ? `Van ${r.personas}${r.cupos ? ` de ${r.cupos}` : ""}` : "No van" })]),
      r.general ? el("small", { class: "hint", text: "Por el enlace general" }) : null,
      r.nombres ? el("p", { text: `Quiénes: ${r.nombres}` }) : null, r.alergias ? el("p", { text: `Alergias: ${r.alergias}` }) : null, r.mensaje ? el("p", { class: "p-msg", text: `“${r.mensaje}”` }) : null]))),
      el("button", { class: "link", type: "button", text: "Descargar en Excel (CSV)", onclick: descargarCSV }));
  }

  // ---------- Corregir datos (gratis) ----------
  function formDatos(c) {
    const d = JSON.parse(JSON.stringify(P.datos));
    const f = el("form", { class: "p-form", novalidate: true });
    const campo = (label, name, attrs = {}) => {
      const v = name.split(".").reduce((o, k) => (o ? o[k] : ""), d) ?? "";
      const i = attrs.area ? el("textarea", { name, rows: "2", maxlength: attrs.maxlength || "300" }) : el("input", { name, ...attrs });
      if (attrs.type === "checkbox") i.checked = !!v; else i.value = v;
      return el("label", { class: "field" }, [el("span", { text: label }), i]);
    };
    const row = (...k) => el("div", { class: "row2" }, k);
    f.append(
      el("p", { class: "hint", text: "Corregir datos es gratis y no gasta la ronda de ajustes. Sus invitados ven los cambios al instante, con el mismo enlace." }),
      EV().dos || EV().empresa ? row(campo(EV().l1, "nombre1", { maxlength: "40" }), campo(EV().l2, "nombre2", { maxlength: "40" })) : campo(EV().l1, "nombre1", { maxlength: "40" }),
      campo("Su frase", "frase", { maxlength: "120" }),
      row(campo("Fecha", "fecha", { type: "date", min: hoy(), max: maxF() }), campo("Hora", "hora", { type: "time" })),
      row(campo("Lugar", "lugar", { maxlength: "80" }), campo("Dirección", "direccion", { maxlength: "160" })),
      campo("Enlace de Google Maps", "mapa", { type: "url" }),
      row(campo("Recepción (lugar)", "recepcion.lugar", { maxlength: "80" }), campo("Recepción (hora)", "recepcion.hora", { type: "time" })),
      row(campo("Recepción (dirección)", "recepcion.direccion", { maxlength: "160" }), campo("Recepción (mapa)", "recepcion.mapa", { type: "url" })),
      EV().campos === "pareja" ? row(campo("Padres de " + d.nombre1, "padres1", { maxlength: "120" }), campo("Padres de " + d.nombre2, "padres2", { maxlength: "120" })) : EV().campos === "padres" ? campo("Padres de " + d.nombre1, "padres1", { maxlength: "120" }) : EV().campos === "hijos" ? campo("Sus hijos", "padres1", { maxlength: "120" }) : null,
      campo("Código de vestimenta", "vestimenta", { maxlength: "200" }),
      campo("Regalos", "regalos", { area: true, maxlength: "300" }),
      row(campo("Yappy para regalos", "regalosYappy", { maxlength: "30" }), campo("Confirmar antes del", "fechaLimite", { type: "date", min: hoy(), max: maxF() })),
      el("label", { class: "check" }, [el("input", { type: "checkbox", name: "soloAdultos", ...(d.soloAdultos ? { checked: true } : {}) }), el("span", { text: "Solo adultos" })]),
      el("p", { class: "w-error", role: "alert" }),
      el("button", { class: "btn", type: "submit", html: `Guardar cambios ${arrow}` }),
    );
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const err = $(".w-error", f); err.textContent = "";
      const nuevo = { recepcion: { ...(d.recepcion || {}) } };
      $$("[name]", f).forEach(i => { const v = i.type === "checkbox" ? i.checked : i.value.trim(); if (i.name.startsWith("recepcion.")) nuevo.recepcion[i.name.split(".")[1]] = v; else nuevo[i.name] = v; });
      if (!nuevo.recepcion.lugar) nuevo.recepcion = null;
      if (nuevo.fecha < hoy()) { err.textContent = "La fecha no puede estar en el pasado."; return; }
      if (nuevo.fecha > maxF()) { err.textContent = "La fecha no puede ser a más de 10 años."; return; }
      const b = $("button[type=submit]", f); b.disabled = true; b.textContent = "Guardando…";
      try { P = await api("/love/api/datos", { datos: nuevo }); aviso("Datos actualizados. Sus invitados ya ven los cambios."); tab = "invitacion"; pintar(); }
      catch (x) { err.textContent = x.message; b.disabled = false; b.innerHTML = `Guardar cambios ${arrow}`; }
    });
    c.append(f);
  }

  // ---------- Pedir cambios de diseño ----------
  // Premium: cambiar de modelo con un toque. Gratis, sin gastar la ronda; los enlaces ya enviados muestran el modelo nuevo.
  function selectorModelo() {
    const orden = { esencial: 0, clasico: 1, premium: 2 };
    const disponibles = (window.MODELOS || []).filter(m => (orden[P.plan.id] ?? 0) >= (orden[m.plan || "esencial"] ?? 0));
    const grid = el("div", { class: "mod-grid", role: "radiogroup", "aria-label": "Modelo" });
    disponibles.forEach(m => {
      const actual = m.id === P.modelo;
      const b = el("button", { type: "button", class: "mod-op" + (actual ? " on" : ""), role: "radio", "aria-checked": String(actual), "aria-label": m.name }, [
        el("img", { src: Motor.asset(m, "sobre", true), alt: "", loading: "lazy" }), el("span", { text: m.name })]);
      b.addEventListener("click", async () => {
        if (actual || P.disenando) return;
        const enviadas = P.invitados.filter(i => i.enviado_at).length;
        if (!confirm(`¿Cambiar su invitación al modelo ${m.name}?${enviadas ? ` Las ${enviadas} invitaciones que ya enviaron se verán con el modelo nuevo, con el mismo enlace: no hay que reenviarlas.` : ""} Sus textos y datos se quedan igual.`)) return;
        grid.classList.add("cargando");
        try { P = await api("/love/api/modelo", { modelo: m.id }); aviso(`Listo: su invitación ahora es ${m.name}.`); tab = "invitacion"; pintar(); }
        catch (e) { aviso(e.message, true); grid.classList.remove("cargando"); }
      });
      grid.append(b);
    });
    return el("div", { class: "p-card" }, [el("b", { text: "Cambiar de modelo" }),
      el("p", { class: "hint", text: "Gratis y al instante, las veces que quieran. Toman los colores, las letras y la apertura del modelo nuevo; sus textos, fotos y lista se quedan igual. Las invitaciones ya enviadas se actualizan solas, con el mismo enlace." }), grid]);
  }
  function cambios(c) {
    const r = P.revisiones;
    if (P.plan.cambiarModelo) c.append(selectorModelo());
    c.append(el("div", { class: "kpis" }, [kpi(r.quedan, r.quedan === 1 ? "ronda de ajustes disponible" : "rondas de ajustes disponibles"), kpi(r.usadas, "usadas")]));
    if (r.quedan > 0) {
      const t = el("textarea", { rows: "5", maxlength: "2000", placeholder: "Escriban todo en un solo mensaje. Ej.: la frase de la portada más corta, una bienvenida más alegre, el programa antes que el mapa." });
      const b = el("button", { class: "btn", type: "button", html: `Enviar cambios ${arrow}`, disabled: P.disenando });
      b.addEventListener("click", async () => {
        if (t.value.trim().length < 4) { aviso("Cuéntennos qué quieren cambiar.", true); return; }
        if (!confirm(r.quedan === 1 ? "Esto usa su ronda de ajustes. ¿Enviar?" : `Esto usa 1 de sus ${r.quedan} rondas de ajustes. ¿Enviar?`)) return;
        b.disabled = true; b.textContent = "Enviando…";
        try { const j = await api("/love/api/revision", { cambios: t.value }); aviso(j.mensaje); P = await api("/love/api/portal"); pintar(); }
        catch (x) { aviso(x.message, true); b.disabled = false; b.innerHTML = `Enviar cambios ${arrow}`; }
      });
      c.append(el("div", { class: "p-card" }, [el("b", { text: "¿Qué textos quieren ajustar?" }),
        el("p", { class: "hint", text: "La ronda es para textos y el orden de las secciones. Los colores y el estilo vienen con el modelo" + (P.plan.cambiarModelo ? ": para cambiarlos, elijan otro modelo arriba, gratis." : ".") + " Para corregir nombres, fecha o lugar usen «Corregir datos»: es gratis." }), t, b]));
    } else {
      c.append(el("div", { class: "p-card" }, [el("b", { text: "Ya usaron su ronda de ajustes" }), el("p", { text: `Cada ronda adicional cuesta $${r.precioExtra}.` }),
        el("a", { class: "btn gold", href: `https://wa.me/${WA}?text=${encodeURIComponent(`Hola, Miguel. Quiero otra ronda de ajustes para mi pedido ${P.codigo}.`)}`, target: "_blank", rel: "noopener", html: `Pedir otra ronda ${arrow}` })]));
    }
    if (P.historial.length) c.append(el("div", { class: "p-hist" }, [el("span", { class: "label", text: "Historial" }), ...P.historial.map(h => el("div", { class: "p-hist-i" }, [
      el("small", { text: new Date(h.ts * 1000).toLocaleString("es-PA", { dateStyle: "medium", timeStyle: "short" }) + (h.version ? ` · versión ${h.version}` : "") }),
      el("p", { text: h.tipo === "revision" ? `Pidieron: ${h.texto}` : h.texto }), h.resumen ? el("p", { class: "hint", text: h.resumen }) : null]))]));
  }

  addEventListener("hashchange", () => location.reload());
  cargar();
})();
