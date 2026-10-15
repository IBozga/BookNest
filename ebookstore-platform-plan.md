# E-Bookstore Platform Implementation Plan

## Top-Level Overview
This project delivers a full-stack E-Bookstore Platform built with PostgreSQL, NestJS (TypeScript backend), and React (Vite & Tailwind CSS frontend). The workflow integrates manual data modeling, OpenAPI 3.0 specification generation, AI-augmented backend services, interactive UI with "Buy It Again" and recommendation workflows, automated test generation across API and UI layers, and local containerized deployment readiness.

---

## Sub-Tasks

### Sub-Task 1: Relational Data Model Design & Database Scaffolding
- **Intent**: Define the relational data schema in PostgreSQL supporting catalogue browsing, categories, publishers/brands, book inventory, user carts, order history, addresses, and gift point balances.
- **Expected Outcomes**:
  - Entity-Relationship schema with proper constraints, foreign keys, and indexes.
  - SQL migration / TypeORM entity definitions.
  - Seed script populating initial categories, publishers/brands, sample books, and sample user profiles with gift points.
- **Todo List**:
  1. Design schema for `users`, `categories`, `brands`/`publishers`, `books`, `cart_items`, `addresses`, `orders`, `order_items`, `gift_point_ledger`, and `payment_transactions`.
  2. Implement ORM entities and database migrations.
  3. Create mock seed data generator for books, categories, publishers, and stock availability.
- **Relevant Context**: `backend/src/entities/*`, `backend/src/database/*`
- **Status**: [x] done

---

### Sub-Task 2: OpenAPI 3.0 Specification Generation
- **Intent**: Produce a comprehensive, standardized OpenAPI 3.0 contract defining all RESTful endpoints, schemas, request/response models, and error responses.
- **Expected Outcomes**:
  - Validated `openapi.yaml` document covering Auth, Catalogue, Cart, Checkout, Points, Orders, and Payment APIs.
  - Swagger UI integrated into the backend for interactive testing and documentation.
- **Todo List**:
  1. Define API paths, parameters, schemas, and status codes for:
     - Books Catalogue (filtering by category, brand/publisher, related books)
     - Cart & History-based Recommendations
     - Checkout (Addresses, Gift points redemption)
     - Payments & Order Confirmation
     - Order History & "Buy It Again"
  2. Configure NestJS Swagger / OpenAPI module to auto-serve the documentation.
- **Relevant Context**: `docs/openapi.yaml`, `backend/src/main.ts`
- **Status**: [x] done

---

### Sub-Task 3: Backend REST Services & Business Logic (NestJS)
- **Intent**: Implement modular backend micro-modules with strict input validation, security controls (OWASP/IBM security compliant), and core business rules.
- **Expected Outcomes**:
  - Secure REST APIs adhering to local binding (127.0.0.1) and parameterized queries.
  - Core service modules:
    - `CatalogueModule`: Filter by category, publisher/brand, fetch book details, compute related books.
    - `CartModule`: Basket operations with inventory availability checks.
    - `RecommendationModule`: Recommend items derived from user order history and category affinity.
    - `OrderModule`: Order placement, "Buy It Again" re-ordering, and purchase history.
    - `PaymentModule`: Payment simulation, address validation, and gift point redemption calculus.
- **Todo List**:
  1. Scaffold NestJS project with configuration, logging, validation pipes, and error filters.
  2. Implement `CatalogueModule` (Categories, Brands, Books with search & related items).
  3. Implement `CartModule` and `RecommendationModule` (Order history-based suggestions).
  4. Implement `CheckoutModule` (Addresses, Gift points redemption calculus).
  5. Implement `PaymentModule` (Payment transaction processing and order confirmation).
  6. Implement `OrderModule` with history inspection and "Buy It Again" endpoint.
- **Relevant Context**: `backend/src/modules/*`
- **Status**: [x] done

---

### Sub-Task 4: Frontend Application (React + Vite + Tailwind CSS)
- **Intent**: Build a responsive e-commerce web interface fulfilling all user flow requirements.
- **Expected Outcomes**:
  - Landing page highlighting book availability, featured collections, and promotions.
  - Catalogue page with category filters, brand/publisher filters, and detailed view with related book recommendations.
  - Interactive shopping cart with order-history-based recommendation widget.
  - Multi-step checkout flow (Delivery Address selector, Gift Points redemption, Payment screen with multiple options).
  - Purchase Confirmation screen with order breakdown and success messaging.
  - Order History page with one-click "Buy It Again" functionality.
- **Todo List**:
  1. Scaffold React + Vite + Tailwind CSS application with state management and routing.
  2. Build Landing Page component with book availability indicators.
  3. Build Catalogue Page with category/brand filtering, search, and related books display.
  4. Build Shopping Cart drawer/page with dynamic recommended items.
  5. Build Checkout & Payment flow (Address selection, gift points input, payment method options, submission state).
  6. Build Purchase Confirmation modal/screen.
  7. Build Order History view with "Buy It Again" action.
- **Relevant Context**: `frontend/src/*`, `frontend/src/components/*`, `frontend/src/pages/*`
- **Status**: [x] done

---

### Sub-Task 5: Test Suite Generation (API & Frontend)
- **Intent**: Establish comprehensive automated testing across backend APIs, business services, and React UI components.
- **Expected Outcomes**:
  - Unit and integration tests for backend services and controllers (Jest + Supertest).
  - Component and user interaction tests for React frontend (Vitest + React Testing Library).
  - End-to-end scenario test verifying the full purchase lifecycle (Browse -> Cart -> Redeem Points -> Pay -> Confirm -> Buy It Again).
- **Todo List**:
  1. Write backend unit tests for Catalogue, Cart, Payment, Points calculation, and Order logic.
  2. Write API e2e integration tests validating OpenAPI contracts.
  3. Write frontend component tests for Cart, Checkout, and Order History.
  4. Execute and verify all test suites passing with zero errors.
- **Relevant Context**: `backend/test/*`, `frontend/src/**/*.test.tsx`
- **Status**: [x] done

---

### Sub-Task 6: Local Containerization & Readiness Deployment
- **Intent**: Ensure smooth local execution with containerized PostgreSQL and automated startup scripts.
- **Expected Outcomes**:
  - Compliant `docker-compose.yml` for PostgreSQL.
  - Startup scripts and `.env.example` configurations.
  - Verified local build and run instructions in `README.md`.
- **Todo List**:
  1. Configure `docker-compose.yml` for PostgreSQL service (non-root, bound to 127.0.0.1).
  2. Provide environment configuration files for backend and frontend.
  3. Create development run script and database seed command.
  4. Write comprehensive `README.md` with setup and verification instructions.
- **Relevant Context**: `docker-compose.yml`, `README.md`, `.env.example`
- **Status**: [x] done
