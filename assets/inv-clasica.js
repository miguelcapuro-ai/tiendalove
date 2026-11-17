/* Lazo · versión clásica de la invitación.
   Para navegadores que no pueden mover el motor animado (Internet Explorer, Edge antiguo, teléfonos viejos).
   Escrito en JavaScript de 2009 (ES5) a propósito: sin flechas, sin let/const, sin fetch ni promesas.
   Muestra lo esencial (quién invita, cuándo, dónde, programa, detalles) y deja confirmar asistencia. */
(function () {
  var API = ((window.LOVE && window.LOVE.api) || "").replace(/\/$/, "");
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var EV = {
    boda: { dos: 1, enc: "Nos casamos", intro: "Nos casamos y queremos que estén ahí, cerca de nosotros.", rsvp: "¿Nos acompañan?", cierre: "Los esperamos. Va a ser una fiesta de las que se cuentan.", anf: "los novios", tit: "Nuestra boda" },
    votos: { dos: 1, enc: "Renovamos nuestros votos", intro: "Volvemos a decirnos que sí, y queremos que estén ahí otra vez.", rsvp: "¿Nos acompañan?", cierre: "Los esperamos para brindar por lo que viene.", anf: "la pareja", tit: "Renovación de votos" },
    quince: { enc: "Mis XV años", intro: "Cumplo quince años y quiero celebrarlo con ustedes.", rsvp: "¿Me acompañan?", cierre: "Los espero esa noche. Vengan con ganas de bailar.", anf: "", tit: "Mis XV años" },
    bautizo: { enc: "Mi bautizo", intro: "Voy a recibir el bautismo y quiero que estén conmigo ese día.", rsvp: "¿Me acompañan?", cierre: "Los espero con mucho cariño.", anf: "la familia", tit: "Mi bautizo" },
    comunion: { enc: "Mi primera comunión", intro: "Voy a recibir mi primera comunión y quiero compartirla con ustedes.", rsvp: "¿Me acompañan?", cierre: "Los espero para celebrar juntos.", anf: "la familia", tit: "Mi primera comunión" },
    empresa: { emp: 1, enc: "Están invitados", intro: "Queremos compartir esta noche con ustedes.", rsvp: "¿Nos acompañan?", cierre: "Los esperamos.", anf: "los organizadores", tit: "Invitación" }
  };
  var esIE = /Trident\/|MSIE /.test(navigator.userAgent);

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.appendChild(document.createTextNode(String(txt))); return e; }
  function add(p) { for (var i = 1; i < arguments.length; i++) if (arguments[i]) p.appendChild(arguments[i]); return p; }
  function link(href, txt, cls) { var a = el("a", cls || "c-btn c-btn-sec", txt); a.href = /^https?:\/\//i.test(href || "") ? href : "#"; a.target = "_blank"; a.rel = "noopener"; return a; }
  function color(c, def) { return /^#[0-9a-f]{3,8}$/i.test(c || "") ? c : def; }
  function fechaLarga(f) {
    var m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(f || ""); if (!m) return f || "";
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
    return DIAS[d.getUTCDay()] + " " + (+m[3]) + " de " + MESES[+m[2] - 1] + " de " + m[1];
  }
  function hora12(h) {
    var m = /^(\d\d):(\d\d)$/.exec(h || ""); if (!m) return h || "";
    var H = +m[1]; return (H % 12 || 12) + ":" + m[2] + " " + (H < 12 ? "a. m." : "p. m.");
  }
  function mapa(url, lug, dr, geo) { return url || "https://www.google.com/maps/search/?api=1&query=" + (geo || encodeURIComponent(lug + ", " + dr)); }
  function pedir(metodo, url, cuerpo, listo) {
    var x = new XMLHttpRequest(); x.open(metodo, url, true);
    if (cuerpo) x.setRequestHeader("Content-Type", "application/json");
    x.onreadystatechange = function () {
      if (x.readyState !== 4) return;
      var j = null; try { j = JSON.parse(x.responseText); } catch (e) {}
      listo(x.status, j || {});
    };
    x.send(cuerpo ? JSON.stringify(cuerpo) : null);
  }

  var CSS = "html,body{margin:0;background:#0b1424;}" +
    ".c-wrap{min-height:100%;padding:24px 12px 48px;box-sizing:border-box;font-family:Georgia,'Times New Roman',serif}" +
    ".c-card{max-width:560px;margin:0 auto;padding:36px 28px;box-sizing:border-box;text-align:center;line-height:1.5;font-size:18px}" +
    ".c-foto{display:block;width:100%;height:auto;margin:0 0 24px}" +
    ".c-para{font-size:15px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 6px}.c-para b{display:block;font-size:22px;letter-spacing:0;text-transform:none;margin-top:4px}" +
    ".c-kick{font-size:13px;letter-spacing:.25em;text-transform:uppercase;margin:18px 0 6px}" +
    ".c-nombres{font-size:40px;line-height:1.15;font-weight:normal;margin:6px 0 14px}" +
    ".c-linea{height:1px;width:80px;margin:22px auto}" +
    ".c-h2{font-size:13px;letter-spacing:.22em;text-transform:uppercase;font-weight:normal;margin:30px 0 8px}" +
    ".c-p{margin:6px 0}.c-lugar{font-size:21px;margin:4px 0}.c-chico{font-size:15px;opacity:.8}" +
    ".c-prog{list-style:none;padding:0;margin:0}.c-prog li{margin:4px 0}" +
    ".c-btn{display:inline-block;margin:6px 4px;padding:10px 18px;border:1px solid;border-radius:30px;font:15px Arial,sans-serif;text-decoration:none;cursor:pointer;background:transparent}" +
    ".c-btn-pri{color:#fff!important}.c-form{text-align:left;margin-top:12px}.c-form label{display:block;font:14px Arial,sans-serif;margin:12px 0 4px}" +
    ".c-form input,.c-form select,.c-form textarea{display:block;width:100%;box-sizing:border-box;padding:9px;font:16px Arial,sans-serif;border:1px solid #aaa;border-radius:6px;background:#fff;color:#222}" +
    ".c-sino{text-align:center;margin:10px 0}.c-sino .c-btn.on{color:#fff}.c-err{color:#b3261e;font:14px Arial,sans-serif;min-height:18px;margin:8px 0}" +
    ".c-env{text-align:center}.c-aviso{max-width:560px;margin:16px auto 0;color:#e9eef6;font:14px/1.5 Arial,sans-serif;text-align:center;opacity:.85}.c-aviso .c-btn{color:#e9eef6;border-color:#e9eef6}";

  function construir(j) {
    var d = j.datos || {}, ds = j.diseno || {}, pal = ds.paleta || {}, T = ds.textos || {};
    var ev = EV[d.tipo] || EV.boda;
    var papel = color(pal.papel, "#fbf7f0"), tinta = color(pal.tinta, "#2b2420"), acento = color(pal.acento, "#a9853f");
    var n1 = d.nombre1 || "", n2 = d.nombre2 || "";
    var pareja = ev.emp ? (n2 || n1) : (ev.dos && n2 ? n1 + " & " + n2 : n1);
    var anf = ev.anf || n1;
    var tieneTextos = ds && ds.paleta;
    var enc = (tieneTextos && T.encabezado) || (ev.emp ? n1 : ev.enc);
    var intro = (tieneTextos && T.intro) || ev.intro;

    var st = document.createElement("style"); st.type = "text/css";
    if (st.styleSheet) st.styleSheet.cssText = CSS; else st.appendChild(document.createTextNode(CSS));
    document.getElementsByTagName("head")[0].appendChild(st);

    var wrap = el("div", "c-wrap"), card = el("div", "c-card");
    card.style.background = papel; card.style.color = tinta;
    function linea() { var l = el("div", "c-linea"); l.style.background = acento; return l; }
    function h2(t) { var h = el("h2", "c-h2", t); h.style.color = acento; return h; }
    function boton(t, pri) { var b = el("button", "c-btn" + (pri ? " c-btn-pri" : ""), t); b.type = "button"; b.style.borderColor = acento; b.style.color = pri ? "#fff" : acento; if (pri) b.style.background = acento; return b; }
    function estiloLink(a) { a.style.borderColor = acento; a.style.color = acento; return a; }

    var fotos = j.fotos || [];
    var portada = fotos[j.portada || 0];
    if (portada) { var img = el("img", "c-foto"); img.src = API + portada; img.alt = ""; card.appendChild(img); }
    if (j.invitado) { var para = el("p", "c-para", "Para"); para.style.color = acento; para.appendChild(el("b", null, j.invitado.nombre)); para.lastChild.style.color = tinta; card.appendChild(para); }
    var k = el("p", "c-kick", enc); k.style.color = acento;
    add(card, k, el("h1", "c-nombres", pareja));
    if (d.frase) add(card, el("p", "c-p c-chico", d.frase));
    add(card, el("p", "c-p", intro), linea());
    add(card, el("p", "c-lugar", fechaLarga(d.fecha)), el("p", "c-p", hora12(d.hora)));

    // Dónde
    var rc = d.recepcion && d.recepcion.lugar ? d.recepcion : null;
    add(card, h2(rc ? (d.ceremonia || "Ceremonia") : "Dónde"));
    if (d.lugar) add(card, el("p", "c-lugar", d.lugar));
    if (d.direccion) add(card, el("p", "c-p c-chico", d.direccion));
    if (d.lugar || d.direccion || d.mapa) card.appendChild(estiloLink(link(mapa(d.mapa, d.lugar || "", d.direccion || "", d.geo), "Ver en Google Maps")));
    if (rc) {
      add(card, h2("Recepción"), el("p", "c-lugar", rc.lugar));
      if (rc.direccion) add(card, el("p", "c-p c-chico", rc.direccion));
      if (rc.hora) add(card, el("p", "c-p", hora12(rc.hora)));
      card.appendChild(estiloLink(link(mapa(rc.mapa, rc.lugar, rc.direccion || "", rc.geo), "Ver en Google Maps")));
    }

    // Programa y detalles
    var prog = [], p = d.programa || [];
    for (var i = 0; i < p.length; i++) if (p[i] && p[i].hora && p[i].acto) prog.push(p[i]);
    if (prog.length) {
      var ol = el("ul", "c-prog");
      for (i = 0; i < prog.length; i++) ol.appendChild(el("li", null, hora12(prog[i].hora) + " · " + prog[i].acto));
      add(card, h2(T.titulo_programa || "El programa"), ol);
    }
    var hist = T.historia || d.historia; if (hist) add(card, h2("Nuestra historia"), el("p", "c-p", hist));
    var vest = T.vestimenta || d.vestimenta; if (vest) add(card, h2("Código de vestimenta"), el("p", "c-p", vest));
    var reg = T.regalos || d.regalos;
    if (reg || d.regalosYappy || d.regalosEnlace) {
      add(card, h2("Regalos"));
      if (reg) add(card, el("p", "c-p", reg));
      if (d.regalosYappy) add(card, el("p", "c-lugar", "Yappy " + d.regalosYappy));
      if (d.regalosEnlace) card.appendChild(estiloLink(link(d.regalosEnlace, "Ver mesa de regalos")));
    }
    var hosp = T.hospedaje || d.hospedaje; if (hosp) add(card, h2("Hospedaje"), el("p", "c-p", hosp));

    // Confirmación
    if (j.plan !== "std") add(card, linea(), h2(T.titulo_rsvp || ev.rsvp), rsvp());
    add(card, linea(), el("p", "c-p", (tieneTextos && T.cierre) || ev.cierre));

    function rsvp() {
      var caja = el("div", "c-env");
      if (j.cerrado) { caja.appendChild(el("p", "c-p", "La fecha para confirmar ya pasó. Escríbanles directamente a " + anf + ".")); return caja; }
      var texto = (T.mensaje_rsvp || "Confirmen su asistencia.") + (d.fechaLimite ? " Antes del " + fechaLarga(d.fechaLimite) + "." : "");
      caja.appendChild(el("p", "c-p", texto));
      if (d.soloAdultos) caja.appendChild(el("p", "c-p c-chico", "Celebración solo para adultos."));
      // Invitación general con captcha: el captcha no funciona en navegadores tan antiguos.
      if (!j.invitado && j.turnstile) {
        caja.appendChild(el("p", "c-p c-chico", "Para confirmar, abran este mismo enlace en Chrome, Edge, Firefox, Safari o desde su celular."));
        return caja;
      }
      var max = j.invitado ? j.invitado.cupos : (d.acompanantes === "no" ? 1 : (j.cupoGeneral || 2));
      var previa = j.invitado && j.invitado.rsvp;
      function ok(msg, asiste) {
        caja.innerHTML = "";
        if (!/^¡?Gracias/.test(msg)) caja.appendChild(el("p", "c-lugar", asiste ? "¡Gracias!" : "Gracias por avisar"));
        caja.appendChild(el("p", "c-p", msg));
        if (asiste && j.invitado && j.invitado.mesa) caja.appendChild(el("p", "c-p", "Su mesa: " + j.invitado.mesa));
        var b = boton("Cambiar mi respuesta"); b.onclick = function () { caja.innerHTML = ""; caja.appendChild(el("p", "c-p", texto)); caja.appendChild(form()); };
        caja.appendChild(b);
      }
      function form() {
        var f = el("form", "c-form"), asiste = previa ? !!previa.asiste : null;
        var nombre = null;
        if (!j.invitado) { add(f, el("label", null, "Su nombre")); nombre = el("input"); nombre.maxLength = 80; f.appendChild(nombre); }
        var sino = el("div", "c-sino"), si = boton("Sí, ahí estaremos"), no = boton("No podremos ir");
        add(sino, si, no); f.appendChild(sino);
        var bloqueSi = el("div");
        var sel = el("select");
        for (var n = 1; n <= max; n++) { var op = el("option", null, n === 1 ? "1 persona" : n + " personas"); op.value = n; sel.appendChild(op); }
        sel.value = String(previa && previa.personas ? previa.personas : max);
        if (max > 1) add(bloqueSi, el("label", null, "¿Cuántos van? (su invitación es para " + max + ")"), sel);
        var nombres = el("input"); nombres.maxLength = 300; if (previa) nombres.value = previa.nombres || "";
        if (max > 1) add(bloqueSi, el("label", null, "Nombres de quienes van"), nombres);
        var alergias = el("input"); alergias.maxLength = 200;
        if (d.preguntarAlergias !== false) add(bloqueSi, el("label", null, "Alergias o comida especial (opcional, solo lo verán " + (anf || "los anfitriones") + ")"), alergias);
        var mensaje = el("textarea"); mensaje.rows = 2; mensaje.maxLength = 400;
        add(f, bloqueSi, el("label", null, "Mensaje (opcional)"), mensaje);
        var err = el("p", "c-err"), enviar = boton("Enviar respuesta", true); enviar.type = "submit";
        add(f, err, el("div", "c-sino")); f.lastChild.appendChild(enviar);
        function marcar() {
          si.className = "c-btn" + (asiste === true ? " on" : ""); no.className = "c-btn" + (asiste === false ? " on" : "");
          si.style.background = asiste === true ? acento : "transparent"; si.style.color = asiste === true ? "#fff" : acento;
          no.style.background = asiste === false ? acento : "transparent"; no.style.color = asiste === false ? "#fff" : acento;
          bloqueSi.style.display = asiste === true ? "block" : "none";
        }
        si.onclick = function () { asiste = true; marcar(); };
        no.onclick = function () { asiste = false; marcar(); };
        marcar();
        f.onsubmit = function (e) {
          if (e && e.preventDefault) e.preventDefault();
          err.innerHTML = "";
          if (asiste === null) { err.appendChild(document.createTextNode("Toquen «Sí» o «No».")); return false; }
          if (nombre && !nombre.value.replace(/^\s+|\s+$/g, "")) { err.appendChild(document.createTextNode("Escriban su nombre.")); return false; }
          if (j.vista) { err.appendChild(document.createTextNode("Así confirmarán sus invitados. En la vista previa no se guarda.")); return false; }
          var personas = asiste ? (max > 1 ? +sel.value : 1) : 0;
          enviar.disabled = true; enviar.innerHTML = "Enviando…";
          pedir("POST", API + "/love/api/rsvp", { s: j.slug, g: j.invitado ? j.invitado.id : undefined, asiste: asiste, personas: personas,
            nombre: nombre ? nombre.value : undefined, nombres: nombres.value, alergias: alergias.value, mensaje: mensaje.value, novedades: false },
            function (status, r) {
              if (status >= 200 && status < 300 && r.ok) {
                if (j.invitado) j.invitado.rsvp = { asiste: asiste ? 1 : 0, personas: personas, nombres: nombres.value };
                previa = j.invitado ? j.invitado.rsvp : null;
                ok(r.mensaje || "", asiste);
              } else {
                err.appendChild(document.createTextNode(r.mensaje || "No se pudo guardar. Intenten de nuevo."));
                enviar.disabled = false; enviar.innerHTML = "Enviar respuesta";
              }
            });
          return false;
        };
        return f;
      }
      if (previa) ok(previa.asiste ? "Confirmaron " + previa.personas + (previa.personas === 1 ? " persona." : " personas.") : "Nos dijeron que no podrán ir.", !!previa.asiste);
      else caja.appendChild(form());
      return caja;
    }

    // Aviso: es la versión sencilla; en Internet Explorer se ofrece abrirla en Edge.
    var aviso = el("div", "c-aviso", "Están viendo la versión sencilla de la invitación porque este navegador es antiguo. Para verla con su animación, ábranla en Chrome, Edge, Firefox, Safari o desde su celular.");
    if (esIE) { var abrirEdge = el("a", "c-btn", "Abrir en Microsoft Edge"); abrirEdge.href = "microsoft-edge:" + location.href; aviso.appendChild(el("br")); aviso.appendChild(abrirEdge); }
    add(wrap, card, aviso);
    document.body.appendChild(wrap);
    var es = document.getElementById("estado"); if (es) es.style.display = "none";
    var pg = document.getElementById("pagina"); if (pg && pg.parentNode) pg.parentNode.removeChild(pg);
    try { document.title = pareja + " · " + (j.invitado ? "Invitación para " + j.invitado.nombre : ev.tit); } catch (e) {}
  }

  function mostrar(t, p) {
    var e = document.getElementById("estado"); if (!e) return;
    e.innerHTML = "";
    e.style.cssText = "position:absolute;left:0;right:0;top:30%;text-align:center;color:#e9eef6;padding:30px;font-family:Georgia,serif";
    e.appendChild(el("h1", null, t)); e.appendChild(el("p", null, p));
  }

  var h = location.hash.slice(1); try { h = decodeURIComponent(h); } catch (e) {}
  var partes = h.split(/[.\/]/), slug = partes[0], g = partes[1];
  var vista = /[?&]vista=1(&|$)/.test(location.search);
  if (!/^[a-z0-9]{10}$/.test(slug || "")) { mostrar("No encontramos esta invitación", "Revisen que el enlace esté completo. Si lo copiaron de un mensaje, cópienlo de nuevo."); return; }
  pedir("GET", API + "/love/api/inv?s=" + slug + (g ? "&g=" + encodeURIComponent(g) : "") + (vista ? "&vista=1" : ""), null, function (status, j) {
    if (status === 410) return mostrar("Esta celebración ya pasó", "Gracias por haber sido parte. La invitación ya no está disponible.");
    if (status < 200 || status >= 300 || !j.ok) return mostrar(status ? "No encontramos esta invitación" : "No pudimos abrir la invitación", j.mensaje || (status ? "Revisen el enlace o pídanselo de nuevo a los novios." : "Revisen su conexión e intenten de nuevo en un momento."));
    j.vista = vista;
    try { construir(j); } catch (e) { mostrar("No pudimos abrir la invitación", "Ábranla en Chrome, Edge, Firefox, Safari o desde su celular."); }
  });
})();
