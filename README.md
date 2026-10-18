# Wahlblick

Mapa interactivo de resultados electorales de Alemania — federal y por estado (Land).

🌐 **[wahlblick.de](https://wahlblick.de)**

---

## Qué muestra

- Resultados del **Bundestag** (elecciones federales) y de las **Landtagswahlen** (elecciones estatales)
- Distribución de escaños, composición de gobierno y datos por partido
- Contenido disponible en **alemán, español e inglés** (DE / ES / EN)

Todos los datos provienen de fuentes oficiales verificadas: Bundeswahlleiterin, Bundestag, Landeswahlleitungen y BVerfG. No se publica ningún dato sin contrastar su origen.

## Stack técnico

- HTML + CSS + JS estático — sin frameworks, sin build step
- Una Cloudflare Pages Function (`functions/_middleware.js`) para inyección de navegación
- Despliegue automático vía Cloudflare Pages: push a `main` = producción inmediata

## Correr localmente

Requiere [Node.js](https://nodejs.org) y [Wrangler](https://developers.cloudflare.com/workers/wrangler/):

```bash
npx wrangler pages dev . --port 8788
```

Un servidor estático simple no ejecuta las Functions — la navegación y el botón de compartir se verán rotos.

## Licencia

Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — © Pablo Churin, [Guía Tecnológico](https://guiatecnologico.com)
