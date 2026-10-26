# Morning Brief · Tesorería y Mercados

Dashboard diario con los boletines semanales de Tesorería: tipos y bancos centrales, curvas soberanas, mercados, macro, calendario semanal y renta fija elegible.

App 100% estática (HTML + CSS + JS, sin build). Chart.js va incluido en `assets/vendor`, así que funciona sin conexión.

## Uso

Abre `index.html` con doble clic. También puedes servirla en local:

```bash
python -m http.server 8000   # y abre http://localhost:8000
```

Pestañas: Resumen · Tipos y curvas · Mercados · Macro · Calendario · Renta fija. El tema claro/oscuro se recuerda por navegador.
Para simular otra fecha: `index.html?fecha=2026-10-21&hora=09:40`.

## Estructura

```
index.html
assets/        styles.css, app.js, vendor/chart.umd.min.js
data/
  boletin.js                 datos de los boletines (Mercados, Macro, RF corporativa, Deuda pública)
  calendario.js              generado desde el Excel, no editar a mano
  calendario_actuales.json   datos publicados (campo "actual"), se conservan entre regeneraciones
config/
  calendario.json            criterios del calendario: países, exclusiones e importancia
scripts/
  actualizar_calendario.py   Excel -> data/calendario.js
```

## Actualización semanal

1. **Boletines**: actualiza `data/boletin.js` con los PDF nuevos (misma estructura).
2. **Calendario**:

   ```bash
   pip install openpyxl
   python scripts/actualizar_calendario.py "ruta/CALENDARIO_SEMANAL.xlsx"            # semana de hoy
   python scripts/actualizar_calendario.py "ruta.xlsx" --hoja "26 - 30 Octubre" --anio 2026
   ```

   El script localiza la hoja por nombre (`19 - 23 Octubre`), lee los bloques Hora/País/Dato/Periodo/Est./Último de cada día y aplica `config/calendario.json`.
3. **Datos publicados**: añade a `data/calendario_actuales.json` la clave `fecha|país|dato` → valor. Ejemplo:
   `{"2026-10-21|UK|IPC YoY": "3,30%"}`. La app calcula la sorpresa contra el consenso.

## Web (GitHub Pages)

https://serrasan.github.io/morning-brief/ — se publica desde la rama `main` (Settings → Pages → Deploy from a branch → `main` / `root`).

## Actualización automática (GitHub Actions)

El workflow `.github/workflows/actualizar.yml` se ejecuta de lunes a viernes a las 07:15 y 16:15 UTC
(09:15 y 18:15 en Madrid en verano; 08:15 y 17:15 en invierno). También se puede lanzar a mano desde Actions → Run workflow.

1. **Mercados**: `scripts/actualizar_mercados.py` descarga de Yahoo Finance bolsas, divisas, materias primas, VIX y UST 10A
   → `data/mercados.js`. La app usa estos valores en lugar de los del boletín.
2. **Datos publicados del calendario** (opcional): si el repo tiene el secreto `ANTHROPIC_API_KEY`
   (Settings → Secrets and variables → Actions), Claude busca los datos ya publicados y los vuelca con `scripts/aplicar_actuales.py`.
3. Commit y push automáticos → GitHub Pages se redespliega solo.

## Resumen diario (tarea programada de Claude)

De lunes a viernes por la mañana, una tarea programada de Claude:
- reescribe `data/resumen.js` (titular + claves del día) a partir de prensa y de los datos del repo;
- rellena los datos publicados del día anterior en `data/calendario_actuales.json`;
- si no hay Excel de la semana, construye el calendario en `data/calendario_semana.json` y ejecuta `python scripts/calendario_desde_json.py`;
- hace commit y push a `main`.

Lo que sigue siendo manual (semanal): los boletines PDF. Si se aporta el Excel del calendario, tiene prioridad sobre el calendario de prensa.
