#!/usr/bin/env python3
"""Genera las páginas de búsqueda de Mejorativa Love: una por país, una por modelo y el catálogo /modelos/.

Uso: python3 scripts/generar_paginas.py   (desde la raíz del repo; necesita node para leer models.js)
Vuelve a escribir sitemap.xml. Los textos de cada país están aquí abajo; el catálogo sale de models.js.
"""
import json, os, subprocess, html, datetime

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = "https://tiendalove.mejorativa.com"
HOY = datetime.date.today().isoformat()
V = "ix20261109d"
PRECIO = {"esencial": 89, "clasico": 149, "premium": 219}
NOMBRE_PLAN = {"esencial": "Esencial", "clasico": "Clásico", "premium": "Premium"}

e = lambda s: html.escape(str(s), quote=True)

MODELOS = json.loads(subprocess.check_output(
    ["node", "-e", "global.window={};require('./models.js');console.log(JSON.stringify(window.MODELOS.map(m=>({id:m.id,name:m.name,family:m.family,plan:m.plan||'esencial',blurb:m.blurb}))))"],
    cwd=RAIZ))

def imagen(m, cual="portada"):
    p = f"assets/modelos/{m['id']}/{cual}.webp"
    return p if os.path.exists(os.path.join(RAIZ, p)) else None

