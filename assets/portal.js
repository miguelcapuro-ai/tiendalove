/* Mejorativa Love · portal de los novios. Se entra con el enlace privado del correo: /portal/#id.clave */
(() => {
  "use strict";
  const API = (window.LOVE.api || "").replace(/\/$/, "");
  const WA = window.LOVE.whatsapp || "50766653528";
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
  let P = null, tab = sessionStorage.getItem("ml-tab") || "invitacion", tPoll = null;

  async function api(path, body) {
    const r = await fetch(API + path + (body ? "" : `?id=${encodeURIComponent(id)}&key=${encodeURIComponent(key)}`),
      body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, key, ...body }) } : undefined);
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) { const e = new Error(j.mensaje || "Algo falló. Intenten de nuevo."); e.status = r.status; throw e; }
    return j;
  }
  function aviso(t, mal) { const a = $("#pAviso"); a.textContent = t; a.className = "p-aviso" + (mal ? " mal" : ""); a.hidden = !t; if (t) setTimeout(() => { if (a.textContent === t) a.hidden = true; }, 7000); }

  async function cargar() {
    if (!id || !key) return fallo("Este enlace no está completo", "Ábranlo desde el correo que les enviamos.");
    try { P = await api("/love/api/portal"); pintar(); }
    catch (e) { fallo(e.status === 410 ? "Esta invitación ya cumplió su tiempo" : "No pudimos abrir su portal", e.message); }
  }
  function fallo(t, m) { $("#pTitulo").textContent = t; $("#pLead").textContent = m; }

  function pintar() {
    const d = P.datos;
    $("#pCodigo").textContent = `Pedido ${P.codigo}`;
    $("#pTitulo").textContent = `Hola, ${d.nombre1} y ${d.nombre2}.`;
    $("#pEtapa").textContent = P.etapa;
    clearInterval(tPoll);
    if (!P.pagado) {
      $("#pLead").textContent = "Su pedido está esperando el pago.";
      $("#pTabs").hidden = true;
      const msg = `Hola, Miguel. Somos ${d.nombre1} y ${d.nombre2}. Pedido ${P.codigo} por $${P.plan.precio}. Aquí va el comprobante de Yappy.`;
      $("#pCuerpo").innerHTML = `<div class="pay" style="max-width:620px"><div class="price">$${P.plan.precio}<small>plan ${esc(P.plan.nombre)}</small></div><div class="manual-ok"><span class="label" style="color:#A9B6CB">Su código</span><div class="code">${esc(P.codigo)}</div>
        <ol><li>Envíen <b>$${P.plan.precio}</b> por Yappy al <b>6665-3528</b> con el código en la descripción.</li><li>Mándennos el comprobante por WhatsApp.</li></ol>
        <a class="btn gold" href="https://wa.me/${WA}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Enviar comprobante ${arrow}</a></div>
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
    const tabs = [["invitacion", "Su invitación"], ["invitados", P.plan.listaInvitados ? `Invitados (${P.invitados.length})` : "Compartir"], ["respuestas", `Confirmaciones (${P.totales.personas})`], ["datos", "Corregir datos"], ["cambios", `Pedir cambios (${P.revisiones.quedan})`]];
    const nav = $("#pTabs"); nav.hidden = false; nav.textContent = "";
    tabs.forEach(([k, t]) => nav.append(el("button", { type: "button", role: "tab", "aria-selected": String(tab === k), text: t, onclick: () => { tab = k; sessionStorage.setItem("ml-tab", k); pintar(); } })));
    const c = $("#pCuerpo"); c.textContent = "";
    ({ invitacion, invitados, respuestas, datos: formDatos, cambios })[tab]?.(c);
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
        el("p", { class: "hint", text: P.plan.listaInvitados ? "Sirve para quien no esté en su lista. Para cada invitado usen su enlace personal (pestaña Invitados)." : `Compártanlo con todos. Cada respuesta puede incluir hasta ${P.totales.cupoGeneral} ${P.totales.cupoGeneral === 1 ? "persona" : "personas"}.` }),
        el("div", { class: "p-link" }, [el("input", { value: P.enlaceGeneral, readonly: true, "aria-label": "Enlace general" }), el("button", { class: "btn sm", type: "button", text: "Copiar", onclick: e => copiar(P.enlaceGeneral, e.currentTarget) })]),
        el("a", { class: "link", href: `https://wa.me/?text=${encodeURIComponent(`${P.datos.nombre1} y ${P.datos.nombre2} los invitan a su boda 💌 Abran su invitación aquí: ${P.enlaceGeneral}`)}`, target: "_blank", rel: "noopener", text: "Compartir por WhatsApp" })]),
      totales(),
    ]));
    c.append(box);
    const dibujar = abrir => Motor.construir(scr, { modelo: P.modelo, diseno: P.diseno, datos: P.datos, fotos: P.fotos.map(u => API + u), portada: P.portada, vista: true, autoAbrir: abrir, cupoGeneral: P.totales.cupoGeneral });
    dibujar(true);
  }
  function copiar(t, btn) { navigator.clipboard?.writeText(t).then(() => { const o = btn.textContent; btn.textContent = "Copiado"; setTimeout(() => (btn.textContent = o), 1600); }); }

  // ---------- Invitados ----------
  let lista = null;
  function invitados(c) {
    if (!P.plan.listaInvitados) {
      c.append(el("div", { class: "p-card" }, [el("b", { text: "Su plan comparte un solo enlace con todos" }),
        el("p", { text: "Cópienlo en la pestaña «Su invitación» y envíenlo por WhatsApp. Las respuestas llegan a «Confirmaciones»." }),
        el("p", { class: "hint", html: `¿Quieren que cada invitado reciba la suya, con su nombre y sus cupos? Es parte del plan Clásico. <a href="https://wa.me/${WA}?text=${encodeURIComponent(`Hola, Miguel. Quiero pasar mi pedido ${P.codigo} al plan Clásico.`)}" target="_blank" rel="noopener">Escríbannos</a>.` })]));
      return;
    }
    lista = P.invitados.map(i => ({ ...i }));
    c.append(totales());
    const tabla = el("div", { class: "p-tabla", role: "table", "aria-label": "Lista de invitados" });
    const cabecera = el("div", { class: "p-fila cab", role: "row" }, ["Invitado o familia", "Cupos", "WhatsApp", "Correo", "Estado", ""].map(t => el("span", { role: "columnheader", text: t })));
    const cuerpo = el("div", { role: "rowgroup" });
    const estado = i => {
      if (!i.id) return el("span", { class: "est", text: "Sin guardar" });
      if (i.rsvp) return el("span", { class: "est " + (i.rsvp.asiste ? "si" : "no"), text: i.rsvp.asiste ? `Confirmó ${i.rsvp.personas}` : "No va" });
      if (i.abierto_at) return el("span", { class: "est", text: "La abrió" });
      if (i.enviado_at) return el("span", { class: "est", text: i.enviado_por === "whatsapp" ? "Enviada por WhatsApp" : "Enviada por correo" });
      return el("span", { class: "est", text: "Sin enviar" });
    };
    const pintarFilas = () => {
      cuerpo.textContent = "";
      lista.forEach((i, n) => {
        const nombre = el("input", { value: i.nombre || "", maxlength: "80", placeholder: "Ej.: Familia Castillo", "aria-label": "Nombre del invitado" });
        const cupos = el("input", { type: "number", min: "1", max: "20", value: i.cupos || 1, "aria-label": "Cupos" });
        const tel = el("input", { value: i.telefono || "", inputmode: "tel", placeholder: "6000-0000", "aria-label": "WhatsApp" });
        const mail = el("input", { type: "email", value: i.correo || "", placeholder: "correo@…", "aria-label": "Correo" });
        [nombre, cupos, tel, mail].forEach(x => x.addEventListener("input", () => { i.nombre = nombre.value; i.cupos = Math.max(1, Math.min(20, +cupos.value || 1)); i.telefono = tel.value; i.correo = mail.value; sucio(true); }));
        const acciones = el("span", { class: "p-row-acc" }, [
          i.id && waNum(i.telefono) ? el("a", { class: "chip-wa", href: `https://wa.me/${waNum(i.telefono)}?text=${encodeURIComponent(textoWa(i))}`, target: "_blank", rel: "noopener", title: "Enviar por WhatsApp", html: '<svg class="ico" aria-hidden="true"><use href="#i-wa"/></svg>', onclick: () => api("/love/api/enviar", { canal: "whatsapp", ids: [i.id] }).then(() => { i.enviado_at = i.enviado_at || Date.now() / 1000; i.enviado_por = i.enviado_por || "whatsapp"; }).catch(() => {}) }) : null,
          i.id ? el("button", { class: "chip-s", type: "button", text: "Enlace", title: "Copiar su enlace personal", onclick: e => copiar(i.enlace, e.currentTarget) }) : null,
          el("button", { class: "rm", type: "button", "aria-label": `Quitar a ${i.nombre || "este invitado"}`, html: '<svg class="ico" aria-hidden="true"><use href="#i-x"/></svg>', onclick: () => { if (i.rsvp && !confirm(`${i.nombre} ya respondió. ¿Quitarlo igual?`)) return; lista.splice(n, 1); sucio(true); pintarFilas(); } }),
        ]);
        cuerpo.append(el("div", { class: "p-fila", role: "row" }, [nombre, cupos, tel, mail, estado(i), acciones]));
      });
      if (!lista.length) cuerpo.append(el("p", { class: "hint", style: "padding:18px", text: "Todavía no hay invitados. Agréguenlos uno por uno o péguenlos desde Excel." }));
    };
    tabla.append(cabecera, cuerpo);
    const guardar = el("button", { class: "btn", type: "button", html: `Guardar lista ${arrow}`, disabled: true });
    const sucio = s => { guardar.disabled = !s; guardar.dataset.sucio = s ? "1" : ""; };
    guardar.addEventListener("click", async () => {
      guardar.disabled = true; guardar.textContent = "Guardando…";
      try { P = await api("/love/api/invitados", { invitados: lista.filter(i => (i.nombre || "").trim()) }); aviso("Lista guardada."); pintar(); }
      catch (e) { aviso(e.message, true); guardar.disabled = false; guardar.innerHTML = `Guardar lista ${arrow}`; }
    });
    const pegar = el("textarea", { rows: "4", placeholder: "Peguen aquí desde Excel o escriban una por línea:\nFamilia Castillo, 3, 6000-0000, castillo@correo.com\nMiguel Capuro, 1, , miguel@correo.com" });
    const sinCorreo = P.invitados.filter(i => !i.correo).length, porEnviar = P.invitados.filter(i => i.correo && !i.enviado_at).length;
    c.append(
      el("div", { class: "p-acc" }, [el("button", { class: "btn sm", type: "button", text: "+ Agregar invitado", onclick: () => { lista.push({ nombre: "", cupos: 1 }); pintarFilas(); sucio(true); $$(".p-fila:last-child input", cuerpo)[0]?.focus(); } }), guardar,
        el("button", { class: "link", type: "button", text: "Descargar en Excel (CSV)", onclick: descargarCSV })]),
      tabla,
      el("details", { class: "p-card" }, [el("summary", { text: "Pegar varios desde Excel" }), el("p", { class: "hint", text: "Columnas: nombre, cupos, WhatsApp, correo. Separadas por coma o tabulación." }), pegar,
        el("button", { class: "btn sm", type: "button", text: "Agregar a la lista", onclick: () => {
          pegar.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(l => {
            const partes = (l.includes("\t") ? l.split("\t") : l.split(/[;,]/)).map(x => x.trim());
            const correo = partes.find(x => /@/.test(x)) || "";
            const resto = partes.filter(x => x !== correo);
            const nombre = resto.shift() || "";
            const cuposTxt = resto.find(x => /^\d{1,2}$/.test(x));
            const telefono = resto.find(x => x !== cuposTxt && digits(x).length >= 7) || "";
            if (nombre) lista.push({ nombre, cupos: Math.max(1, Math.min(20, parseInt(cuposTxt, 10) || 1)), telefono, correo });
          });
          pegar.value = ""; pintarFilas(); sucio(true);
        } })]),
      el("div", { class: "p-card" }, [el("b", { text: "Enviar las invitaciones" }),
        el("p", { text: `Por correo: les llega a nombre de ustedes, con su enlace personal. ${porEnviar ? `Faltan ${porEnviar} por enviar.` : "No hay correos pendientes."}${sinCorreo ? ` ${sinCorreo} no tienen correo: envíenselas por WhatsApp con el botón verde.` : ""}` }),
        el("div", { class: "p-acc" }, [el("button", { class: "btn", type: "button", html: `Enviar por correo a los que faltan ${arrow}`, disabled: !porEnviar || P.estado !== "lista", onclick: async e => {
          if (guardar.dataset.sucio) { aviso("Primero guarden la lista.", true); return; }
          if (!confirm(`¿Enviar ${porEnviar} invitaciones por correo ahora?`)) return;
          e.currentTarget.disabled = true; e.currentTarget.textContent = "Enviando…";
          try { const r = await api("/love/api/enviar", {}); aviso(r.configurado ? `Listo: enviamos ${r.enviados} invitaciones.${r.fallos.length ? ` No salieron: ${r.fallos.join(", ")}.` : ""}` : "El envío por correo todavía no está activo. Usen WhatsApp por ahora."); P = await api("/love/api/portal"); pintar(); }
          catch (x) { aviso(x.message, true); pintar(); }
        } })])]),
    );
    pintarFilas();
  }
  const textoWa = i => `Hola, ${i.nombre} 💌 ${P.datos.nombre1} y ${P.datos.nombre2} los invitan a su boda${P.datos.fecha ? ` el ${Motor.longDate(P.datos.fecha)}` : ""}. Su invitación es para ${i.cupos} ${i.cupos === 1 ? "persona" : "personas"}. Ábranla y confirmen aquí: ${i.enlace}`;
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
      el("p", { class: "hint", text: "Corregir datos es gratis y no gasta revisiones. Sus invitados ven los cambios al instante, con el mismo enlace." }),
      row(campo("Nombre (1)", "nombre1", { maxlength: "40" }), campo("Nombre (2)", "nombre2", { maxlength: "40" })),
      campo("Su frase", "frase", { maxlength: "120" }),
      row(campo("Fecha", "fecha", { type: "date", min: hoy(), max: maxF() }), campo("Hora", "hora", { type: "time" })),
      row(campo("Lugar", "lugar", { maxlength: "80" }), campo("Dirección", "direccion", { maxlength: "160" })),
      campo("Enlace de Google Maps", "mapa", { type: "url" }),
      row(campo("Recepción (lugar)", "recepcion.lugar", { maxlength: "80" }), campo("Recepción (hora)", "recepcion.hora", { type: "time" })),
      row(campo("Recepción (dirección)", "recepcion.direccion", { maxlength: "160" }), campo("Recepción (mapa)", "recepcion.mapa", { type: "url" })),
      row(campo("Padres de " + d.nombre1, "padres1", { maxlength: "120" }), campo("Padres de " + d.nombre2, "padres2", { maxlength: "120" })),
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
  function cambios(c) {
    const r = P.revisiones;
    c.append(el("div", { class: "kpis" }, [kpi(r.quedan, r.quedan === 1 ? "revisión disponible" : "revisiones disponibles"), kpi(r.usadas, "usadas")]));
    if (r.quedan > 0) {
      const t = el("textarea", { rows: "5", maxlength: "2000", placeholder: "Escriban todo lo que quieren cambiar en un solo mensaje. Ej.: más dorado, la frase de la portada más corta, el programa antes que el mapa, letra más moderna." });
      const b = el("button", { class: "btn", type: "button", html: `Enviar cambios ${arrow}`, disabled: P.disenando });
      b.addEventListener("click", async () => {
        if (t.value.trim().length < 4) { aviso("Cuéntennos qué quieren cambiar.", true); return; }
        if (!confirm(`Esto usa 1 de sus ${r.quedan} revisiones. ¿Enviar?`)) return;
        b.disabled = true; b.textContent = "Enviando…";
        try { const j = await api("/love/api/revision", { cambios: t.value }); aviso(j.mensaje); P = await api("/love/api/portal"); pintar(); }
        catch (x) { aviso(x.message, true); b.disabled = false; b.innerHTML = `Enviar cambios ${arrow}`; }
      });
      c.append(el("div", { class: "p-card" }, [el("b", { text: "¿Qué quieren cambiar del diseño?" }),
        el("p", { class: "hint", text: P.plan.cambiarModelo ? "Su plan permite cambiar de modelo. Para corregir nombres, fecha o lugar usen «Corregir datos»: es gratis." : "Para corregir nombres, fecha o lugar usen «Corregir datos»: es gratis." }), t, b]));
    } else {
      c.append(el("div", { class: "p-card" }, [el("b", { text: "Ya usaron sus rondas de revisión" }), el("p", { text: `Cada ronda adicional cuesta $${r.precioExtra}.` }),
        el("a", { class: "btn gold", href: `https://wa.me/${WA}?text=${encodeURIComponent(`Hola, Miguel. Quiero una revisión adicional para mi pedido ${P.codigo}.`)}`, target: "_blank", rel: "noopener", html: `Pedir una revisión adicional ${arrow}` })]));
    }
    if (P.historial.length) c.append(el("div", { class: "p-hist" }, [el("span", { class: "label", text: "Historial" }), ...P.historial.map(h => el("div", { class: "p-hist-i" }, [
      el("small", { text: new Date(h.ts * 1000).toLocaleString("es-PA", { dateStyle: "medium", timeStyle: "short" }) + (h.version ? ` · versión ${h.version}` : "") }),
      el("p", { text: h.tipo === "revision" ? `Pidieron: ${h.texto}` : h.texto }), h.resumen ? el("p", { class: "hint", text: h.resumen }) : null]))]));
  }

  addEventListener("hashchange", () => location.reload());
  cargar();
})();
