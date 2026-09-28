# Cardboard Factory — Plant Operations Dashboard

Schneider Electric · AVEVA styled **live SCADA analytics** for a cardboard / corrugated mill. Telemetry is remapped from public manufacturing datasets (or a generated mill twin if Kaggle is not configured), stored in **SQL Server**, and replayed on a **60-second cycle**.

## Features

- Overview matching the plant-operations screenshot (KPI tiles, live line, gauges, donuts)
- Production, Process, Energy, Utilities, OEE, Sustainability, Alarms, Reports
- In use / Ready / Broken status colors
- Light and dark themes; factory-floor photo on Overview, Process, Sustainability
- Header poll countdown; backend loops the dataset when it ends

## Stack

| Layer | Tech |
|---|---|
| UI | React 18, Vite, Tailwind, Recharts |
| API | FastAPI on `127.0.0.1:8787` |
| Data | SQL Server (`cardboard_plant`) + 60s replay |

## Datasets

- [PIADE packaging anomaly detection](https://www.kaggle.com/datasets/orvile/packaging-industry-anomaly-detection-dataset) — speed, downtime, alarms
- [Smart manufacturing resource efficiency](https://www.kaggle.com/datasets/ziya07/smart-manufacturing-resource-efficiency-dataset) — energy, recycled/virgin material, defects

Place Kaggle CSVs in `data/` or run the loader (generates compatible CSVs if the Kaggle CLI token is missing).

## Setup

```powershell
cd "c:\Users\moham\Desktop\adel project"
py -3.11 -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# edit MILL_DB_* if needed (default: Windows auth, localhost, cardboard_plant)

python scripts\load_kaggle.py
cd web
npm install
npm run build
cd ..
python scripts\run_api.py
```

Open **http://127.0.0.1:8787/**

Frontend dev (hot reload, proxies `/api` to port 8787):

```powershell
cd web
npm run dev
```

## SQL

`sql/001_schema.sql` is applied automatically on load. Requires **ODBC Driver 17 or 18** and a reachable SQL Server instance.
