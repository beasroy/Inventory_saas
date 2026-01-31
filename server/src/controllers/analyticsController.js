import Variant from '../models/Variant.js';
import StockMovement from '../models/StockMovement.js';
import PurchaseOrderItem from '../models/PurchaseOrderItem.js';
import mongoose from 'mongoose';

const LOW_STOCK_THRESHOLD = 10; // Default threshold

// Get dashboard analytics data
export const getDashboardData = async (req, res) => {
    try {
        const tenantId = req.tenant._id;
        const { lowStockThreshold = LOW_STOCK_THRESHOLD } = req.query;

        const [inventoryValue, lowStockItems, topSellers, stockMovementGraph] = await Promise.all([
            calculateInventoryValue(tenantId),
            getLowStockItems(tenantId, parseInt(lowStockThreshold)),
            getTopSellers(tenantId),
            getStockMovementGraph(tenantId)
        ]);

        res.json({
            success: true,
            data: {
                inventoryValue,
                lowStockItems,
                topSellers,
                stockMovementGraph
            }
        });
    } catch (error) {
        console.error('Get dashboard data error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch dashboard data'
        });
    }
};

// Calculate total inventory value
const calculateInventoryValue = async (tenantId) => {
    try {
        // Get all variants with their products
        const variants = await Variant.find({ tenantId })
            .populate('productId', 'basePrice variantPrices')
            .select('sku stock productId')
            .lean();

        let totalValue = 0;

        for (const variant of variants) {
            const product = variant.productId;
            if (!product) continue;

            // Get price: check variantPrices first, then basePrice
            let price = product.basePrice || 0;
            
            // variantPrices is stored as a Map in Mongoose, but as an object in MongoDB
            if (product.variantPrices) {
                // Handle both Map and plain object
                const variantPricesObj = product.variantPrices instanceof Map 
                    ? Object.fromEntries(product.variantPrices)
                    : product.variantPrices;
                
                if (variantPricesObj && variantPricesObj[variant.sku] !== undefined) {
                    price = variantPricesObj[variant.sku];
                }
            }

            totalValue += variant.stock * price;
        }

        return totalValue;
    } catch (error) {
        console.error('Calculate inventory value error:', error);
        return 0;
    }
};

// Get low stock items considering pending PO quantities
const getLowStockItems = async (tenantId, threshold) => {
    try {
        // Get variants with low stock
        const lowStockVariants = await Variant.find({
            tenantId,
            stock: { $lt: threshold }
        })
            .populate('productId', 'name productCode basePrice variantPrices')
            .select('sku size color stock reservedStock productId')
            .limit(50); // Limit to prevent too many results

        // Get pending PO quantities for these variants
        const variantIds = lowStockVariants.map(v => v._id);
        
        const pendingPOItems = await PurchaseOrderItem.aggregate([
            {
                $match: {
                    tenantId: new mongoose.Types.ObjectId(tenantId),
                    variantId: { $in: variantIds }
                }
            },
            {
                $lookup: {
                    from: 'purchaseorders',
                    localField: 'purchaseOrderId',
                    foreignField: '_id',
                    as: 'purchaseOrder'
                }
            },
            {
                $unwind: '$purchaseOrder'
            },
            {
                $match: {
                    'purchaseOrder.status': { $in: ['draft', 'sent', 'confirmed'] }
                }
            },
            {
                $project: {
                    variantId: 1,
                    pendingQuantity: {
                        $subtract: ['$quantityOrdered', '$quantityReceived']
                    }
                }
            },
            {
                $group: {
                    _id: '$variantId',
                    totalPendingQuantity: { $sum: '$pendingQuantity' }
                }
            }
        ]);

        // Create a map of variantId -> pending quantity
        const pendingMap = new Map();
        pendingPOItems.forEach(item => {
            pendingMap.set(item._id.toString(), item.totalPendingQuantity);
        });

        // Combine variant data with pending quantities
        const lowStockItems = lowStockVariants.map(variant => {
            const pendingQuantity = pendingMap.get(variant._id.toString()) || 0;
            const totalAvailable = variant.stock + pendingQuantity;

            // Get price for this variant
            const product = variant.productId;
            let price = product.basePrice || 0;
            
            // Handle both Map and plain object for variantPrices
            if (product.variantPrices) {
                if (product.variantPrices instanceof Map) {
                    const variantPrice = product.variantPrices.get(variant.sku);
                    if (variantPrice !== undefined) {
                        price = variantPrice;
                    }
                } else if (typeof product.variantPrices === 'object') {
                    // Handle plain object from database
                    if (product.variantPrices[variant.sku] !== undefined) {
                        price = product.variantPrices[variant.sku];
                    }
                }
            }

            return {
                variantId: variant._id,
                variantSku: variant.sku,
                productId: product._id,
                productName: product.name,
                productCode: product.productCode,
                size: variant.size,
                color: variant.color,
                currentStock: variant.stock,
                reservedStock: variant.reservedStock,
                availableStock: variant.stock - variant.reservedStock,
                pendingQuantity,
                totalAvailable,
                price,
                isLowStock: totalAvailable < threshold
            };
        });

        // Sort by total available (lowest first)
        lowStockItems.sort((a, b) => a.totalAvailable - b.totalAvailable);

        return lowStockItems;
    } catch (error) {
        console.error('Get low stock items error:', error);
        return [];
    }
};

