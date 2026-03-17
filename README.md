<p align="center">
  <h1 align="center">📦 Stock-Eye</h1>
  <p align="center">
    <strong>Intelligent Warehouse Inventory System & AI Demand Forecasting</strong>
  </p>
  <p align="center">
    <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI"></a>
    <a href="https://scikit-learn.org/"><img src="https://img.shields.io/badge/scikit--learn-%23F7931E.svg?style=for-the-badge&logo=scikit-learn&logoColor=white" alt="scikit-learn"></a>
    <a href="https://opencv.org/"><img src="https://img.shields.io/badge/opencv-%23white.svg?style=for-the-badge&logo=opencv&logoColor=white" alt="OpenCV"></a>
    <a href="https://www.sqlite.org/"><img src="https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite"></a>
    <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript"><img src="https://img.shields.io/badge/vanilla%20js-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E" alt="Vanilla JS"></a>
    <a href="https://www.chartjs.org/"><img src="https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chartdotjs&logoColor=white" alt="Chart.js"></a>
  </p>
</p>

---

## 🌟 Overview

**Stock-Eye** is a next-generation warehouse management system that blends modern UI paradigms with real-world Machine Learning and Computer Vision. Designed to be completely completely stand-alone and portable, it requires zero external databases while delivering enterprise-grade analytics, computer vision item counting, and predictive ML forecasting.

## ✨ Key Features

- **🤖 YOLOv3 Computer Vision Detection**: Upload images of your warehouse to automatically detect and count inventory. Includes a dynamic filtering system to isolate distinct objects (e.g., searching specifically for `"person, car"`).
- **📈 Real ML Demand Forecasting**: Unlike basic averaging systems, Stock-Eye utilizes **`scikit-learn`** Linear Regression models to evaluate relationships between historical stock depletion and wastage, yielding highly accurate restocking recommendations with generated **ML Confidence Scores**.
- **📊 Interactive Analytics Dashboard**: A premium, "glassmorphism" dark-themed single-page application (SPA) featuring smooth micro-animations. Dynamically slice data with toggle buttons (e.g. switching between Revenue vs Volume views on the fly) using Chart.js.
- **🚀 Ultra-Fast FastAPI Backend**: Engineered with asynchronous Python routing for maximum performance.
- **🗃️ Zero-Config SQLite Database**: No MongoDB or Postgres needed. The system auto-seeds an internal embedded database using your initial `.csv` files.

---

## 🛠️ Tech Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| **Backend** | `FastAPI` | Asynchronous high-performance Python web framework |
| **Machine Learning** | `scikit-learn`, `numpy`, `pandas` | Predictive modeling for demand forecasting & risk analysis |
| **Computer Vision** | `OpenCV` (YOLOv3) | Real-time object and class detection |
| **Frontend** | `HTML5`, `CSS3`, `Vanilla JS` | SPA architecture with custom dark glassmorphism theme |
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

### 2. Download YOLOv3 Weights (For Detection Feature)
To use the Object Detection service, you must download the YOLOv3 weights file (`~237MB`) into the **`src/data/`** directory.
```bash
# Download the official weights file (requires wget or manual download)
wget https://pjreddie.com/media/files/yolov3.weights -O src/data/yolov3.weights
```

### 3. Run the Server
Launch the FastAPI development server using Uvicorn:
```bash
python -m uvicorn src.backend.main:app --reload --port 8000
```
*Note: On its first run, Stock-Eye will automatically parse the `inventory` CSV in the root directory and seed the SQLite database.*

### 4. View the App
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
│   │   ├── routes/              # API Endpoints (Inventory, Analytics, Detect)
│   │   ├── services/            # ML Forecaster & YOLOv3 Detector Logic
│   │   └── models/              # Pydantic Schemas for validation
│   ├── frontend/
│   │   ├── index.html           # SPA Main Dashboard
│   │   ├── css/styles.css       # Custom Glassmorphism Theme
│   │   └── js/app.js            # Fetch logic & Chart.js instances
│   └── data/
│       ├── coco.names           # YOLO label classes (80 objects)
│       └── yolov3.cfg           # YOLO network configuration
├── inventory                    # Original seed CSV file
└── requirements.txt             # Python dependencies
```

---

## 🔮 Roadmap

- [x] Integrate `scikit-learn` for intelligent stock demand curves.
- [x] Implement glassmorphic responsive UI.
- [x] Add real-time UI data toggles (Revenue / Volume).
- [x] Distinct customizable filters for YOLO object counting.
- [ ] Export reports (PDF / Excel).
- [ ] Multi-warehouse location tracking.

---

<p align="center">
  Built with ❤️ using Python & FastAPI.
</p>
