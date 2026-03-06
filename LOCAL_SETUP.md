# Local Development Guide

Follow these steps to run InfraFlux on your local machine.

## 1. Database Setup (PostgreSQL)

You need **PostgreSQL** installed with the **PostGIS** extension.

1.  **Create Database**:
    ```sql
    CREATE DATABASE rewari_infrastructure;
    ```
2.  **Run Schema**:
    Option A: Use a GUI tool (like pgAdmin or DBeaver) to run the code in [schema.sql](./schema.sql).
    Option B: Use terminal:
    ```bash
    psql -d rewari_infrastructure -f schema.sql
    ```

## 2. Environment Variables

Create a file named `.env` in the root directory (if not already present) and add these:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/rewari_infrastructure
ADMIN_SECRET=admin
VITE_ADMIN_SECRET=admin
VITE_IMGBB_API_KEY=your_imgbb_key_here
```

## 3. Run the Application

You need two terminal windows:

### Terminal 1: Backend Server
```bash
npm install
npm run dev:server
```
*Runs on http://localhost:3001*

### Terminal 2: Frontend
```bash
npm run dev
```
*Runs on http://localhost:5173*

---

## Troubleshooting
- **PostGIS Error**: If `CREATE EXTENSION postgis` fails, ensure you have the PostGIS bundle installed for your Postgres version.
- **Node version**: Recommended Node.js 18 or higher.
