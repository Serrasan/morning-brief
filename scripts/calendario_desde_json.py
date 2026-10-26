#!/usr/bin/env python3
"""
Genera data/calendario.js a partir de data/calendario_semana.json (sin Excel).
Se usa cuando no hay Excel del calendario de la semana: la tarea diaria lo construye a partir de prensa.

    python scripts/calendario_desde_json.py

Formato de data/calendario_semana.json:
{
  "semana": "2026-10-26",            # lunes
  "fuente": "texto que se muestra como fuente",
  "dias": {
    "2026-10-26": [ {"hora": "10:00", "pais": "DE", "dato": "Ifo Clima empresarial", "periodo": "Oct",
                     "est": "89,8", "ultimo": "89,9", "imp": "alta"}, ... ],
    ...
  }
}
"imp" es opcional: si falta, se aplica config/calendario.json. Los datos publicados se toman de
data/calendario_actuales.json (misma clave fecha|país|dato).
"""
import datetime as dt
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from actualizar_calendario import importancia  # noqa: E402

SRC = ROOT / "data" / "calendario_semana.json"
CONFIG = ROOT / "config" / "calendario.json"
ACT = ROOT / "data" / "calendario_actuales.json"
OUT = ROOT / "data" / "calendario.js"
DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]

src = json.loads(SRC.read_text(encoding="utf-8"))
reglas = json.loads(CONFIG.read_text(encoding="utf-8")) if CONFIG.exists() else {}
actuales = json.loads(ACT.read_text(encoding="utf-8")) if ACT.exists() else {}
lunes = dt.date.fromisoformat(src["semana"])

dias_out = []
n = 0
for i, nombre in enumerate(DIAS):
    d = (lunes + dt.timedelta(days=i)).isoformat()
    eventos = []
    for e in src["dias"].get(d, []):
        ev = {k: str(e.get(k, "") or "") for k in ("hora", "pais", "dato", "periodo", "est", "ultimo")}
        ev["id"] = f'{d}|{ev["pais"]}|{ev["dato"]}'
        ev["imp"] = e.get("imp") or importancia(ev, reglas)
        a = actuales.get(ev["id"], "")
        if isinstance(a, dict):
            if not ev["est"] and a.get("est"):
                ev["est"], ev["est_fuente"] = a["est"], "mercado"
            a = a.get("actual", "")
        ev["actual"] = a
        eventos.append(ev)
    eventos.sort(key=lambda x: x["hora"] or "99:99")
    n += len(eventos)
    dias_out.append({"fecha": d, "dia": nombre, "eventos": eventos})

payload = {
    "hoja": None,
    "fuente": src.get("fuente", ""),
    "semana": lunes.isoformat(),
    "generado": dt.datetime.now().strftime("%Y-%m-%d %H:%M"),
    "dias": dias_out,
}
OUT.write_text(
    "// Generado por scripts/calendario_desde_json.py — no editar a mano\n"
    "window.CALENDARIO = " + json.dumps(payload, ensure_ascii=False, indent=1) + ";\n",
    encoding="utf-8",
)
print(f"OK · semana {lunes:%d/%m/%Y} · {n} eventos -> data/calendario.js")
