<div align="center">

# Stock-Eye — Intelligent Warehouse Inventory & AI Demand Forecasting

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Computer%20Vision-00FFFF?style=for-the-badge&logo=opencv&logoColor=black)](https://ultralytics.com)
[![statsmodels](https://img.shields.io/badge/statsmodels-Forecasting-333333?style=for-the-badge)](https://www.statsmodels.org)
[![SQLite](https://img.shields.io/badge/SQLite-07405e?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org)
[![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white)](https://chartjs.org)
[![Status](https://img.shields.io/badge/Status-Complete-2ea44f?style=for-the-badge)]()

*A self-contained warehouse management system combining YOLOv8 computer vision, Exponential Smoothing demand forecasting, PDF billing, and an interactive analytics dashboard — with zero external database dependencies.*

</div>

---

Stock-Eye is a full-stack warehouse management application built on FastAPI. It integrates computer vision-based inventory counting, ML-driven restocking recommendations, and PDF invoice generation into a single portable system. The SQLite backend is auto-seeded from CSV data on first run, requiring no external database configuration.

---

## Table of Contents

- [Background](#background)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Background

Warehouse inventory management typically requires heavyweight ERP systems or fragmented tooling across counting, forecasting, and billing workflows. Stock-Eye consolidates these into a single, self-contained application deployable with a single command.

The system is designed around three core capabilities: automated object detection for physical stock counting, time-series forecasting for demand prediction, and integrated billing — all surfaced through a clean SPA frontend with no external service dependencies.

---

## Features

| Feature | Description |
|---------|-------------|
| Computer Vision Counting | Upload warehouse images; YOLOv8 detects and counts distinct inventory items automatically |
| ML Demand Forecasting | Exponential Smoothing models historical stock depletion and wastage to generate restocking recommendations with ML confidence scores |
| Billing Terminal | PDF invoice generation via `reportlab` — select items, compute totals, and download a formatted corporate bill |
| Analytics Dashboard | Single-page application with Chart.js visualizations; toggle between revenue and volume views dynamically |
| Zero-Config Database | SQLite auto-seeded from the inventory CSV on first run — no Postgres or MongoDB required |
| Async Backend | FastAPI with fully typed asynchronous routing for high-throughput request handling |

---

## Tech Stack

| Layer | Technology | Role |
|-------|------------|------|
| Backend | FastAPI + Uvicorn | Async Python web framework and ASGI server |
| Machine Learning | statsmodels | Exponential Smoothing for demand forecasting and risk analysis |
| Computer Vision | Ultralytics YOLOv8, OpenCV | Real-time object detection and class-level inventory counting |
| PDF Generation | reportlab | Programmatic invoice and report generation |
| Frontend | HTML5, CSS3, Vanilla JS | SPA architecture with corporate-themed UI |
| Data Visualisation | Chart.js | Interactive, responsive dashboard charting |
| Database | SQLite3 | Embedded, zero-configuration local database |

---

## Project Structure

```
Stock-Eye/
├── src/
│   ├── backend/
│   │   ├── main.py              # FastAPI core app and static routing
│   │   ├── config.py            # Environment configuration
│   │   ├── database.py          # SQLite connection and table schemas
│   │   ├── seed.py              # CSV → database initialization
│   │   ├── routes/              # API endpoints — inventory, analytics, detection, billing
│   │   ├── services/            # ML forecaster and YOLOv8 detector logic
│   │   └── models/              # Pydantic schemas for request/response validation
│   ├── frontend/
│   │   ├── index.html           # SPA main dashboard
│   │   ├── css/styles.css       # Corporate theme stylesheet
│   │   └── js/app.js            # Fetch logic, Chart.js integration, terminal UI
│   └── data/                    # Auto-downloaded YOLOv8 model weights
├── inventory.csv                # Seed data for initial database population
└── requirements.txt             # Python dependencies
```

---

## Installation

**Prerequisites:** Python 3.9+

YOLOv8 model weights are downloaded automatically on the first computer vision request — no manual setup required.

Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/Stock-Eye.git
cd Stock-Eye
pip install -r requirements.txt
```

---

## Usage

**Start the server:**

```bash
python -m uvicorn src.backend.main:app --reload --port 8000
```

On first run, Stock-Eye will:
1. Parse the `inventory.csv` file in the root directory
2. Generate realistic historical sales data
3. Auto-seed the SQLite database

**Open the dashboard:**

Navigate to [http://localhost:8000](http://localhost:8000) in your browser.

**Computer vision detection:**

Upload a warehouse image through the Detection panel. The system will run YOLOv8 inference and return a per-class item count with configurable object filters.

**Demand forecasting:**

The Analytics panel surfaces Exponential Smoothing forecasts for each inventory item, with confidence scores and restocking recommendations derived from historical depletion and wastage data.

**Billing:**

Use the Billing Terminal to select items, auto-compute totals, and download a formatted PDF invoice.

---

## Roadmap

- [x] `statsmodels` Exponential Smoothing for demand forecasting
- [x] Corporate SPA UI with real-time data toggles
- [x] Customizable YOLO object detection filters
- [x] PDF invoice and report export
- [ ] Multi-warehouse location tracking
- [ ] Role-based access control for admin vs. viewer accounts
- [ ] REST API authentication via OAuth2 / API keys
- [ ] Docker containerisation for one-command deployment

---

## Contributing

Contributions are welcome. Please open an issue to discuss proposed changes before submitting a pull request. Ensure any new code is accompanied by clear inline documentation.

---

## License

This project is released for academic and research purposes. See `LICENSE` for details.
