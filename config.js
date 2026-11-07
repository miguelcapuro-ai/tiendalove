// Configuración de la tienda. Edita solo este archivo para cambiar precios, contacto y destinos.
window.TIENDA = {
  // Monograma M de Mejorativa: navy para fondos claros y blanco para fondos navy. Vacío = solo el nombre en texto.
  logo: "assets/logo-navy.png",
  logoClaro: "assets/logo-blanco.png",

  // WhatsApp de Mejorativa que recibe pedidos y comprobantes (solo dígitos, con código de país).
  whatsappPedidos: "50766653528",

  // TODO: URL de la aplicación web de Google Apps Script (ver apps-script/LEEME.md).
  // Guarda cada pedido en tu Google Drive (una carpeta con fotos y datos) y en una hoja de cálculo, y te avisa por correo.
  // Vacío = modo de demostración: no se envía nada y se ofrece descargar el pedido.
  orderEndpoint: "",

  // Pago con Yappy al celular. Si más adelante hay directorio de Yappy Comercial (ej.: "@mejorativa"), va en `directorio`.
  yappy: { directorio: "", telefono: "+507 6665-3528" },

  currency: "USD",
  extraRevisionPrice: 25,
  sameDayCutoff: "2:00 p.m.",
  avisoVersion: "1.0 · 6 de noviembre de 2026",

  plans: [
    {
      id: "esencial", name: "Esencial", price: 150, revisions: 2, maxPhotos: 6, music: false, extras: 0,
      delivery: "Boceto en 24 horas",
      features: ["2 rondas de revisión", "Cambios de textos, datos y fotos", "Galería de hasta 6 fotos", "Boceto en 24 horas"]
    },
    {
      id: "clasico", name: "Clásico", price: 195, revisions: 3, maxPhotos: 10, music: true, extras: 0, featured: true,
      delivery: "Boceto en 12 horas",
      features: ["3 rondas de revisión", "Todo lo del Esencial", "Colores y tipografía a su gusto", "Música y hasta 10 fotos", "Boceto en 12 horas"]
    },
    {
      id: "premium", name: "Premium", price: 255, revisions: 5, maxPhotos: 20, music: true, extras: 2,
      delivery: "Boceto el mismo día",
      features: ["5 rondas de revisión", "Todo lo del Clásico", "Sello con su monograma a medida", "Cambio de modelo en cualquier ronda", "2 secciones extra a elegir", "Hasta 20 fotos", "Boceto el mismo día"]
    }
  ],

  extrasOptions: ["Nuestra historia", "Código de vestimenta", "Mesa de regalos", "Hospedaje para invitados", "Preguntas frecuentes"],

  timeZones: [
    { id: "America/Panama", label: "Panamá" },
    { id: "America/Costa_Rica", label: "Costa Rica" },
    { id: "America/Bogota", label: "Colombia" },
    { id: "America/Mexico_City", label: "Ciudad de México" },
    { id: "America/New_York", label: "Nueva York / Miami" },
    { id: "Europe/Madrid", label: "España" }
  ]
};