# ---------------------------------------------------------------- países
PAISES = [
    {
        "slug": "mexico", "nombre": "México", "hreflang": "es-MX", "locale": "es_MX",
        "titulo": "Invitaciones de boda digitales en México · Mejorativa Love",
        "desc": "Invitaciones de boda digitales para bodas en México: se abren como un sobre, cada invitado confirma desde su celular y ustedes ven todo en su portal. Desde US$89.",
        "h1": "Invitaciones de boda digitales para su boda en México.",
        "lead": "Su invitación llega al celular de cada invitado, se abre como un sobre de verdad y trae su nombre y sus lugares. Ustedes ven en vivo quién confirma.",
        "secciones": [
            ("Pensada para una boda mexicana",
             "Caben la ceremonia religiosa y la civil con sus horarios, la recepción, los papás y los padrinos, el código de vestimenta y la mesa de regalos con su enlace. Si la fiesta es en una hacienda o en la playa, el mapa lleva a sus invitados con Google Maps o Waze."),
            ("Cada familia, con sus lugares",
             "Ustedes cargan la lista y deciden cuántos lugares lleva cada invitación. Al confirmar, nadie puede anotar más personas de las que ustedes dieron. Si una familia va incompleta, esos lugares quedan libres para otra."),
            ("Se envía por WhatsApp",
             "En los planes Clásico y Premium cada invitación sale por WhatsApp con un toque, con el nombre del invitado ya escrito. En todos los planes también se puede enviar por correo."),
            ("Pago en dólares, sin complicaciones",
             "Pagan una sola vez con tarjeta de débito o crédito, o con PayPal. Su banco hace la conversión a pesos. La invitación queda lista minutos después de confirmar el pago."),
        ],
        "faq": [
            ("¿Sirve si la boda es en Cancún, Oaxaca o San Miguel de Allende?", "Sí. Buscan el lugar en el mapa al hacer el pedido y la cuenta regresiva usa la hora local de la boda."),
            ("¿Puedo poner a los padrinos?", "Sí. La invitación tiene espacio para papás y padrinos, y ustedes deciden si se muestran."),
            ("¿Cómo pago desde México?", "Con tarjeta mexicana de débito o crédito, o con PayPal. El cobro es en dólares y su banco lo convierte a pesos."),
        ],
    },
    {
        "slug": "estados-unidos", "nombre": "Estados Unidos", "hreflang": "es-US", "locale": "es_US",
        "titulo": "Invitaciones de boda digitales en español en EE. UU. · Mejorativa Love",
        "desc": "Invitaciones de boda digitales en español para parejas latinas en Estados Unidos, con invitados en varios países. Confirmación por WhatsApp y portal de novios. Desde US$89.",
        "h1": "Su boda en Estados Unidos, con una invitación en español.",
        "lead": "Para parejas latinas que se casan en EE. UU. y tienen familia repartida en varios países. Cada invitado recibe la suya en su teléfono, esté donde esté.",
        "secciones": [
            ("Familia en varios países, una sola lista",
             "Cargan a todos sus invitados en el portal, vivan en Houston, en Bogotá o en Ciudad de Panamá. Cada uno recibe su invitación por correo o por WhatsApp y confirma desde ahí. Ustedes ven el total de personas al instante."),
            ("La hora correcta para todos",
             "La cuenta regresiva usa la hora local del lugar de la boda. Así nadie se confunde con la diferencia de horario."),
            ("Hospedaje y viaje",
             "Si tienen invitados que viajan, la invitación puede llevar hoteles recomendados, la dirección exacta con Google Maps o Waze y el código de vestimenta."),
            ("Precio en dólares",
             "Un solo pago con tarjeta o PayPal, en dólares. La invitación les llega por correo minutos después de confirmar el pago, junto con el enlace a su portal."),
        ],
        "faq": [
            ("¿La invitación puede estar en inglés?", "Hoy la invitación se diseña en español. Si necesitan frases en inglés para algunos invitados, pueden escribirlas en los textos de la invitación."),
            ("¿Mis invitados necesitan descargar algo?", "No. La invitación se abre en el navegador del teléfono, desde el enlace que les llega."),
            ("¿Puedo pagar con mi tarjeta de EE. UU.?", "Sí, con tarjeta de débito o crédito o con PayPal."),
        ],
    },
    {
        "slug": "espana", "nombre": "España", "hreflang": "es-ES", "locale": "es_ES",
        "titulo": "Invitaciones de boda online en España · Mejorativa Love",
        "desc": "Invitaciones de boda online para bodas en España: un sobre que se abre en el móvil, confirmación de asistencia, alergias y lista de invitados con plazas. Desde 89 dólares.",
        "h1": "Invitaciones de boda online para vuestra boda en España.",
        "lead": "Una invitación que se abre como un sobre en el móvil de cada invitado. Cada uno confirma su asistencia, cuántos van y si tiene alguna alergia, y vosotros lo veis todo en vuestro portal.",
        "secciones": [
            ("Confirmaciones sin perseguir a nadie",
             "Cada invitado recibe su propia invitación con su nombre y sus plazas. Al confirmar indica cuántos van, sus nombres y las alergias. En el plan Premium, quienes no responden reciben un recordatorio automático."),
            ("Mesas y plazas",
             "En el plan Premium cada invitación lleva el número de mesa. Si alguien va con menos personas, esas plazas quedan libres para otra familia, y el total se cuadra solo."),
            ("Todo lo que vuestros invitados preguntan",
             "Horario de la ceremonia y del convite, dirección con Google Maps, código de vestimenta, número de cuenta o lista de bodas y alojamiento cercano. Si cambia algo, lo cambiáis vosotros desde el portal y el enlace sigue siendo el mismo."),
            ("Pago único",
             "Se paga una vez con tarjeta o PayPal, en dólares; vuestro banco hace el cambio a euros. La invitación llega a vuestro correo minutos después de confirmar el pago."),
        ],
        "faq": [
            ("¿Se puede enviar por WhatsApp?", "Sí, en los planes Clásico y Premium, con un toque y el nombre de cada invitado ya escrito. En todos los planes se envía también por correo."),
            ("¿Cuánto cuesta en euros?", "El precio es en dólares (desde US$89) y vuestro banco lo convierte a euros con su tipo de cambio del día."),
            ("¿Hasta cuándo funciona?", "Hasta tres meses después de la boda. Después la apagamos y borramos los datos."),
        ],
    },
    {
        "slug": "panama", "nombre": "Panamá", "hreflang": "es-PA", "locale": "es_PA",
        "titulo": "Invitaciones de boda digitales en Panamá · Mejorativa Love",
        "desc": "Invitaciones de boda digitales hechas en Panamá: se abren como un sobre, cada invitado confirma desde su celular y pagas con Yappy, PayPal o tarjeta. Desde US$89.",
        "h1": "Invitaciones de boda digitales, hechas en Panamá.",
        "lead": "Su invitación llega al celular de cada invitado, se abre como un sobre y trae su nombre y sus cupos. Ustedes ven en su portal quién confirma y cuántas personas van.",
        "secciones": [
            ("Desde el Casco Viejo hasta la playa",
             "Buscan el lugar en el mapa y sus invitados llegan con Google Maps o Waze. Hay modelos con monstera, orquídeas y heliconias, y otro de playa al atardecer, pensados para bodas en Panamá."),
            ("Cupos claros",
             "A cada invitación le asignan cuántas personas incluye. Nadie puede confirmar más cupos de los que ustedes dieron, y si alguien no va, sus cupos quedan libres."),
            ("Se paga con Yappy",
             "Pueden pagar con Yappy, con tarjeta o con PayPal. Si necesitan factura, la emitimos y les llega en PDF."),
            ("Por WhatsApp, como se hace aquí",
             "En los planes Clásico y Premium cada invitación se envía por WhatsApp con un toque. En todos los planes también por correo."),
        ],
        "faq": [
            ("¿Cuánto tarda?", "Minutos después de confirmar el pago. Con tarjeta o PayPal se confirma al instante; con Yappy, apenas vemos el comprobante."),
            ("¿Emiten factura?", "Sí. La piden al hacer el pedido y llega en PDF a su correo."),
            ("¿Y si cambia la fecha?", "La cambian ustedes desde su portal, sin costo, y el enlace sigue siendo el mismo."),
        ],
    },
]