// Get top 5 sellers in last 30 days
const getTopSellers = async (tenantId) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const topSellers = await StockMovement.aggregate([
            {
                $match: {
                    tenantId: new mongoose.Types.ObjectId(tenantId),
                    movementType: 'sale',
                    createdAt: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: '$productId',
                    totalQuantitySold: { $sum: { $abs: '$quantity' } }
                }
            },
            {
                $sort: { totalQuantitySold: -1 }
            },
            {
                $limit: 5
            },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            {
                $unwind: '$product'
            },
            {
                $project: {
                    productId: '$_id',
                    productName: '$product.name',
                    productCode: '$product.productCode',
                    totalQuantitySold: 1,
                    basePrice: '$product.basePrice'
                }
            }
        ]);

        return topSellers;
    } catch (error) {
        console.error('Get top sellers error:', error);
        return [];
    }
};

// Get stock movement graph data for last 7 days
const getStockMovementGraph = async (tenantId) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0); // Start of day

        const movements = await StockMovement.aggregate([
            {
                $match: {
                    tenantId: new mongoose.Types.ObjectId(tenantId),
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $project: {
                    movementType: 1,
                    quantity: { $abs: '$quantity' },
                    date: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt'
                        }
                    }
                }
            },
            {
                $group: {
                    _id: {
                        date: '$date',
                        movementType: '$movementType'
                    },
                    totalQuantity: { $sum: '$quantity' }
                }
            },
            {
                $group: {
                    _id: '$_id.date',
                    movements: {
                        $push: {
                            movementType: '$_id.movementType',
                            quantity: '$totalQuantity'
                        }
                    }
                }
            },
            {
                $sort: { _id: 1 }
            },
            {
                $project: {
                    date: '$_id',
                    movements: 1,
                    _id: 0
                }
            }
        ]);

        // Format for chart (ensure all movement types are present for each date)
        const movementTypes = ['purchase', 'sale', 'return', 'adjustment'];
        const formattedData = movements.map(item => {
            const movementMap = {};
            item.movements.forEach(m => {
                movementMap[m.movementType] = m.quantity;
            });

            const result = { date: item.date };
            movementTypes.forEach(type => {
                result[type] = movementMap[type] || 0;
            });

            return result;
        });

        // Fill in missing dates with zeros
        const today = new Date();
        const allDates = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const dateStr = date.toISOString().split('T')[0];
            allDates.push(dateStr);
        }

        const finalData = allDates.map(dateStr => {
            const existing = formattedData.find(d => d.date === dateStr);
            if (existing) {
                return existing;
            }
            return {
                date: dateStr,
                purchase: 0,
                sale: 0,
                return: 0,
                adjustment: 0
            };
        });

        return finalData;
    } catch (error) {
        console.error('Get stock movement graph error:', error);
        return [];
    }
};

