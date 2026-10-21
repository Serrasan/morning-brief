#!/usr/bin/env python3
"""
Aplica data/calendario_actuales.json sobre data/calendario.js sin necesitar el Excel.
Lo usa la actualización automática (2 veces al día) para volcar los datos publicados.

    python scripts/aplicar_actuales.py

Formato de calendario_actuales.json (clave = fecha|país|dato, tal como aparece en calendario.js):
    "2026-10-21|UK|IPC YoY": "3,50%"
    "2026-10-21|UK|IPC MoM": {"actual": "0,40%", "est": "0,30%"}   # est solo si el Excel no lo trae
"""
import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CAL = ROOT / "data" / "calendario.js"
ACT = ROOT / "data" / "calendario_actuales.json"

txt = CAL.read_text(encoding="utf-8")
data = json.loads(txt[txt.index("{"): txt.rindex("}") + 1])
actuales = json.loads(ACT.read_text(encoding="utf-8"))

n = 0
for dia in data["dias"]:
    for ev in dia["eventos"]:
        a = actuales.get(ev["id"])
        if a is None:
            continue
        if isinstance(a, dict):
            if not ev.get("est") and a.get("est"):
                ev["est"] = a["est"]
                ev["est_fuente"] = "mercado"
            a = a.get("actual", "")
        if a:
            ev["actual"] = a
            n += 1

data["actualizado"] = dt.datetime.now().strftime("%Y-%m-%d %H:%M")
CAL.write_text(
    "// Generado por scripts/actualizar_calendario.py — no editar a mano\n"
    "window.CALENDARIO = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n",
    encoding="utf-8",
)
print(f"OK · {n} datos publicados aplicados · semana {data['semana']}")
