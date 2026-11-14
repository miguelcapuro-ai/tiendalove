/* Mejorativa Love · configuración de la tienda.
   api: servicio privado (el mismo Worker de CV en el Quirófano, rutas /love/*).
   metaPixel y pinterestTag: los ID de medición de anuncios. Vacíos = no se mide nada. */
window.LOVE = {
  api: "https://panel.mejorativa.com",
  whatsapp: "50763454868",
  metaPixel: "1653966566369289",
  pinterestTag: ""
};

/* Política de contenido en observación: si el navegador bloquearía algo, se avisa al panel.
   Solo viaja la directiva, el destino sin parámetros y la ruta de la página: nada de la persona. */
(function(){
  var vistos={}, n=0;
  function avisar(b){
    try{
      var u=String(b.blockedURL||b.blockedURI||""), dest=u;
      if(/^https?:/i.test(u)){var a=new URL(u); dest=a.origin+a.pathname;}
      else if(!/^(eval|inline|data|blob|wasm-eval)$/.test(u)) return;
      var d=String(b.effectiveDirective||b.violatedDirective||""), k=d+"|"+dest;
      if(!d||vistos[k]||n>=6) return; vistos[k]=1; n++;
      navigator.sendBeacon("https://panel.mejorativa.com/t/csp", JSON.stringify({d:d,u:dest.slice(0,100),p:location.pathname.slice(0,80)}));
    }catch(e){}
  }
  try{ new ReportingObserver(function(rs){rs.forEach(function(r){avisar(r.body||{})})},{types:["csp-violation"],buffered:true}).observe(); }
  catch(e){ document.addEventListener("securitypolicyviolation",avisar); }
})();
