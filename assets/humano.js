/* Captcha anti-robots (Cloudflare Turnstile) para los formularios que generan gastos.
   El servidor dice si está activo (config.turnstile = clave pública). Si no lo está, no se muestra nada.
   Uso: const h = Humano(contenedor); h.preparar(clave); ... h.token(); h.reiniciar(); */
(function () {
  let cargando = null;
  function cargar() {
    if (window.turnstile) return Promise.resolve();
    if (cargando) return cargando;
    cargando = new Promise((ok, mal) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true; s.onload = () => ok(); s.onerror = () => { cargando = null; mal(new Error("captcha")); };
      document.head.appendChild(s);
    });
    return cargando;
  }
  window.Humano = function (contenedor) {
    let id = null, tok = null, clave = null;
    return {
      activo: () => Boolean(clave),
      async preparar(k) {
        clave = k || null;
        if (!clave || id !== null) return;
        try { await cargar(); } catch { return; }
        id = window.turnstile.render(contenedor, {
          sitekey: clave, language: "es", appearance: "interaction-only",
          callback: (t) => { tok = t; }, "expired-callback": () => { tok = null; }, "error-callback": () => { tok = null; },
        });
      },
      token: () => tok,
      reiniciar() { tok = null; if (id !== null && window.turnstile) { try { window.turnstile.reset(id); } catch { /* nada */ } } },
    };
  };
})();
