/* Lazo · compatibilidad con navegadores viejos (Samsung Internet, WebView o Safari sin actualizar).
   La invitación usa medidas relativas a la tarjeta (cqw) y "inset". Si el navegador no las entiende,
   la página quedaba en blanco. Aquí se traducen a medidas que cualquier navegador entiende:
   - Ncqw  → calc(N * var(--cq)), donde --cq es 1% del ancho de la tarjeta (se recalcula al girar el teléfono).
   - inset → top/right/bottom/left.   - dvh → vh.
   Solo se activa si hace falta: en un navegador al día no hace nada. Escrito en JavaScript antiguo a propósito. */
(function () {
  "use strict";
  var sup = function (p, v) { try { return !!(window.CSS && CSS.supports && CSS.supports(p, v)); } catch (e) { return false; } };
  var necesita = !(sup("width", "1cqw") && sup("inset", "0") && sup("height", "1dvh"));
  if (window.LAZO_FORZAR_COMPAT) necesita = true; // solo para pruebas
  window.LazoCompat = { activo: necesita, preparar: function () { return Promise.resolve(); }, aplicar: function () {} };
  if (!necesita) return;

  var RX_CQ = /(-?\d*\.?\d+)cq(w|i)\b/g;
  var RX_DVH = /(\d*\.?\d+)(d|s|l)vh\b/g;
  function lados(valor) {
    var p = valor.trim().split(/\s+/);
    var t = p[0], r = p[1] || t, b = p[2] || t, l = p[3] || r;
    return "top:" + t + ";right:" + r + ";bottom:" + b + ";left:" + l;
  }
  function traducir(css) {
    return css
      .replace(/(^|[;{\s])inset\s*:\s*([^;}!]+)(!important)?/g, function (m, pre, v, imp) {
        return pre + lados(v).split(";").map(function (d) { return d + (imp ? " !important" : ""); }).join(";");
      })
      .replace(RX_CQ, function (m, n) { return "calc(" + n + " * var(--cq, 3.75px))"; })
      .replace(RX_DVH, "$1vh");
  }
  function hojas() {
    var links = document.querySelectorAll('link[rel="stylesheet"][href*="inv.css"]');
    var tareas = [];
    for (var i = 0; i < links.length; i++) (function (ln) {
      tareas.push(fetch(ln.href).then(function (r) { return r.text(); }).then(function (txt) {
        var st = document.createElement("style");
        st.setAttribute("data-lazo-compat", "");
        st.textContent = traducir(txt);
        ln.parentNode.insertBefore(st, ln.nextSibling);
      }).catch(function () {}));
    })(links[i]);
    return Promise.all(tareas);
  }
  function medir() {
    var s = document.querySelectorAll(".screen");
    for (var i = 0; i < s.length; i++) { var w = s[i].getBoundingClientRect().width || Math.min(window.innerWidth, 480); s[i].style.setProperty("--cq", (w / 100) + "px"); }
  }
  // Estilos que el motor escribe en línea (style="font-size:4cqw") y animaciones con cqw.
  function arreglar(nodo) {
    if (!nodo || nodo.nodeType !== 1) return;
    var lista = [nodo].concat([].slice.call(nodo.querySelectorAll ? nodo.querySelectorAll("[style]") : []));
    for (var i = 0; i < lista.length; i++) {
      var s = lista[i].getAttribute && lista[i].getAttribute("style");
      if (s && (s.indexOf("cq") > -1 || s.indexOf("inset") > -1 || s.indexOf("vh") > -1)) {
        var nuevo = traducir(s);
        if (nuevo !== s) lista[i].setAttribute("style", nuevo);
      }
    }
  }
  if (Element.prototype.animate) {
    var animar = Element.prototype.animate;
    Element.prototype.animate = function (frames, opts) {
      try { frames = JSON.parse(traducir(JSON.stringify(frames))); } catch (e) {}
      return animar.call(this, frames, opts);
    };
  }
  window.LazoCompat = {
    activo: true,
    preparar: hojas,
    aplicar: function (raiz) {
      medir(); arreglar(raiz || document.body);
      if (window.MutationObserver && !window.LazoCompat._obs) {
        window.LazoCompat._obs = new MutationObserver(function (ms) {
          for (var i = 0; i < ms.length; i++) {
            if (ms[i].type === "attributes") arreglar(ms[i].target);
            for (var j = 0; ms[i].addedNodes && j < ms[i].addedNodes.length; j++) arreglar(ms[i].addedNodes[j]);
          }
        });
        window.LazoCompat._obs.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["style"] });
      }
    }
  };
  window.addEventListener("resize", medir);
  window.addEventListener("orientationchange", function () { setTimeout(medir, 300); });
})();