# ---------------------------------------------------------------- plantilla
def pagina(ruta, titulo, desc, cuerpo, ld, profundidad, extra_head="", imagen_og=None, locale="es_PA"):
    pre = "../" * profundidad
    og = imagen_og or f"{BASE}/img/og-love.jpg"
    url = f"{BASE}/{ruta}"
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(titulo)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{url}">
{extra_head}<meta name="theme-color" content="#0B1F3A">
<meta property="og:type" content="website">
<meta property="og:locale" content="{locale}">
<meta property="og:site_name" content="Mejorativa Love">
<meta property="og:title" content="{e(titulo)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{og}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="48x48" href="{pre}img/favicon-48.png">
<link rel="apple-touch-icon" href="{pre}img/apple-touch-icon.png">
<link rel="preload" href="{pre}assets/fonts/archivo-latin-wdth-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{pre}assets/site.css?v={V}">
<link rel="stylesheet" href="{pre}assets/love.css?v={V}">
<link rel="stylesheet" href="{pre}assets/landing.css?v={V}">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>
<body>
<header class="top">
  <div class="island">
    <a class="brand" href="{pre}" aria-label="Mejorativa Love, inicio"><span class="mark mono" aria-hidden="true"></span><b translate="no">Mejorativa</b><i class="love-tag">Love</i></a>
    <nav class="nav" aria-label="Principal"><a href="{pre}modelos/">Modelos</a><a href="{pre}#planes">Planes</a><a class="btn sm" href="{pre}#crear">Crear nuestra invitación</a></nav>
  </div>
</header>
<main class="legal landing" id="contenido">
  <div class="wrap">
{cuerpo}
  </div>
