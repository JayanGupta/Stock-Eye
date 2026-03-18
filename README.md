<p align="center">
  <h1 align="center">📦 Stock-Eye</h1>
  <p align="center">
    <strong>Intelligent Warehouse Inventory System & AI Demand Forecasting</strong>
  </p>
  <p align="center">
    <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI"></a>
    <a href="https://www.statsmodels.org/"><img src="https://img.shields.io/badge/statsmodels-333333?style=for-the-badge" alt="statsmodels"></a>
    <a href="https://opencv.org/"><img src="https://img.shields.io/badge/opencv-%23white.svg?style=for-the-badge&logo=opencv&logoColor=white" alt="OpenCV"></a>
    <a href="https://www.sqlite.org/"><img src="https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite"></a>
    <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript"><img src="https://img.shields.io/badge/vanilla%20js-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E" alt="Vanilla JS"></a>
    <a href="https://www.chartjs.org/"><img src="https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white" alt="Chart.js"></a>
  </p>
</p>

---

## 🌟 Overview

**Stock-Eye** is a next-generation warehouse management system that blends modern professional UI paradigms with real-world Machine Learning and Computer Vision. Designed to be completely stand-alone and portable, it requires zero external databases while delivering enterprise-grade analytics, computer vision item counting, predictive ML forecasting, and PDF billing functionalities.

## ✨ Key Features

- **🤖 YOLOv8 Computer Vision Detection**: Upload images of your warehouse to automatically detect and count inventory using state-of-the-art YOLOv8 models. Includes a dynamic filtering system to isolate distinct objects.
- **📈 Real ML Demand Forecasting**: Stock-Eye utilizes advanced **`statsmodels`** Exponential Smoothing to evaluate relationships between historical monthly stock depletion and wastage, yielding highly accurate restocking recommendations with generated **ML Confidence Scores**.
- **💵 Billing Terminal**: Integrated PDF invoice generation utilizing `reportlab`. Admins can dynamically select items, compute totals, and instantly download a professional corporate bill.
- **📊 Interactive Analytics Dashboard**: A pristine, professional corporate-themed single-page application (SPA) running on the Roboto typeface. Dynamically slice data with toggle buttons using Chart.js.
- **🚀 Ultra-Fast FastAPI Backend**: Engineered with asynchronous Python routing for maximum performance.
- **🗃️ Zero-Config SQLite Database**: No MongoDB or Postgres needed. The system auto-seeds an internal embedded database using your initial `.csv` files.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| **Backend** | `FastAPI` | Asynchronous high-performance Python web framework (Fully natively-typed) |
| **Machine Learning** | `statsmodels` | Exponential Smoothing predictive modeling for demand forecasting & risk analysis |
| **Computer Vision** | `ultralytics` (YOLOv8), `OpenCV` | Real-time object and class detection |
| **PDF Generation** | `reportlab` | Programmatic PDF invoice generation |
| **Frontend** | `HTML5`, `CSS3`, `Vanilla JS` | SPA architecture with a clean, professional corporate aesthetic |
| **Data Viz** | `Chart.js` | Interactive, responsive dashboard charting |
| **Database** | `SQLite3` | Built-in, zero-configuration local database |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- YOLOv3 weights (Optional, required only for detection endpoint)

### 1. Installation

Clone the repository and install the dependencies:
```bash
git clone https://github.com/yourusername/Stock-Eye.git
cd Stock-Eye
pip install -r requirements.txt
```

### 2. Run the Server
Launch the FastAPI development server using Uvicorn:
```bash
python -m uvicorn src.backend.main:app --reload --port 8000
```
*Note: On its first run, Stock-Eye will automatically parse the `inventory` CSV in the root directory, generate realistic historical sales data, and seed the SQLite database. The YOLOv8 model weights will also be downloaded automatically on the first computer vision request.*

### 3. View the App
Open your web browser and navigate to:
**[http://localhost:8000](http://localhost:8000)**

---

## 🏗️ Project Architecture

```
Stock-Eye/
├── src/
│   ├── backend/
│   │   ├── main.py              # FastAPI core app & static routing
│   │   ├── config.py            # Environment configurations
│   │   ├── database.py          # SQLite connections & table schemas
│   │   ├── seed.py              # CSV -> DB initialization
│   │   ├── routes/              # API Endpoints (Inventory, Analytics, Detect, Billing)
│   │   ├── services/            # ML Forecaster & YOLOv8 Detector Logic
│   │   └── models/              # Pydantic Schemas for validation
│   ├── frontend/
│   │   ├── index.html           # SPA Main Dashboard
│   │   ├── css/styles.css       # Custom Corporate Theme
│   │   └── js/app.js            # Fetch logic, Chart.js, & Terminal UI
│   └── data/                      # Auto-downloaded YOLOv8 weights directory
├── inventory                    # Original seed CSV file
└── requirements.txt             # Python dependencies
```

---

## 🔮 Roadmap

- [x] Integrate `statsmodels` for intelligent stock demand curves using Exponential Smoothing.
- [x] Implement modern, professional corporate UI.
- [x] Add real-time UI data toggles (Revenue / Volume).
- [x] Distinct customizable filters for YOLO object counting.
- [x] Export reports & PDF invoices.
- [ ] Multi-warehouse location tracking.

---

<p align="center">
  Built with ❤️ using Python & FastAPI.
</p>
