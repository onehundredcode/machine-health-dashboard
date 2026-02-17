---

# ⚙️ PressWatch – Machine Health Dashboard

PressWatch is a frontend web application that simulates a machine health monitoring system for industrial equipment (e.g., vinyl press lines, boilers, pumps, compressors).

This project focuses on dynamic UI rendering, state management, and intelligent data interpretation using vanilla JavaScript.

---

## 📊 Features

* **Dynamic KPI Dashboard**

  * Total machines
  * Healthy / Warning / Down counts
  * Maintenance due soon

* **Search + Filter + Sort**

  * Filter by status
  * Search by name, type, or location
  * Sort by health score, maintenance date, criticality, or name

* **Machine Detail Drawer**

  * AI-assisted health summary
  * Alerts overview
  * Sensor snapshot
  * Maintenance + inspection details

* **Simulated Telemetry Model**

  * Machine data is structured to resemble real-world industrial monitoring systems
  * Health scores and alerts are derived from sensor values

---

## 🧠 Architecture Overview

This project uses a state-driven rendering pattern:

State → Derived Data → Render → Event → State Update → Re-render

Core components:

* Centralized `state` object
* Derived filtering + sorting functions
* Deterministic render cycle (`renderAll`)
* Conditional styling based on machine status
* Modular utility functions for formatting + calculations

No frontend framework was used. This was intentionally built in vanilla JS to strengthen core architecture fundamentals.

---

## 🛠️ Tech Stack

* HTML5
* CSS3 (custom styling, layout, UI components)
* Vanilla JavaScript (ES Modules)
* Local data module (`machines.js`)

---

## 🎯 Project Goals

* Practice real-world dashboard architecture
* Model industrial telemetry data
* Implement dynamic UI behavior without a framework
* Simulate intelligent machine health interpretation
* Validate MVP design before expanding to real-time data

---

## 🚀 Future Improvements

Planned enhancements:

* 🔄 Real-time telemetry refresh (live sensor simulation or API integration)
* 🎨 Improved button and control styling
* 🌐 API-based data fetching instead of static seed data
* 🧠 Replace heuristic AI summary with real ML inference or API integration
* ⚛️ Optional React version for production scalability

---

## 💡 Why This Project Matters

PressWatch demonstrates:

* State management without a framework
* Derived UI rendering patterns
* Data-driven interface logic
* Realistic domain modeling
* Structured frontend architecture

It serves as a foundation for evolving into a production-ready monitoring system.


