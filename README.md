# InfraFlux 🚀

**InfraFlux** is a modern, high-performance infrastructure reporting platform designed to empower citizens and municipalities. It provides a real-time, interactive map for reporting and tracking urban issues like potholes, water logging, and garbage dumps with zero friction.

<p align="center">
  <img src="https://raw.githubusercontent.com/taughtbyyeezy/InfraFlux/main/public/infrafluxwhite.png" height="60" alt="InfraFlux Logo" />
  <img src="https://raw.githubusercontent.com/taughtbyyeezy/InfraFlux/main/public/logo/infraFLUX_white_bohme_mid.png" height="60" alt="InfraFlux Typeface" />
</p>

## ✨ Key Features

- **Real-Time Interactive Map**: Powered by **Leaflet** and **Stadia Maps Alidade Smooth Dark**, offering a premium charcoal-themed navigation experience.
- **Dynamic Reporting**: Fast, glassmorphism-inspired UI for reporting issues with:
  - **Photo Evidence**: Integrated image compression and eager background processing.
  - **Precision Location**: One-tap "Locate Me" and manual map-pick functionality.
- **Smart Filtering**: Live filters for Potholes (Red 🔴), Water Logging (Blue 🔵), and Garbage Dumps (Yellow 🟡).
- **Pro-Grade Mobile Experience**: Fully responsive "Apple Glass" UI designed for field reporting.
- **Admin Dashboard**: Secure integrated dashboard for validating and resolving reported issues.
- **Anti-Misuse Core**: 
  - Backend rate limiting.
  - Honeypot bot protection.
  - GPS-based geofencing to prevent fake reports.

## 🛠️ Tech Stack

- **Frontend**: React (Vite), TypeScript, Tailwind CSS (Vanilla CSS Overrides), Framer Motion.
- **Mapping**: Leaflet, React Leaflet, Stadia Maps.
- **Backend**: Node.js, Express.
- **Database**: PostgreSQL with PostGIS for spatial queries.
- **Image Hosting**: ImgBB API Integration.
- **Deployment**: Vercel (Frontend), Render (Backend/Database).

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL with PostGIS extension.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/taughtbyyeezy/InfraFlux.git
   cd InfraFlux
   ```

2. **Install dependencies:**
   ```bash
   npm install        # Frontend
   cd server
   npm install        # Backend
   ```

3. **Environment Setup:**
   Create a `.env` file in the `server` directory:
   ```env
   DATABASE_URL=your_postgres_url
   IMGBB_API_KEY=your_key
   VITE_API_URL=http://localhost:3001
   ```

4. **Run the application:**
   - **Frontend (Root)**: `npm run dev`
   - **Backend (Server)**: `node server.js`

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
Built with ❤️ for a better infrastructure.
