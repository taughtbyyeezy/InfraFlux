# InfraFlux System Design

This document provides a top-down view of the **InfraFlux** architecture, technology stack, and core data flows.

## High-Level Architecture

The system follows a classic **Client-Server-Database** architecture, optimized for geospatial data visualization.

```mermaid
graph TD
    subgraph "Client Layer (Frontend)"
        A["React (Vite + TypeScript)"]
        B["Leaflet (Map Component)"]
        C["Glass UI (CSS Framework)"]
    end

    subgraph "API Layer (Backend)"
        D["Express.js (Node.js)"]
        E["Zod (Validation)"]
        F["Helmet (Security)"]
    end

    subgraph "Data Layer"
        G[("PostgreSQL")]
        H["PostGIS (Spatial Extension)"]
    end

    A <-->|HTTP/JSON API| D
    D <-->|SQL / ST_X, ST_Y| G
    G --- H
```

---

## Core Data Flow: Issue Reporting

When a user reports an issue (e.g., a pothole), the system handles it through a transaction-safe flow.

```mermaid
sequenceDiagram
    participant User as User (Mobile/Desktop)
    participant API as Express API
    participant DB as PostgreSQL + PostGIS

    User->>API: POST /api/report (Type, Location, Note, Image)
    activate API
    API->>API: Validate Data (Zod)
    API->>DB: BEGIN Transaction
    API->>DB: INSERT INTO issues (Geometric Point)
    API->>DB: INSERT INTO issue_updates (Status, Note)
    API->>DB: INSERT INTO media (Image URL)
    API->>DB: COMMIT Transaction
    API->>User: 201 Created (Success)
    deactivate API
```

---

## Feature Intelligence: Growth & Resolution

InfraFlux uses community-driven logic to maintain map accuracy.

### Voting Logic
- **Upvotes**: If a report receives **20 upvotes**, it is automatically marked as **Approved**.
- **Downvotes**: If a report receives **5 downvotes**, it is automatically marked as **Resolved (Fake Report)** and disappears from main view.
- **Resolution**: If an approved issue receives **10 resolve-votes**, it is marked as **Resolved**.

```mermaid
stateDiagram-v2
    [*] --> Active: User Report
    Active --> Approved: 20 Upvotes
    Active --> Resolved: 5 Downvotes (Fake)
    Approved --> Resolved: 10 Resolve Votes
    Approved --> Resolved: Admin Delist
    Active --> Approved: Admin Approval
    Resolved --> [*]
```

---

## Tech Stack Summary

| Layer | Technology | Key Usage |
| :--- | :--- | :--- |
| **Frontend** | React, TypeScript | Composable UI, Type Safety |
| **State Management** | React Hooks | `useState`, `useEffect` for Map/API state |
| **Maps** | Leaflet | Interactive geospatial visualization |
| **Backend** | Node.js, Express | RESTful API endpoints |
| **Database** | PostgreSQL | Relational data persistence |
| **Spatial** | PostGIS | `GEOMETRY` types, `ST_Distance`, `ST_MakePoint` |
| **Validation** | Zod | Runtime schema validation for API inputs |
| **Styling** | Vanilla CSS | Custom Glassmorphism UI tokens |