</main>
<footer><div class="wrap"><span>© 2026 <span translate="no">Mejorativa</span> by Miguel Capuro · Hecho en Panamá</span><nav aria-label="Pie de página">
<a href="{pre}">Mejorativa Love</a>{''.join(f'<a href="{pre}{p["slug"]}/">Bodas en {e(p["nombre"])}</a>' for p in PAISES)}<a href="{pre}modelos/">Modelos</a><a href="{pre}aviso/">Aviso y condiciones</a><a href="https://mejorativa.com">mejorativa.com</a></nav></div></footer>
</body>
</html>
"""

def migas(*items):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(items)]}

ORG = {"@type": "Organization", "@id": "https://mejorativa.com/#org", "name": "Mejorativa", "url": "https://mejorativa.com/"}

def ofertas(url):
    return [{"@type": "Offer", "name": NOMBRE_PLAN[k], "price": str(v), "priceCurrency": "USD", "url": url,
             "availability": "https://schema.org/InStock"} for k, v in PRECIO.items()]

def tarjeta_modelo(m, pre):
    img = imagen(m, "thumb-portada") or imagen(m, "portada")
    foto = f'<img src="{pre}{img}" alt="Invitación de boda digital {e(m["name"])}" loading="lazy" width="300" height="400">' if img else f'<span class="ph" aria-hidden="true">{e(m["name"][0])}</span>'
    return f'<a class="mcard" href="{pre}modelos/{m["id"]}/">{foto}<b>{e(m["name"])}</b><small>{e(m["family"])} · desde US${PRECIO[m["plan"]]}</small></a>'

def cta(pre, modelo=None):
    destino = f"{pre}#modelo={modelo}" if modelo else f"{pre}#crear"
    return f'<p class="cta-row"><a class="btn gold" href="{destino}">{"Ver cómo se abre y elegirlo" if modelo else "Crear nuestra invitación"}</a> <a class="btn" href="{pre}#planes">Ver los planes</a></p>'

def planes_html():
    return ("<h2>Planes</h2><ul>"
            "<li><b>Esencial, US$89:</b> hasta 50 invitaciones con nombre y cupos, envío por correo, hasta 5 fotos y 1 ronda de ajustes.</li>"
            "<li><b>Clásico, US$149:</b> hasta 150 invitaciones, envío por WhatsApp, modelos exclusivos, música y hasta 10 fotos.</li>"
            "<li><b>Premium, US$219:</b> hasta 300 invitaciones, número de mesa, recordatorios automáticos y cambio de modelo cuando quieran.</li></ul>")

escritas = []

def escribir(ruta, contenido, prioridad, freq="monthly"):
    destino = os.path.join(RAIZ, ruta, "index.html")
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    open(destino, "w", encoding="utf-8").write(contenido)
    escritas.append((ruta, prioridad, freq))

# ---- páginas de país
alternos = "".join(f'<link rel="alternate" hreflang="{p["hreflang"]}" href="{BASE}/{p["slug"]}/">\n' for p in PAISES) + f'<link rel="alternate" hreflang="x-default" href="{BASE}/">\n'
destacados = [m for m in MODELOS if imagen(m)][:6]
for p in PAISES:
    ruta = f"{p['slug']}/"
    url = f"{BASE}/{ruta}"
    secciones = "".join(f"<h2>{e(t)}</h2><p>{e(c)}</p>" for t, c in p["secciones"])
    faq = "".join(f"<h3>{e(q)}</h3><p>{e(a)}</p>" for q, a in p["faq"])
    cuerpo = f"""    <span class="label">Mejorativa Love · Bodas en {e(p['nombre'])}</span>
    <h1 class="display">{e(p['h1'])}</h1>
    <p class="lead">{e(p['lead'])}</p>
    {cta('../')}
    <div class="body">
      {secciones}
      <h2>Algunos modelos</h2>
      <div class="mgrid">{''.join(tarjeta_modelo(m, '../') for m in destacados)}</div>
      <p><a href="../modelos/">Ver los 21 modelos</a></p>
      {planes_html()}
      <h2>Preguntas frecuentes</h2>
      {faq}
      {cta('../')}
    </div>"""
    ld = {"@context": "https://schema.org", "@graph": [ORG,
        {"@type": "Service", "name": f"Invitaciones de boda digitales en {p['nombre']}", "serviceType": "Invitación de boda digital",
         "provider": {"@id": "https://mejorativa.com/#org"}, "areaServed": {"@type": "Country", "name": p["nombre"]},
         "url": url, "description": p["desc"], "offers": ofertas(url)},
        {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in p["faq"]]},
        migas(("Mejorativa Love", f"{BASE}/"), (f"Bodas en {p['nombre']}", url))]}
    escribir(ruta, pagina(ruta, p["titulo"], p["desc"], cuerpo, ld, 1, alternos, locale=p["locale"]), "0.8")

# ---- catálogo y fichas de modelos
ruta = "modelos/"
grupos = {}
for m in MODELOS:
    grupos.setdefault(m["family"], []).append(m)
bloques = "".join(f"<h2>{e(f)}</h2><div class='mgrid'>{''.join(tarjeta_modelo(m, '../') for m in ms)}</div>" for f, ms in grupos.items())
cuerpo = f"""    <span class="label">Mejorativa Love · Catálogo</span>
    <h1 class="display">21 modelos de invitación de boda digital.</h1>
    <p class="lead">Cada modelo tiene su propio arte y su forma de abrirse: un sobre clásico, un cofre que se rompe a toques o un sobre holográfico que se rasga con el dedo. Toquen uno para ver cómo se abre.</p>
    <div class="body">{bloques}{planes_html()}{cta('../')}</div>"""
ld = {"@context": "https://schema.org", "@graph": [ORG,
    {"@type": "ItemList", "name": "Modelos de invitación de boda digital", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "url": f"{BASE}/modelos/{m['id']}/", "name": m["name"]} for i, m in enumerate(MODELOS)]},
    migas(("Mejorativa Love", f"{BASE}/"), ("Modelos", f"{BASE}/modelos/"))]}
escribir(ruta, pagina(ruta, "21 modelos de invitaciones de boda digitales · Mejorativa Love",
    "Catálogo de invitaciones de boda digitales: elegantes, de lujo, de playa, tropicales, gamer, anime e interactivas. Todas se abren como un sobre en el teléfono. Desde US$89.",
    cuerpo, ld, 1), "0.8", "weekly")

for m in MODELOS:
    ruta = f"modelos/{m['id']}/"
    url = f"{BASE}/{ruta}"
    portada, sobre = imagen(m, "portada"), imagen(m, "sobre")
    fotos = "".join(f'<img src="../../{x}" alt="{e(alt)}" loading="lazy" width="600" height="800">' for x, alt in
                    [(sobre, f"Sobre cerrado de la invitación {m['name']}"), (portada, f"Portada de la invitación de boda {m['name']}")] if x)
    hermanos = [x for x in MODELOS if x["family"] == m["family"] and x["id"] != m["id"]] or [x for x in MODELOS if x["id"] != m["id"]][:3]
    plan = m["plan"]
    nota_plan = "Disponible en todos los planes." if plan == "esencial" else "Exclusivo de los planes Clásico y Premium."
    titulo = f"Invitación de boda digital {m['name']} ({m['family']}) · Mejorativa Love"
    desc = f"{m['blurb']} Invitación de boda digital que se abre en el teléfono de cada invitado, con confirmación de asistencia. Desde US${PRECIO[plan]}."
    cuerpo = f"""    <span class="label"><a href="../">Modelos</a> · {e(m['family'])}</span>
    <h1 class="display">Invitación de boda {e(m['name'])}.</h1>
    <p class="lead">{e(m['blurb'])}</p>
    {f'<div class="fotos">{fotos}</div>' if fotos else ''}
    {cta('../../', m['id'])}
    <div class="body">
      <h2>Qué trae</h2>
      <ul>
        <li>Apertura animada en el teléfono de cada invitado, con su nombre y sus cupos.</li>
        <li>Cuenta regresiva, mapa con Google Maps y Waze, y botón para agregar al calendario.</li>
        <li>Confirmación de asistencia con cantidad de personas, alergias y un mensaje para ustedes.</li>
        <li>Su portal para cargar invitados, enviar las invitaciones y ver quién confirmó.</li>
      </ul>
      <p><b>Precio:</b> desde US${PRECIO[plan]}. {nota_plan}</p>
      <h2>Modelos parecidos</h2>
      <div class="mgrid">{''.join(tarjeta_modelo(x, '../../') for x in hermanos[:3])}</div>
      <p>Bodas en {' · '.join(f'<a href="../../{p["slug"]}/">{e(p["nombre"])}</a>' for p in PAISES)}</p>
    </div>"""
    img_og = f"{BASE}/{portada}" if portada else None
    ld = {"@context": "https://schema.org", "@graph": [ORG,
        {"@type": "Product", "name": f"Invitación de boda digital {m['name']}", "description": m["blurb"], "category": f"Invitaciones de boda digitales · {m['family']}",
         "brand": {"@type": "Brand", "name": "Mejorativa Love"}, **({"image": img_og} if img_og else {}),
         "offers": {"@type": "Offer", "price": str(PRECIO[plan]), "priceCurrency": "USD", "url": url, "availability": "https://schema.org/InStock"}},
        migas(("Mejorativa Love", f"{BASE}/"), ("Modelos", f"{BASE}/modelos/"), (m["name"], url))]}
    escribir(ruta, pagina(ruta, titulo, desc, cuerpo, ld, 2, imagen_og=img_og), "0.6")

# ---- sitemap
filas = [("", "1.0", "weekly")] + escritas + [("aviso/", "0.3", "yearly")]
xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
xml += [f"  <url><loc>{BASE}/{r}</loc><lastmod>{HOY}</lastmod><changefreq>{f}</changefreq><priority>{pr}</priority></url>" for r, pr, f in filas]
xml.append("</urlset>")
open(os.path.join(RAIZ, "sitemap.xml"), "w").write("\n".join(xml) + "\n")
print(f"{len(escritas)} páginas y sitemap con {len(filas)} URL")
