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

## Actualización automática

Una tarea programada de Claude se ejecuta los días laborables a las 08:41 y a las 17:41 (hora de Madrid):
busca los datos publicados del calendario de la semana, los añade a `data/calendario_actuales.json`,
ejecuta `python scripts/aplicar_actuales.py` y hace push. Pages se redespliega solo.

Lo que sigue siendo manual (semanal): el Excel del calendario de la semana nueva y los boletines PDF.
