import StockMovement from '../models/StockMovement.js';
import Product from '../models/Product.js';
import Variant from '../models/Variant.js';
import mongoose from 'mongoose';

// Update variant stock (can be used with or without session for transactions)
export const updateVariantStock = async (variantId, quantityChange, tenantId, session = null) => {
    try {
        const variant = await Variant.findOne({
            _id: variantId,
            tenantId
        }).session(session);

        if (!variant) {
            throw new Error('Variant not found');
        }

        const previousStock = variant.stock;
        const newStock = previousStock + quantityChange;

        // Prevent negative stock
        if (newStock < 0) {
            throw new Error('Insufficient stock');
        }

        // Update stock atomically
        const result = await Variant.findOneAndUpdate(
            {
                _id: variantId,
                tenantId,
                stock: { $gte: -quantityChange } // Ensure we don't go negative
            },
            {
                $inc: { stock: quantityChange },
                $set: { updatedAt: new Date() }
            },
            { new: true, session }
        );

        if (!result) {
            throw new Error('Failed to update stock - insufficient quantity or variant not found');
        }

        return {
            success: true,
            previousStock,
            newStock,
            variant: result
        };
    } catch (error) {
        // Re-throw error to be handled by caller
        throw error;
    }
};

// Create stock movement and update variant stock atomically in one transaction
export const createStockMovement = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { productId, variantSku, movementType, quantity, notes, referenceId, referenceType } = req.body;
        const tenantId = req.tenant._id;
        const userId = req.user._id;

        // Validate required fields
        if (!productId || !variantSku || !movementType || quantity === undefined) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'productId, variantSku, movementType, and quantity are required'
            });
        }

        // Validate movement type
        const validTypes = ['purchase', 'sale', 'return', 'adjustment'];
        if (!validTypes.includes(movementType)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: `movementType must be one of: ${validTypes.join(', ')}`
            });
        }

        // Validate product exists
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'Invalid product ID'
            });
        }

        const product = await Product.findOne({ _id: productId, tenantId }).session(session);
        if (!product) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        // Find variant by SKU from Variant collection
        const variant = await Variant.findOne({ 
            productId, 
            sku: variantSku.toUpperCase(), 
            tenantId 
        }).session(session);
        
        if (!variant) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                error: 'Variant not found'
            });
        }

        // Determine quantity change based on movement type
        let quantityChange;
        switch (movementType) {
            case 'purchase':
            case 'return':
                quantityChange = Math.abs(quantity); // Increase stock
                break;
            case 'sale':
                quantityChange = -Math.abs(quantity); // Decrease stock
                break;
            case 'adjustment':
                // For adjustment, quantity can be positive or negative
                quantityChange = quantity;
                break;
            default:
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    success: false,
                    error: 'Invalid movement type'
                });
        }

        // Update stock atomically (using session for transaction)
        const stockUpdate = await updateVariantStock(
            variant._id,
            quantityChange,
            tenantId,
            session
        );

        // Create stock movement record (in same transaction)
        const stockMovement = await StockMovement.create([{
            tenantId,
            productId,
            variantId: variant._id,
            variantSku: variantSku.toUpperCase(),
            movementType,
            quantity: quantityChange,
            previousStock: stockUpdate.previousStock,
            newStock: stockUpdate.newStock,
            referenceId: referenceId || null,
            referenceType: referenceType || null,
            notes: notes?.trim(),
            createdBy: userId
        }], { session });

        // Commit transaction - both operations succeed or both fail
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            data: stockMovement[0]
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Create stock movement error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to create stock movement'
        });
    }
};

// Get stock movements with filtering
export const getStockMovements = async (req, res) => {
    try {
        const tenantId = req.tenant._id;
        const { 
            page = 1, 
            limit = 20, 
            productId, 
            variantSku, 
            movementType, 
            startDate, 
            endDate 
        } = req.query;

        const query = { tenantId };

        // Filter by product
        if (productId) {
            if (!mongoose.Types.ObjectId.isValid(productId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid product ID'
                });
            }
            query.productId = productId;
        }

        // Filter by variant SKU
        if (variantSku) {
            query.variantSku = variantSku.toUpperCase();
        }

        // Filter by movement type
        if (movementType) {
            const validTypes = ['purchase', 'sale', 'return', 'adjustment'];
            if (!validTypes.includes(movementType)) {
                return res.status(400).json({
                    success: false,
                    error: `movementType must be one of: ${validTypes.join(', ')}`
                });
            }
            query.movementType = movementType;
        }

        // Filter by date range
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                query.createdAt.$lte = new Date(endDate);
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const movements = await StockMovement.find(query)
            .populate('productId', 'name productCode')
            .populate('createdBy', 'profile.firstName profile.lastName email')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await StockMovement.countDocuments(query);

        res.json({
            success: true,
            data: movements,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get stock movements error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stock movements'
        });
    }
};

// Get stock history for a specific variant
export const getStockHistory = async (req, res) => {
    try {
        const { productId, sku } = req.params;
        const tenantId = req.tenant._id;
        const { page = 1, limit = 20 } = req.query;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid product ID'
            });
        }

        // Verify product exists
        const product = await Product.findOne({ _id: productId, tenantId });
        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        // Find variant from Variant collection
        const variant = await Variant.findOne({ 
            productId, 
            sku: sku.toUpperCase(), 
            tenantId 
        });
        
        if (!variant) {
            return res.status(404).json({
                success: false,
                error: 'Variant not found'
            });
        }

        const query = {
            tenantId,
            productId,
            variantSku: sku.toUpperCase()
        };

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const movements = await StockMovement.find(query)
            .populate('createdBy', 'profile.firstName profile.lastName email')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await StockMovement.countDocuments(query);

        // Get current stock info from variant
        const currentStock = {
            stock: variant.stock,
            reservedStock: variant.reservedStock,
            availableStock: variant.availableStock
        };

        res.json({
            success: true,
            data: {
                productId: product._id,
                productName: product.name,
                productCode: product.productCode,
                variant: {
                    sku: variant.sku,
                    size: variant.size,
                    color: variant.color,
                    currentStock
                },
                movements,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        console.error('Get stock history error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stock history'
        });
    }
};
