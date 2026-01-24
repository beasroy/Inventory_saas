# Architecture Documentation

## Table of Contents
1. [Tenant Isolation Strategy](#tenant-isolation-strategy)
2. [Variant Modeling in MongoDB](#variant-modeling-in-mongodb)
3. [Race Condition Prevention](#race-condition-prevention)
4. [Database Schema Design](#database-schema-design)

---

## Tenant Isolation Strategy

### Decision: Row-Level Isolation with `tenantId`

We use **row-level isolation** where every document in every collection includes a `tenantId` field that references the Tenant collection. All database queries are scoped by `tenantId` to ensure complete data isolation between tenants.

### Pros

✅ **Cost-Effective**: Single database instance, shared infrastructure
✅ **Easy to Implement**: Simple field-based filtering
✅ **Scalable**: Can handle thousands of tenants efficiently
✅ **Simplified Backup/Restore**: Single database to manage
✅ **Cross-Tenant Analytics**: Easy to aggregate data across tenants (if needed)
✅ **Resource Efficiency**: Better utilization of database resources
✅ **Simplified Development**: No need for dynamic database connections

### Cons

❌ **Data Leakage Risk**: Requires careful query validation (mitigated by middleware)
❌ **Performance at Scale**: Large tenant datasets can impact query performance (mitigated by indexes)
❌ **Backup Complexity**: Cannot backup individual tenant data easily
❌ **Compliance Concerns**: Some regulations may require physical data separation

### Mitigation Strategies

1. **Middleware Enforcement**: All routes go through authentication middleware that attaches `req.tenant`
2. **Index Optimization**: Compound indexes on `tenantId` + other fields for fast queries
3. **Query Validation**: All database queries explicitly include `tenantId` filter
4. **Code Review**: Strict review process to ensure no queries miss `tenantId`


## Variant Modeling in MongoDB

### Decision: Separate Variant Collection

Variants are stored in a **separate `Variant` collection** with references to the `Product` collection, rather than embedding variants as an array within the Product document.

### Why Separate Collection?

#### 1. **Query Performance**
- **Variant-specific queries**: Finding a variant by SKU is O(log n) with indexes vs O(n×m) scanning embedded arrays
- **Indexing**: Can create variant-specific indexes (SKU, size+color combinations)
- **Selective Loading**: Can query variants without loading entire product document

#### 2. **Atomic Updates**
- **Stock Updates**: Can update a single variant's stock atomically without locking the entire product
- **Concurrency**: Multiple stock updates on different variants can run in parallel
- **Performance**: Updating one variant = 1 small document vs rewriting entire product document

#### 3. **Scalability**
- **Document Size Limit**: MongoDB has 16MB document limit - embedded approach would hit this with many variants
- **Growth**: No constraints on number of variants per product
- **Memory Efficiency**: Only load variants when needed

#### 4. **Data Integrity**
- **Unique Constraints**: Can enforce unique size×color combinations per product
- **Referential Integrity**: Clear relationships between products and variants
- **Audit Trail**: StockMovement can reference specific variant via `variantId`

### Performance Comparison

| Operation | Separate Collection | Embedded Array |
|----------|-------------------|----------------|
| Get product + variants | 1 aggregation query (~20ms) | 1 query (~10ms) |
| Find variant by SKU | 1 indexed query (~5ms) | Scan all products (~500ms+) |
| Update variant stock | 1 small doc update (~5ms) | Rewrite entire product (~50ms) |
| Concurrent stock updates | Parallel (different variants) | Sequential (same product) |

### Trade-offs

✅ **Pros**:
- Better query performance for variant-specific operations
- Atomic updates on individual variants
- No document size constraints
- Better concurrency for stock updates
- Efficient indexing

❌ **Cons**:
- Requires join/aggregation for product+variants
- Slightly more complex queries
- Two collections to manage

---

## Race Condition Prevention

### Problem: Concurrent Orders for Last Item

When two users simultaneously order the last available item, both might pass the stock check and create orders, leading to overselling.

### Solution: Atomic Operations with MongoDB Transactions

We use **atomic database operations** combined with **MongoDB transactions** to prevent race conditions.

### How It Prevents Race Conditions

**Scenario**: Two users order the last 1 unit simultaneously

```
Time 0: Stock = 1, Reserved = 0, Available = 1

Time 1: User A checks stock → Available = 1 ✅
Time 1: User B checks stock → Available = 1 ✅ (both see 1)

Time 2: User A attempts atomic update with condition check → SUCCESS ✅
Result: Stock = 1, Reserved = 1, Available = 0

Time 2: User B attempts atomic update with condition check → FAILS ❌
Reason: Available stock is now 0, condition check fails
Result: Error thrown, order rejected
```

### Key Mechanisms

1. **Atomic Operations**: `findOneAndUpdate` with conditions ensures only one operation succeeds
2. **Transactions**: Wraps multiple operations to ensure all-or-nothing execution
3. **Conditional Updates**: Uses `$expr` to check available stock atomically
4. **Optimistic Locking**: MongoDB's write concern ensures atomicity at database level

### Stock Management Flow

**Order Placement:**
- Atomically reserves stock by checking available stock >= quantity
- Updates reserved stock and creates StockMovement record in transaction

**Order Cancellation:**
- Atomically releases reserved stock by checking reserved stock >= quantity
- Updates reserved stock and creates StockMovement record in transaction

**Order Fulfillment:**
- Atomically fulfills order by checking reserved stock >= quantity
- Updates both stock and reserved stock, creates StockMovement record in transaction

### Benefits

✅ **No Overselling**: Atomic checks prevent selling more than available
✅ **Data Consistency**: Transactions ensure stock and movements stay in sync
✅ **Concurrent Safety**: Multiple orders can be processed simultaneously
✅ **Complete Audit Trail**: Every stock change is recorded in StockMovement

---

## Database Schema Design

### Core Collections

#### 1. Product
- **Purpose**: Master product information
- **Key Fields**: `tenantId`, `productCode`, `name`, `description`, `basePrice`
- **Indexes**: 
  - `{ tenantId: 1, productCode: 1 }` (unique)
  - `{ tenantId: 1 }` (for filtering)

#### 2. Variant
- **Purpose**: Product variations (size, color, stock)
- **Key Fields**: `tenantId`, `productId`, `sku`, `size`, `color`, `stock`, `reservedStock`
- **Indexes**:
  - `{ tenantId: 1, sku: 1 }` (unique)
  - `{ tenantId: 1, productId: 1 }`
  - `{ tenantId: 1, productId: 1, size: 1, color: 1 }` (unique)

#### 3. StockMovement
- **Purpose**: Complete audit trail of all stock changes
- **Key Fields**: `tenantId`, `productId`, `variantId`, `movementType`, `quantity`, `previousStock`, `newStock`
- **Indexes**:
  - `{ tenantId: 1, productId: 1, createdAt: -1 }`
  - `{ tenantId: 1, variantId: 1, createdAt: -1 }`
  - `{ tenantId: 1, variantSku: 1, createdAt: -1 }`

### Relationships

```
Tenant (1) ──→ (N) Product
Product (1) ──→ (N) Variant
Variant (1) ──→ (N) StockMovement
```

### Data Integrity Rules

1. **Tenant Isolation**: All queries must include `tenantId`
2. **Unique Constraints**: 
   - Product code unique per tenant
   - Variant SKU unique per tenant
   - Size×Color combination unique per product per tenant
3. **Referential Integrity**: Variants reference valid Products, StockMovements reference valid Variants
4. **Stock Validation**: 
   - Stock cannot be negative
   - Reserved stock cannot exceed total stock
   - Available stock = stock - reservedStock

---

## Summary

This architecture provides:

1. **Secure Multi-Tenancy**: Row-level isolation with middleware enforcement
2. **Scalable Variant Management**: Separate collection for optimal performance
3. **Race Condition Safety**: Atomic operations with transactions
4. **Complete Audit Trail**: Every stock change recorded

The design balances performance, scalability, and data integrity while maintaining cost-effectiveness for a SaaS model.

