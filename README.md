# 📦 Stock-Eye — Intelligent Warehouse Inventory System

<p>
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenCV-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white" />
  <img src="https://img.shields.io/badge/Scikit--Learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white" />
  <img src="https://img.shields.io/badge/XGBoost-189FAD?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Statsmodels-3A3A3A?style=for-the-badge" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Streamlit-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white" />
</p>

### *Computer vision–driven inventory tracking with demand forecasting.*

Stock-Eye is an end-to-end ML system that combines **object detection + time-series forecasting + sales analytics** to automate warehouse inventory management and optimize restocking decisions.

---

## 🚀 Overview

* **Vision Pipeline** → Detects & tracks items (bounding boxes + count estimation)
* **Forecasting Engine** → Predicts future demand using historical sales
* **Analytics Layer** → Identifies top-performing SKUs and category trends

---

## 🏗️ Architecture

```
Stock-Eye/
│── app.py              # FastAPI/Flask app entrypoint
│── realtime.py         # Real-time detection & tracking pipeline
│── imagedetection.py   # Image-based object detection logic
│── prediction.py       # Demand forecasting module
│── database.py         # Inventory data handling (CRUD/storage)
│── Example.ipynb       # Experimentation & prototyping notebook
│── UI.html / style.css # Frontend dashboard (basic UI)
│── coco.names          # YOLO class labels
│── yolov3.cfg          # YOLO model configuration
│── items.png           # Sample input / visualization asset
│── inventory/          # Stored inventory data / assets
│── results/            # Outputs: metrics, reports, plots
```
---

## 🔍 Core Modules (Implementation-Level)

### 📸 Inventory Tracking (CV)
- Object detection using OpenCV-based pipelines  
- Frame-wise tracking → inventory count estimation  
- Handles spatial positioning and item movement

### 📈 Demand Forecasting
- Time-series modeling (trend + seasonality decomposition)  
- ML regressors for demand prediction  
- Outputs restocking thresholds and alerts

### 📊 Sales Intelligence
- Monthly aggregation + category-level analysis  
- Top-K product identification  
- Visualization of demand distribution and trends

---

## 📊 Key Results

- **Forecast Accuracy** → Reliable demand predictions for restocking  
- **Tracking Performance** → High precision in item detection & counting  
- **Business Insight** → Clear identification of high-demand SKUs

---

## 🧠 Technical Stack

**CV & ML:** OpenCV, Scikit-learn, XGBoost, Statsmodels  
**Data:** Pandas, NumPy, Matplotlib  
**Serving:** FastAPI, Streamlit  

---

## 💡 Impact

- Reduced manual inventory effort via automation  
- Improved stock availability through predictive insights  
- Enabled data-driven warehouse optimization  

---

## 🔮 Next Steps

- Edge deployment with CCTV streams  
- Real-time inference pipeline  
- ERP integration for production workflows

---

*Bridging perception (vision) with prediction (forecasting) for intelligent operations.*

```
