# Data directory

Place Kaggle CSVs here. They are gitignored.

If `%USERPROFILE%\.kaggle\kaggle.json` exists, `python scripts\load_kaggle.py` will try:

- [orvile/packaging-industry-anomaly-detection-dataset](https://www.kaggle.com/datasets/orvile/packaging-industry-anomaly-detection-dataset)
- [ziya07/smart-manufacturing-resource-efficiency-dataset](https://www.kaggle.com/datasets/ziya07/smart-manufacturing-resource-efficiency-dataset)

Without a Kaggle token the loader writes mill-native telemetry plus PIADE-shaped stand-in files (`piade_raw.csv`, `smart_manufacturing_resource_efficiency.csv`) so the 60s SQL replay still runs.
