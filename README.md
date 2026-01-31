# Inventory Management SaaS

A multi-tenant inventory management system built with Node.js, Express, MongoDB, React, and TypeScript. This application provides complete tenant isolation, role-based access control, and real-time inventory tracking.

## Table of Contents

- [Setup Instructions](#setup-instructions)
- [Test Credentials](#test-credentials)
- [Features Implemented](#features-implemented)
- [Assumptions](#assumptions)
- [Known Limitations](#known-limitations)
- [Time Breakdown](#time-breakdown)

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `server` directory:
   ```env
   MONGODB_URI=mongodb://localhost:27017/inventory-saas
   JWT_SECRET=your-secret-key-change-this-in-production
   FRONTEND_URL=http://localhost:5173
   PORT=8000
   ```

4. Start MongoDB (if not running as a service):
   ```bash
   mongod
   ```

5. Seed the database with test data:
   ```bash
   npm run seed
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

   The server will run on `http://localhost:8000`

### Frontend Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `client` directory (optional, defaults are provided):
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   VITE_SOCKET_URL=http://localhost:8000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

   The client will run on `http://localhost:5173`

### Running the Application

1. Start MongoDB
2. Start the backend server (`cd server && npm run dev`)
3. Start the frontend client (`cd client && npm run dev`)
4. Open `http://localhost:5173` in your browser

## Test Credentials

The seed script creates 3 tenants with different user roles. All users have the default password: **`password123`**

### Tenant 1: Fashion Store

**Users:**
- **Owner**
  - Email: `owner@fashionstore.com`
  - Password: `password123`
  - Role: Owner (full access)
  - Name: John Smith

- **Manager**
  - Email: `manager@fashionstore.com`
  - Password: `password123`
  - Role: Manager (limited access)
  - Name: Sarah Johnson

- **Staff**
  - Email: `staff@fashionstore.com`
  - Password: `password123`
  - Role: Staff (read-only access)
  - Name: Mike Davis

**Products:**
- Classic T-Shirt (TSH-001) - $29.99
  - Variants: S/M/L in Black/White (6 variants)
  - Stock: 25-75 units per variant
- Denim Jeans (JEAN-001) - $79.99
  - Variants: Sizes 30/32/34/36 in Blue (4 variants)
  - Stock: 15-40 units per variant
- Hooded Sweatshirt (HOOD-001) - $49.99
  - Variants: S/M/L in Grey/Navy (6 variants)
  - Stock: 25-55 units per variant

**Suppliers:**
- Textile Manufacturers Inc (SUP-001)
- Fashion Wholesale Co (SUP-002)

**Purchase Orders:**
- PO-20240115-0001: Confirmed order for 50 T-Shirts (M-Black)
- PO-20240116-0001: Sent order for 30 Jeans (32-Blue) + 20 Hoodies (M-Grey)

**Stock Movements:**
- 30 days of sales and purchase movements
- Sales occur every 2 days
- Purchases occur every 3 days

### Tenant 2: Electronics Store

**Users:**
- **Owner**
  - Email: `owner@electronics.com`
  - Password: `password123`
  - Role: Owner (full access)
  - Name: Emily Chen

- **Manager**
  - Email: `manager@electronics.com`
  - Password: `password123`
  - Role: Manager (limited access)
  - Name: David Wilson

- **Staff 1**
  - Email: `staff1@electronics.com`
  - Password: `password123`
  - Role: Staff (read-only access)
  - Name: Lisa Anderson

- **Staff 2**
  - Email: `staff2@electronics.com`
  - Password: `password123`
  - Role: Staff (read-only access)
  - Name: Tom Brown

**Products:**
- Wireless Headphones (HP-001) - $199.99
  - Variants: One size in Black/White/Blue (3 variants)
  - Stock: 60-100 units per variant
- Smartphone (PH-001) - $899.99
  - Variants: 128GB/256GB in Black/White (4 variants)
  - Stock: 25-50 units per variant

**Suppliers:**
- Tech Distributors Ltd (SUP-001)

**Purchase Orders:**
- PO-20240118-0001: Confirmed order for 50 Headphones (Black) + 10 Smartphones (128GB-Black)

**Stock Movements:**
- 20 days of sales movements
- Sales occur every 2 days

### Tenant 3: Sports Store

**Users:**
- **Owner**
  - Email: `owner@sports.com`
  - Password: `password123`
  - Role: Owner (full access)
  - Name: Robert Taylor

- **Staff**
  - Email: `staff@sports.com`
  - Password: `password123`
  - Role: Staff (read-only access)
  - Name: Jessica Martinez

**Products:**
- Running Shoes (SHOE-001) - $129.99
  - Variants: Sizes 8/9/10 in Black/White (5 variants)
  - Stock: 3-15 units per variant
  - **Note: This tenant has low stock items for testing**

**Purchase Orders:**
- PO-20240120-0001: Sent order for 20 Running Shoes (8-Black) - Pending delivery

**Stock Movements:**
- No stock movements created (minimal data for testing low stock alerts)

### Seed Data Summary

- **Total Tenants:** 3
- **Total Users:** 9 (3 owners, 2 managers, 4 staff)
- **Total Products:** 6
- **Total Variants:** 22
- **Total Suppliers:** 3
- **Total Purchase Orders:** 4
- **Total Stock Movements:** ~50 (30 for Tenant 1, 20 for Tenant 2)

## Features Implemented

### Authentication & Authorization
- ✅ Multi-tenant authentication with JWT tokens
- ✅ Role-based access control (Owner, Manager, Staff)
- ✅ Permission-based route protection
- ✅ HTTP-only cookie-based session management
- ✅ User registration and login
- ✅ Tenant isolation at middleware level

### Product Management
- ✅ Create, read, update, and delete products
- ✅ Product variants (size, color) with separate stock tracking
- ✅ SKU generation and management
- ✅ Base price and variant-specific pricing
- ✅ Product code uniqueness per tenant

### Inventory Management
- ✅ Real-time stock tracking
- ✅ Reserved stock for pending orders
- ✅ Available stock calculation (stock - reservedStock)
- ✅ Stock movements audit trail
- ✅ Low stock alerts (configurable threshold)
- ✅ Stock adjustments with audit logging

### Purchase Orders
- ✅ Create and manage purchase orders
- ✅ Multiple statuses: draft, sent, confirmed, received, cancelled
- ✅ Purchase order items with variant tracking
- ✅ Receipt management for partial/full deliveries
- ✅ Expected vs received quantity tracking
- ✅ Pending quantity calculation for low stock alerts

### Suppliers
- ✅ Supplier management (CRUD operations)
- ✅ Supplier code uniqueness per tenant
- ✅ Contact information and pricing per product
- ✅ Supplier status management (active/inactive)

### Stock Movements
- ✅ Complete audit trail of all stock changes
- ✅ Movement types: purchase, sale, return, adjustment
- ✅ Previous and new stock tracking
- ✅ Movement history by product, variant, or date range
- ✅ Real-time updates via WebSocket

### Analytics & Dashboard
- ✅ Total inventory value calculation
- ✅ Low stock items with pending PO consideration
- ✅ Top sellers (last 30 days)
- ✅ Stock movement graph (last 7 days)
- ✅ Real-time dashboard updates

### Real-time Features
- ✅ WebSocket integration for live updates
- ✅ Stock movement notifications
- ✅ Inventory value updates

### Security
- ✅ Tenant data isolation
- ✅ Input validation and sanitization
- ✅ Helmet.js security headers
- ✅ CORS configuration
- ✅ Password hashing with bcrypt

## Assumptions

1. **Multi-tenancy**: Each tenant operates independently with complete data isolation
2. **Stock Management**: Stock is tracked at the variant level (size + color combination)
3. **Reserved Stock**: Stock can be reserved for pending orders and released on cancellation
4. **SKU Format**: SKUs are auto-generated as `{PRODUCT_CODE}-{SIZE}-{COLOR}`
5. **Low Stock Threshold**: Default threshold is 10 units (configurable)
6. **Permissions**: Role-based permissions are enforced at the API level
7. **Audit Trail**: All stock changes are logged in StockMovement collection
8. **Real-time Updates**: Dashboard and inventory views update in real-time via WebSocket
9. **Cookie-based Auth**: JWT tokens are stored in HTTP-only cookies for security
10. **Date Handling**: All dates are stored in UTC and converted to local time in the frontend

## Known Limitations

1. **Frontend Pages**: Some routes (Products, Suppliers, Purchase Orders, Stock Movements) are defined in constants but pages are not yet implemented
2. **Pagination**: Large datasets may need pagination (not currently implemented)
3. **Search/Filter**: Advanced search and filtering capabilities are limited
4. **Bulk Operations**: Bulk import/export of products is not implemented
5. **Email Notifications**: Low stock alerts are shown in UI but email notifications are not implemented
6. **Image Upload**: Product images are not supported
7. **Reports**: Advanced reporting and export features are not implemented
8. **Mobile Responsiveness**: Some pages may need additional mobile optimization
9. **Error Handling**: Some edge cases in error handling may need improvement
10. **Testing**: Unit and integration tests are not included

## Time Breakdown

### Backend Development (~40 hours)
- **Database Schema Design**: 4 hours
  - Product, Variant, StockMovement models
  - Tenant isolation strategy
  - Index optimization
  
- **Authentication & Authorization**: 6 hours
  - JWT implementation
  - Role-based permissions
  - Middleware for tenant isolation
  
- **Product Management API**: 5 hours
  - CRUD operations
  - Variant management
  - SKU generation
  
- **Inventory Management**: 8 hours
  - Stock tracking logic
  - Reserved stock handling
  - Atomic operations for race condition prevention
  - Stock movement audit trail
  
- **Purchase Orders**: 6 hours
  - PO lifecycle management
  - Receipt handling
  - Status transitions
  
- **Analytics & Dashboard**: 4 hours
  - Inventory value calculation
  - Low stock detection
  - Top sellers aggregation
  - Stock movement graph
  
- **Real-time Features**: 3 hours
  - WebSocket integration
  - Real-time notifications
  
- **Testing & Debugging**: 4 hours
  - Seed script development
  - Bug fixes
  - Edge case handling

### Frontend Development (~6 hours)
- **Project Setup**: (15 minutes)
  - React + TypeScript + Vite
  - Redux Toolkit setup
  - Routing configuration
  
- **Authentication UI**: 1 hour
  - Login/Register pages
  - Protected routes
  - Auth state management
  
- **Dashboard**: 1 hours
  - Analytics display
  - Charts and graphs
  - Real-time updates
  
- **Layout & Navigation**: 1 hour
  - Header component
  - Navigation menu
  - Responsive design
  
- **State Management**: 1.5 hours
  - Redux slices
  - API integration
  - Error handling
  - WebSocket connection setup
  
- **UI Components & Styling**: 1.5 hours
  - Reusable components
  - Form components
  - Tailwind CSS setup
  - Loading states
  - UI polish

### Database & Seed Script (~5 hours)
- **Schema Design**: 2 hours
- **Seed Data Creation**: 2 hours
- **Testing & Refinement**: 1 hour

### Documentation & Setup (~3 hours)
- **README**: 1 hour
- **Architecture Documentation**: 1 hour
- **Setup Instructions**: 1 hour

**Total Estimated Time: ~54 hours**

---

## Technology Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- Socket.io
- JWT for authentication
- bcryptjs for password hashing

### Frontend
- React 19
- TypeScript
- Redux Toolkit
- React Router
- Axios
- Socket.io-client
- Tailwind CSS
- Recharts



