import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Tenant from '../src/models/Tenant.js';
import User from '../src/models/User.js';
import Product from '../src/models/Product.js';
import Variant from '../src/models/Variant.js';
import Supplier from '../src/models/Supplier.js';
import PurchaseOrder from '../src/models/PurchaseOrder.js';
import PurchaseOrderItem from '../src/models/PurchaseOrderItem.js';
import PurchaseOrderReceipt from '../src/models/PurchaseOrderReceipt.js';
import StockMovement from '../src/models/StockMovement.js';
import { getPermissionsForRole } from '../src/controllers/authController.js';
import connectDB from '../src/config/database.js';

dotenv.config();

// Default password for all seeded users
const DEFAULT_PASSWORD = 'password123';

// Helper function to hash password
const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

// Generate SKU
const generateSku = (productCode, size, color) => {
    const sizeCode = size.toUpperCase().replace(/\s+/g, '-');
    const colorCode = color.toUpperCase().replace(/\s+/g, '-');
    return `${productCode.toUpperCase()}-${sizeCode}-${colorCode}`;
};

// Seed data
const seedData = async () => {
    try {
        console.log('🌱 Starting database seeding...');

        // Connect to database
        await connectDB();
        console.log('✅ Connected to database');

        // Clear existing data (optional - comment out if you want to keep existing data)
        console.log('🗑️  Clearing existing data...');
        await Tenant.deleteMany({});
        await User.deleteMany({});
        await Product.deleteMany({});
        await Variant.deleteMany({});
        await Supplier.deleteMany({});
        await PurchaseOrder.deleteMany({});
        await PurchaseOrderItem.deleteMany({});
        await PurchaseOrderReceipt.deleteMany({});
        await StockMovement.deleteMany({});
        console.log('✅ Cleared existing data');

        // ========== TENANT 1: Fashion Store ==========
        console.log('Creating Tenant 1: Fashion Store...');
        const tenant1 = await Tenant.create({
            name: 'Fashion Store',
            status: 'active'
        });
        console.log(`✅ Created tenant: ${tenant1.name} (${tenant1.slug})`);

        // Users for Tenant 1
        const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
        
        const tenant1Owner = await User.create({
            email: 'owner@fashionstore.com',
            password: hashedPassword,
            tenantId: tenant1._id,
            role: 'owner',
            permissions: getPermissionsForRole('owner'),
            profile: {
                firstName: 'John',
                lastName: 'Smith'
            },
            status: 'active'
        });

        const tenant1Manager = await User.create({
            email: 'manager@fashionstore.com',
            password: hashedPassword,
            tenantId: tenant1._id,
            role: 'manager',
            permissions: getPermissionsForRole('manager'),
            profile: {
                firstName: 'Sarah',
                lastName: 'Johnson'
            },
            status: 'active'
        });

        const tenant1Staff = await User.create({
            email: 'staff@fashionstore.com',
            password: hashedPassword,
            tenantId: tenant1._id,
            role: 'staff',
            permissions: getPermissionsForRole('staff'),
            profile: {
                firstName: 'Mike',
                lastName: 'Davis'
            },
            status: 'active'
        });

        console.log(`✅ Created users for ${tenant1.name}: owner, manager, staff`);

        // Products for Tenant 1
        const product1 = await Product.create({
            tenantId: tenant1._id,
            name: 'Classic T-Shirt',
            description: 'Comfortable cotton t-shirt',
            productCode: 'TSH-001',
            basePrice: 29.99
        });

        const product2 = await Product.create({
            tenantId: tenant1._id,
            name: 'Denim Jeans',
            description: 'Classic blue denim jeans',
            productCode: 'JEAN-001',
            basePrice: 79.99
        });

        const product3 = await Product.create({
            tenantId: tenant1._id,
            name: 'Hooded Sweatshirt',
            description: 'Warm and cozy hooded sweatshirt',
            productCode: 'HOOD-001',
            basePrice: 49.99
        });

        // Variants for Tenant 1
        const variants1 = [
            { product: product1, size: 'S', color: 'Black', stock: 50, reservedStock: 5 },
            { product: product1, size: 'M', color: 'Black', stock: 75, reservedStock: 10 },
            { product: product1, size: 'L', color: 'Black', stock: 30, reservedStock: 3 },
            { product: product1, size: 'S', color: 'White', stock: 45, reservedStock: 8 },
            { product: product1, size: 'M', color: 'White', stock: 60, reservedStock: 5 },
            { product: product1, size: 'L', color: 'White', stock: 25, reservedStock: 2 },
            { product: product2, size: '30', color: 'Blue', stock: 20, reservedStock: 2 },
            { product: product2, size: '32', color: 'Blue', stock: 35, reservedStock: 5 },
            { product: product2, size: '34', color: 'Blue', stock: 40, reservedStock: 4 },
            { product: product2, size: '36', color: 'Blue', stock: 15, reservedStock: 1 },
            { product: product3, size: 'S', color: 'Grey', stock: 40, reservedStock: 4 },
            { product: product3, size: 'M', color: 'Grey', stock: 55, reservedStock: 6 },
            { product: product3, size: 'L', color: 'Grey', stock: 35, reservedStock: 3 },
            { product: product3, size: 'S', color: 'Navy', stock: 30, reservedStock: 2 },
            { product: product3, size: 'M', color: 'Navy', stock: 45, reservedStock: 5 },
            { product: product3, size: 'L', color: 'Navy', stock: 25, reservedStock: 2 }
        ];

        const createdVariants1 = [];
        for (const v of variants1) {
            const sku = generateSku(v.product.productCode, v.size, v.color);
            const variant = await Variant.create({
                tenantId: tenant1._id,
                productId: v.product._id,
                sku,
                size: v.size,
                color: v.color,
                stock: v.stock,
                reservedStock: v.reservedStock
            });
            createdVariants1.push(variant);
        }
        console.log(`✅ Created ${createdVariants1.length} variants for ${tenant1.name}`);

        // Suppliers for Tenant 1 (each supplier has different products)
        const supplier1 = await Supplier.create({
            tenantId: tenant1._id,
            supplierCode: 'SUP-001',
            name: 'Textile Manufacturers Inc',
            contactEmail: 'contact@textilemfg.com',
            contactPhone: '+1-555-0101',
            address: '123 Textile St, New York, NY 10001',
            status: 'active',
            pricing: new Map([
                [product1._id.toString(), 15.00] // Only T-Shirts
            ])
        });

        const supplier2 = await Supplier.create({
            tenantId: tenant1._id,
            supplierCode: 'SUP-002',
            name: 'Fashion Wholesale Co',
            contactEmail: 'sales@fashionwholesale.com',
            contactPhone: '+1-555-0102',
            address: '456 Fashion Ave, Los Angeles, CA 90001',
            status: 'active',
            pricing: new Map([
                [product2._id.toString(), 45.00], // Only Jeans
                [product3._id.toString(), 25.00]   // Only Hoodies
            ])
        });
        console.log(`✅ Created 2 suppliers for ${tenant1.name}`);

        // Purchase Orders for Tenant 1
        // PO1 from Supplier1 (only T-Shirts)
        const po1 = await PurchaseOrder.create({
            tenantId: tenant1._id,
            poNumber: 'PO-20240115-0001',
            supplierId: supplier1._id,
            status: 'confirmed',
            orderDate: new Date('2024-01-15'),
            expectedDeliveryDate: new Date('2024-01-25'),
            totalAmount: 750.00,
            createdBy: tenant1Owner._id
        });

        await PurchaseOrderItem.insertMany([
            {
                tenantId: tenant1._id,
                purchaseOrderId: po1._id,
                productId: product1._id,
                variantId: createdVariants1[1]._id, // M-Black
                variantSku: createdVariants1[1].sku,
                quantityOrdered: 50,
                expectedPrice: 15.00,
                quantityReceived: 0
            }
        ]);

        // PO2 from Supplier2 (Jeans and Hoodies)
        const po2 = await PurchaseOrder.create({
            tenantId: tenant1._id,
            poNumber: 'PO-20240116-0001',
            supplierId: supplier2._id,
            status: 'sent',
            orderDate: new Date('2024-01-16'),
            expectedDeliveryDate: new Date('2024-01-26'),
            totalAmount: 2100.00,
            createdBy: tenant1Owner._id
        });

        await PurchaseOrderItem.insertMany([
            {
                tenantId: tenant1._id,
                purchaseOrderId: po2._id,
                productId: product2._id,
                variantId: createdVariants1[7]._id, // 32-Blue
                variantSku: createdVariants1[7].sku,
                quantityOrdered: 30,
                expectedPrice: 45.00,
                quantityReceived: 0
            },
            {
                tenantId: tenant1._id,
                purchaseOrderId: po2._id,
                productId: product3._id,
                variantId: createdVariants1[11]._id, // M-Grey Hoodie
                variantSku: createdVariants1[11].sku,
                quantityOrdered: 20,
                expectedPrice: 25.00,
                quantityReceived: 0
            }
        ]);
        console.log(`✅ Created purchase order for ${tenant1.name}`);

        // Stock Movements for Tenant 1 (last 30 days for top sellers)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const stockMovements1 = [];
        for (let i = 0; i < 30; i++) {
            const date = new Date(thirtyDaysAgo);
            date.setDate(date.getDate() + i);
            
            // Sales
            if (i % 2 === 0) {
                stockMovements1.push({
                    tenantId: tenant1._id,
                    productId: product1._id,
                    variantId: createdVariants1[1]._id, // M-Black
                    variantSku: createdVariants1[1].sku,
                    movementType: 'sale',
                    quantity: -Math.floor(Math.random() * 5) - 1,
                    previousStock: 75 - i,
                    newStock: 75 - i - Math.floor(Math.random() * 5) - 1,
                    createdBy: tenant1Owner._id,
                    createdAt: date
                });
            }

            // Purchases
            if (i % 3 === 0) {
                stockMovements1.push({
                    tenantId: tenant1._id,
                    productId: product1._id,
                    variantId: createdVariants1[0]._id, // S-Black
                    variantSku: createdVariants1[0].sku,
                    movementType: 'purchase',
                    quantity: Math.floor(Math.random() * 10) + 5,
                    previousStock: 50 + i,
                    newStock: 50 + i + Math.floor(Math.random() * 10) + 5,
                    createdBy: tenant1Owner._id,
                    createdAt: date
                });
            }
        }

        await StockMovement.insertMany(stockMovements1);
        console.log(`✅ Created ${stockMovements1.length} stock movements for ${tenant1.name}`);

        // ========== TENANT 2: Electronics Store ==========
        console.log('Creating Tenant 2: Electronics Store...');
        const tenant2 = await Tenant.create({
            name: 'Electronics Store',
            status: 'active'
        });
        console.log(`✅ Created tenant: ${tenant2.name} (${tenant2.slug})`);

        // Users for Tenant 2
        const tenant2Owner = await User.create({
            email: 'owner@electronics.com',
            password: hashedPassword,
            tenantId: tenant2._id,
            role: 'owner',
            permissions: getPermissionsForRole('owner'),
            profile: {
                firstName: 'Emily',
                lastName: 'Chen'
            },
            status: 'active'
        });

        const tenant2Manager = await User.create({
            email: 'manager@electronics.com',
            password: hashedPassword,
            tenantId: tenant2._id,
            role: 'manager',
            permissions: getPermissionsForRole('manager'),
            profile: {
                firstName: 'David',
                lastName: 'Wilson'
            },
            status: 'active'
        });

        const tenant2Staff1 = await User.create({
            email: 'staff1@electronics.com',
            password: hashedPassword,
            tenantId: tenant2._id,
            role: 'staff',
            permissions: getPermissionsForRole('staff'),
            profile: {
                firstName: 'Lisa',
                lastName: 'Anderson'
            },
            status: 'active'
        });

        const tenant2Staff2 = await User.create({
            email: 'staff2@electronics.com',
            password: hashedPassword,
            tenantId: tenant2._id,
            role: 'staff',
            permissions: getPermissionsForRole('staff'),
            profile: {
                firstName: 'Tom',
                lastName: 'Brown'
            },
            status: 'active'
        });

        console.log(`✅ Created users for ${tenant2.name}: owner, manager, 2 staff`);

        // Products for Tenant 2
        const product4 = await Product.create({
            tenantId: tenant2._id,
            name: 'Wireless Headphones',
            description: 'Premium noise-cancelling headphones',
            productCode: 'HP-001',
            basePrice: 199.99
        });

        const product5 = await Product.create({
            tenantId: tenant2._id,
            name: 'Smartphone',
            description: 'Latest generation smartphone',
            productCode: 'PH-001',
            basePrice: 899.99
        });

        // Variants for Tenant 2
        const variants2 = [
            { product: product4, size: 'One', color: 'Black', stock: 100, reservedStock: 15 },
            { product: product4, size: 'One', color: 'White', stock: 80, reservedStock: 12 },
            { product: product4, size: 'One', color: 'Blue', stock: 60, reservedStock: 8 },
            { product: product5, size: '128GB', color: 'Black', stock: 50, reservedStock: 10 },
            { product: product5, size: '128GB', color: 'White', stock: 45, reservedStock: 8 },
            { product: product5, size: '256GB', color: 'Black', stock: 30, reservedStock: 5 },
            { product: product5, size: '256GB', color: 'White', stock: 25, reservedStock: 4 }
        ];

        const createdVariants2 = [];
        for (const v of variants2) {
            const sku = generateSku(v.product.productCode, v.size, v.color);
            const variant = await Variant.create({
                tenantId: tenant2._id,
                productId: v.product._id,
                sku,
                size: v.size,
                color: v.color,
                stock: v.stock,
                reservedStock: v.reservedStock
            });
            createdVariants2.push(variant);
        }
        console.log(`✅ Created ${createdVariants2.length} variants for ${tenant2.name}`);

        // Suppliers for Tenant 2
        const supplier3 = await Supplier.create({
            tenantId: tenant2._id,
            supplierCode: 'SUP-001',
            name: 'Tech Distributors Ltd',
            contactEmail: 'orders@techdist.com',
            contactPhone: '+1-555-0201',
            address: '789 Tech Blvd, San Francisco, CA 94102',
            status: 'active',
            pricing: new Map([
                [product4._id.toString(), 120.00],
                [product5._id.toString(), 650.00]
            ])
        });
        console.log(`✅ Created 1 supplier for ${tenant2.name}`);

        // Stock Movements for Tenant 2
        const stockMovements2 = [];
        for (let i = 0; i < 20; i++) {
            const date = new Date(thirtyDaysAgo);
            date.setDate(date.getDate() + i);
            
            if (i % 2 === 0) {
                stockMovements2.push({
                    tenantId: tenant2._id,
                    productId: product4._id,
                    variantId: createdVariants2[0]._id,
                    variantSku: createdVariants2[0].sku,
                    movementType: 'sale',
                    quantity: -Math.floor(Math.random() * 3) - 1,
                    previousStock: 100 - i,
                    newStock: 100 - i - Math.floor(Math.random() * 3) - 1,
                    createdBy: tenant2Owner._id,
                    createdAt: date
                });
            }
        }

        await StockMovement.insertMany(stockMovements2);
        console.log(`✅ Created ${stockMovements2.length} stock movements for ${tenant2.name}`);

        // Purchase Order for Tenant 2
        const po2_tenant2 = await PurchaseOrder.create({
            tenantId: tenant2._id,
            poNumber: 'PO-20240118-0001',
            supplierId: supplier3._id,
            status: 'confirmed',
            orderDate: new Date('2024-01-18'),
            expectedDeliveryDate: new Date('2024-01-28'),
            totalAmount: 7800.00,
            createdBy: tenant2Owner._id
        });

        await PurchaseOrderItem.insertMany([
            {
                tenantId: tenant2._id,
                purchaseOrderId: po2_tenant2._id,
                productId: product4._id,
                variantId: createdVariants2[0]._id, // One-Black Headphones
                variantSku: createdVariants2[0].sku,
                quantityOrdered: 50,
                expectedPrice: 120.00,
                quantityReceived: 0
            },
            {
                tenantId: tenant2._id,
                purchaseOrderId: po2_tenant2._id,
                productId: product5._id,
                variantId: createdVariants2[3]._id, // 128GB-Black Smartphone
                variantSku: createdVariants2[3].sku,
                quantityOrdered: 10,
                expectedPrice: 650.00,
                quantityReceived: 0
            }
        ]);
        console.log(`✅ Created purchase order for ${tenant2.name}`);

        // ========== TENANT 3: Sports Store ==========
        console.log('Creating Tenant 3: Sports Store...');
        const tenant3 = await Tenant.create({
            name: 'Sports Store',
            status: 'active'
        });
        console.log(`✅ Created tenant: ${tenant3.name} (${tenant3.slug})`);

        // Users for Tenant 3
        const tenant3Owner = await User.create({
            email: 'owner@sports.com',
            password: hashedPassword,
            tenantId: tenant3._id,
            role: 'owner',
            permissions: getPermissionsForRole('owner'),
            profile: {
                firstName: 'Robert',
                lastName: 'Taylor'
            },
            status: 'active'
        });

        const tenant3Staff = await User.create({
            email: 'staff@sports.com',
            password: hashedPassword,
            tenantId: tenant3._id,
            role: 'staff',
            permissions: getPermissionsForRole('staff'),
            profile: {
                firstName: 'Jessica',
                lastName: 'Martinez'
            },
            status: 'active'
        });
        console.log(`✅ Created users for ${tenant3.name}: owner, staff`);

        // Products for Tenant 3
        const product6 = await Product.create({
            tenantId: tenant3._id,
            name: 'Running Shoes',
            description: 'Professional running shoes',
            productCode: 'SHOE-001',
            basePrice: 129.99
        });

        // Variants for Tenant 3 (some with low stock for testing)
        const variants3 = [
            { product: product6, size: '8', color: 'Black', stock: 5, reservedStock: 1 }, // Low stock
            { product: product6, size: '9', color: 'Black', stock: 8, reservedStock: 2 }, // Low stock
            { product: product6, size: '10', color: 'Black', stock: 15, reservedStock: 3 },
            { product: product6, size: '8', color: 'White', stock: 3, reservedStock: 1 }, // Low stock
            { product: product6, size: '9', color: 'White', stock: 12, reservedStock: 2 }
        ];

        const createdVariants3 = [];
        for (const v of variants3) {
            const sku = generateSku(v.product.productCode, v.size, v.color);
            const variant = await Variant.create({
                tenantId: tenant3._id,
                productId: v.product._id,
                sku,
                size: v.size,
                color: v.color,
                stock: v.stock,
                reservedStock: v.reservedStock
            });
            createdVariants3.push(variant);
        }
        console.log(`✅ Created ${createdVariants3.length} variants for ${tenant3.name} (some with low stock)`);

        // Purchase Order for Tenant 3 (pending - to test low stock with pending POs)
        const po3 = await PurchaseOrder.create({
            tenantId: tenant3._id,
            poNumber: 'PO-20240120-0001',
            supplierId: supplier3._id, // Reusing supplier
            status: 'sent',
            orderDate: new Date('2024-01-20'),
            expectedDeliveryDate: new Date('2024-01-30'),
            totalAmount: 650.00,
            createdBy: tenant3Owner._id
        });

        await PurchaseOrderItem.create({
            tenantId: tenant3._id,
            purchaseOrderId: po3._id,
            productId: product6._id,
            variantId: createdVariants3[0]._id, // 8-Black (low stock)
            variantSku: createdVariants3[0].sku,
            quantityOrdered: 20,
            expectedPrice: 80.00,
            quantityReceived: 0 // Pending
        });
        console.log(`✅ Created pending purchase order for ${tenant3.name}`);

        console.log('\n✅ Seeding completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`   - Tenants: 3`);
        console.log(`   - Users: 9 (3 owners, 2 managers, 4 staff)`);
        console.log(`   - Products: 6`);
        console.log(`   - Variants: 22`);
        console.log(`   - Suppliers: 3`);
        console.log(`   - Purchase Orders: 4`);
        console.log(`   - Stock Movements: ${stockMovements1.length + stockMovements2.length}`);
        console.log('\n🔑 Default password for all users: password123');
        console.log('\n📧 Test user emails:');
        console.log('   Tenant 1 (Fashion Store):');
        console.log('     - owner@fashionstore.com (owner)');
        console.log('     - manager@fashionstore.com (manager)');
        console.log('     - staff@fashionstore.com (staff)');
        console.log('   Tenant 2 (Electronics Store):');
        console.log('     - owner@electronics.com (owner)');
        console.log('     - manager@electronics.com (manager)');
        console.log('     - staff1@electronics.com (staff)');
        console.log('     - staff2@electronics.com (staff)');
        console.log('   Tenant 3 (Sports Store):');
        console.log('     - owner@sports.com (owner)');
        console.log('     - staff@sports.com (staff)');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding error:', error);
        process.exit(1);
    }
};

// Run seed
seedData();

