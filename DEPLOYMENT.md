# InfraFlux Deployment Guide

This guide provides the exact steps and configurations needed to host the updated InfraFlux application.

## 1. Database Setup (Render.com)

1.  **Create a PostgreSQL Database** on Render.
2.  **Apply Schema**:
    - Connect to your database (using the "PSQL Shell" on Render or a local tool).
    - Run the contents of [`server/db/schema.sql`](server/db/schema.sql).
    - *Note: This will create all tables including the new voting system.*

## 2. Backend Service (Render.com)

1.  **Create a New Web Service**:
    - Connect your GitHub repository.
    - Set **Root Directory** to `server`.
    - **Language**: `Node`.
    - **Build Command**: `npm install && npm run build`
    - **Start Command**: `npm run start`
2.  **Environment Variables**:
    - `DATABASE_URL`: Your Render PostgreSQL Internal/External URL.
    - `ADMIN_SECRET`: A secure string of your choice.
    - `ALLOWED_ORIGINS`: Your Vercel URL (e.g., `https://infraflux.vercel.app`). *You can set this to `*` initially and update it later.*
3.  **Note your Service URL** (e.g., `https://infraflux-api.onrender.com`).

## 3. Frontend Service (Vercel)

1.  **Create a New Project**:
    - Connect your GitHub repository.
    - **Framework Preset**: `Vite`.
    - **Root Directory**: `.` (Default).
2.  **Environment Variables**:
    - `VITE_API_URL`: Your Render Backend URL (e.g., `https://infraflux-api.onrender.com`).
    - `VITE_ADMIN_SECRET`: Must match the `ADMIN_SECRET` set on Render.
3.  **Deploy**: Vercel will automatically detect the settings and build the site.

---

## Local Verification (Optional)
Before deploying, you can verify the build locally:
```bash
# Frontend
npm install
npm run build

# Backend
cd server
npm install
npm run build
npm run start
```
