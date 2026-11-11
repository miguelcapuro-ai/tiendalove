/* Mejorativa Love · medición de anuncios (Meta y Pinterest) y código de planner en el enlace.
   - Si no hay ID en love-config.js, no se carga nada.
   - Las etiquetas solo se cargan si la persona acepta (aviso abajo). Sin permiso, no se mide.
   - ?ref=CODIGO en cualquier página guarda el código del wedding planner para el pedido. */
(() => {
  "use strict";
  const CFG = window.LOVE || {};
  const META = String(CFG.metaPixel || "").replace(/\D/g, ""), PIN = String(CFG.pinterestTag || "").replace(/\D/g, "");
  const ls = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

  // Código del planner: dura 60 días en este teléfono.
  try {
    const ref = new URLSearchParams(location.search).get("ref");
    if (ref && /^[A-Za-z0-9-]{3,30}$/.test(ref)) ls.set("ml-ref", { c: ref.toUpperCase(), t: Date.now() });
  } catch {}
  window.loveRef = () => { const r = ls.get("ml-ref"); return r && r.c && Date.now() - r.t < 60 * 864e5 ? r.c : ""; };

  const cola = [];
  let listo = false;
  window.medir = (ev, p = {}) => { if (!META && !PIN) return; if (listo) enviar(ev, p); else cola.push([ev, p]); };
  if (!META && !PIN) return;

  const MAPA = {
    ver_modelo: ["ViewContent", "pagevisit"], iniciar: ["InitiateCheckout", "addtocart"],
    pedido: ["AddPaymentInfo", "lead"], compra: ["Purchase", "checkout"],
  };
  function enviar(ev, p) {
    const [fb, pin] = MAPA[ev] || [];
    if (ev === "compra") { // una sola vez por pedido
      const k = "ml-compra-" + (p.pedido || ""); if (ls.get(k)) return; ls.set(k, 1);
    }
    const valor = p.valor != null ? { value: Number(p.valor), currency: "USD" } : {};
    if (META && fb && window.fbq) fbq("track", fb, { ...valor, ...(p.modelo ? { content_ids: [p.modelo], content_type: "product" } : {}), ...(p.plan ? { content_name: p.plan } : {}) });
    if (PIN && pin && window.pintrk) pintrk("track", pin, { ...(p.valor != null ? { value: Number(p.valor), currency: "USD", order_quantity: 1 } : {}), ...(p.pedido ? { order_id: p.pedido } : {}), ...(p.modelo ? { product_id: p.modelo } : {}) });
  }
  function cargar() {
    if (META) {
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
      fbq("init", META); fbq("track", "PageView");
    }
    if (PIN) {
      !function (e) { if (!window.pintrk) { window.pintrk = function () { window.pintrk.queue.push(Array.prototype.slice.call(arguments)); }; var n = window.pintrk; n.queue = [], n.version = "3.0"; var t = document.createElement("script"); t.async = !0, t.src = e; var r = document.getElementsByTagName("script")[0]; r.parentNode.insertBefore(t, r); } }("https://s.pinimg.com/ct/core.js");
      pintrk("load", PIN); pintrk("page");
    }
    listo = true; cola.splice(0).forEach(([e, p]) => enviar(e, p));
  }

  // Enlaces con llave (#pagar=… y #completa=…): las etiquetas esperan a que la tienda limpie la dirección,
  // para que la llave del pedido no salga del sitio. Si la dirección no se limpia, en esa visita no se mide.
  const conLlave = () => /^#(pagar|completa)=/.test(location.hash);
  const cargarSinLlave = (n = 0) => { if (!conLlave()) cargar(); else if (n < 40) setTimeout(() => cargarSinLlave(n + 1), 250); };

  const permiso = ls.get("ml-medicion");
  if (permiso === "si") { cargarSinLlave(); return; }
  if (permiso === "no") { window.medir = () => {}; return; }
  const aviso = () => {
    const b = document.createElement("div");
    b.className = "medir-aviso"; b.setAttribute("role", "dialog"); b.setAttribute("aria-label", "Cookies de medición");
    const quien = [META ? "Meta" : "", PIN ? "Pinterest" : ""].filter(Boolean).join(" y ");
    b.innerHTML = '<p>Usamos cookies de ' + quien + ' para saber qué anuncios funcionan. ¿Nos dejan usarlas? <a href="' + (window.LOVE_BASE || "") + 'aviso/#medicion">Más información</a></p><div><button type="button" class="btn sm" data-si>Aceptar</button><button type="button" class="link" data-no>No, gracias</button></div>';
    document.body.append(b);
    b.querySelector("[data-si]").onclick = () => { ls.set("ml-medicion", "si"); b.remove(); cargarSinLlave(); };
    b.querySelector("[data-no]").onclick = () => { ls.set("ml-medicion", "no"); b.remove(); cola.length = 0; window.medir = () => {}; };
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", aviso); else aviso();
})();
