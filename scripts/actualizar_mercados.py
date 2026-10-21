#!/usr/bin/env python3
"""
Descarga cierres de mercado (Yahoo Finance) y genera data/mercados.js.
La app usa estos valores en lugar de los del boletín cuando están disponibles.

    pip install yfinance
    python scripts/actualizar_mercados.py

Si un ticker falla, se conserva el valor anterior (o el del boletín).
"""
import datetime as dt
import json
from pathlib import Path

import yfinance as yf

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "mercados.js"

# nombre en la app -> ticker Yahoo
TICKERS = {
    "bolsas": {
        "IBEX 35": "^IBEX", "Euro Stoxx 50": "^STOXX50E", "DAX": "^GDAXI", "CAC 40": "^FCHI",
        "FTSE MIB": "FTSEMIB.MI", "S&P 500": "^GSPC", "Nasdaq": "^IXIC", "Dow Jones": "^DJI",
        "Nikkei": "^N225", "Hang Seng": "^HSI",
    },
    "divisas": {
        "EUR/USD": "EURUSD=X", "EUR/GBP": "EURGBP=X", "EUR/CHF": "EURCHF=X",
        "EUR/JPY": "EURJPY=X", "EUR/NOK": "EURNOK=X", "EUR/SEK": "EURSEK=X",
    },
    "materias": {
        "Brent": "BZ=F", "WTI": "CL=F", "Gas natural": "TTF=F", "Oro": "GC=F", "Plata": "SI=F",
    },
    "vol": {"VIX": "^VIX"},
    "tipos": {"UST 10A": "^TNX"},
}


def ref_close(closes, last_date, days):
    """Último cierre en o antes de last_date - days."""
    target = last_date - dt.timedelta(days=days)
    s = closes[closes.index.date <= target]
    return float(s.iloc[-1]) if len(s) else None


def serie(ticker):
    h = yf.Ticker(ticker).history(period="13mo", interval="1d", auto_adjust=False)
    c = h["Close"].dropna()
    if c.empty:
        raise ValueError("sin datos")
    last_date = c.index[-1].date()
    last = float(c.iloc[-1])
    out = {"v": last, "fecha": last_date.isoformat()}
    for k, d in (("sem", 7), ("mes", 30), ("anio", 365)):
        out[k] = ref_close(c, last_date, d)
    return out


def main():
    prev = {}
    if OUT.exists():
        t = OUT.read_text(encoding="utf-8")
        try:
            prev = json.loads(t[t.index("{"): t.rindex("}") + 1])
        except ValueError:
            prev = {}
    res = {"actualizado": dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ")}
    ok = fail = 0
    for grupo, items in TICKERS.items():
        res[grupo] = {}
        for nombre, tk in items.items():
            try:
                res[grupo][nombre] = serie(tk)
                ok += 1
            except Exception as e:  # noqa: BLE001
                fail += 1
                old = (prev.get(grupo) or {}).get(nombre)
                if old:
                    res[grupo][nombre] = old
                print(f"  aviso: {nombre} ({tk}) -> {e}")
    OUT.write_text(
        "// Generado por scripts/actualizar_mercados.py (Yahoo Finance) — no editar a mano\n"
        "window.MERCADOS = " + json.dumps(res, ensure_ascii=False, indent=1) + ";\n",
        encoding="utf-8",
    )
    print(f"OK · {ok} tickers actualizados, {fail} con error -> data/mercados.js")


if __name__ == "__main__":
    main()
