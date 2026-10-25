# ⚡ Spendorio - Full-Stack Offline-First Routine & Cost Management PWA

[![Java](https://img.shields.io/badge/Java-25_LTS-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.3.4-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![PWA](https://img.shields.io/badge/PWA-Offline_First-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

> A modern, full-stack personal finance and daily routine management platform built with an **Offline-First Progressive Web App (PWA)** frontend and an enterprise **Java Spring Boot REST API** backend.

---

## 🌐 Live Web Demo
👉 **[Open Live Spendorio App (GitHub Pages)](https://mukilan-v.github.io/Spendorio.App/)**  
*(Can be installed directly to your phone or desktop home screen via Chrome/Safari!)*

---

## 🌟 Key Features

### 1. 📱 Progressive Web App (PWA) & 100% Offline Resilience
- **Instant Installability:** Installs directly to Android, iOS, Windows, or Mac home screens without app store dependencies (<3.5 MB).
- **Service Worker (`sw.js`):** Cache-first static asset caching enables instant launches (<0.1s) even in Airplane Mode.
- **Client Storage:** Optimistic client-side persistence using `localStorage` and IndexedDB with automatic background server synchronization.

### 2. ☕ Java Spring Boot Enterprise REST Backend
- **RESTful Architecture:** Clean `@RestController` endpoints for user authentication, live data synchronization, and system health checks.
- **Data Concurrency:** Implemented thread-safe `ReentrantLock` concurrency controls and atomic temporary file swaps, guaranteeing zero lost writes and zero database corruption.
- **Multi-Tenant User Isolation:** Partitioned per-user data containers ensuring complete data privacy across multiple devices.

### 3. 💰 Comprehensive Cost & Budget Management
- **Unified Spending Stream:** Track standalone expenses alongside scheduled daily routine costs.
- **Multi-Currency Support:** Switch between **₹ (INR)**, **$ (USD)**, **€ (EUR)**, and **£ (GBP)** seamlessly.
- **Budget Thresholds & Alerts:** Dynamic visual progress bars with warning alerts when approaching daily or monthly budget limits.

### 4. 📅 Habit & Routine Streak Counter
- **Time Block Planner:** Organize routines into Morning, Afternoon, Evening, and Night blocks.
- **Productivity Streaks:** Daily streak counter rewarding consistency and daily habit completion.
- **Visual Analytics:** Interactive monthly budget distribution charts and cost vs. task completion correlation.

---

## 🏗️ System Architecture

```
+-----------------------------------------------------------------------------------+
|                           CLIENT LAYER (Mobile & Desktop)                         |
|  - Modern Browser / WebAPK Installed Home Screen App                              |
|  - Service Worker (sw.js) [Cache-First Engine: Instant Launch & 100% Offline]     |
|  - Client State: HTML5 localStorage / IndexedDB [Zero-Latency Local Writes]       |
+-----------------------------------------------------------------------------------+
                                         │
                   Secure HTTPS (TLS 1.3 / HTTP/2) via Cloudflare Edge
                                         ▼
+-----------------------------------------------------------------------------------+
|                         NETWORKING & SECURITY LAYER                               |
|  - Cloudflare Edge Tunnel (cloudflared) -> Outbound Encrypted Bridge              |
|  - Automatic DDoS Shielding, Green Padlock SSL Certificate, Zero Port-Forwarding  |
+-----------------------------------------------------------------------------------+
                                         │
                           Local Port 3000 (Loopback)
                                         ▼
+-----------------------------------------------------------------------------------+
|                     BACKEND LAYER (Java Spring Boot 3.3.4)                         |
|  - Embedded Apache Tomcat Server (Port 3000)                                      |
|  - WebMvcConfigurer: Global CORS & Static PWA Asset Handler                       |
|  - REST Controllers: AuthController, SyncController, HealthController            |
|  - Service Layer: DataService (ReentrantLock Thread Safety & Atomic File I/O)      |
+-----------------------------------------------------------------------------------+
```

---

## 🛠️ Tech Stack Breakdown

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Glassmorphism UI), JavaScript (ES6+), PWA (Service Workers, Web Manifest, WebAPK) |
| **Backend** | Java 25 (LTS), Spring Boot 3.3.4, Spring Web MVC, Embedded Apache Tomcat |
| **Build & Tools** | Apache Maven 3.9.6, Spring Tool Suite (STS4) / Eclipse, Git, GitHub Actions |
| **Cloud & Network** | Cloudflare Tunnel (HTTP/2), GitHub Pages |

---

## 🚀 Running the Project Locally

### Prerequisites
- **Java JDK 17, 21, or 25** installed.
- **Git** installed.

### Option 1: Java Spring Boot Backend (Recommended)
1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/Spendorio.git
   cd Spendorio
   ```
2. Run the Spring Boot backend:
   ```bash
   # On Windows:
   start_springboot.bat
   
   # Or using Maven:
   cd backend-springboot
   mvn spring-boot:run
   ```
3. Open in your browser:  
   👉 **`http://localhost:3000`**

### Option 2: Pure Frontend Static Mode
Simply open `public/index.html` in any web browser! Spendorio runs 100% in standalone offline client mode using local storage.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).

---

## 👨‍💻 Author
**Mukilan Viswa**  
- LinkedIn: [Mukilan Viswa](https://linkedin.com)  
- Portfolio / GitHub: [Mukilan's Profile](README_Mukilan_GitHub_Profile.md)
