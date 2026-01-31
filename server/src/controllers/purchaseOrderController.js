import PurchaseOrder from '../models/PurchaseOrder.js';
import PurchaseOrderItem from '../models/PurchaseOrderItem.js';
import PurchaseOrderReceipt from '../models/PurchaseOrderReceipt.js';
import Supplier from '../models/Supplier.js';
import Product from '../models/Product.js';
import Variant from '../models/Variant.js';
import { updateVariantStock } from './stockMovementController.js';
import StockMovement from '../models/StockMovement.js';
import mongoose from 'mongoose';
import { emitPurchaseOrderCreated, emitPurchaseOrderStatusUpdated, emitReceiptCreated } from '../utils/socketEvents.js';

// Generate PO number: PO-YYYYMMDD-####
const generatePONumber = async (tenantId) => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `PO-${dateStr}-`;

    // Find the highest number for today
    const todayPOs = await PurchaseOrder.find({
        tenantId,
        poNumber: { $regex: `^${prefix}` }
    }).sort({ poNumber: -1 }).limit(1);

    let sequence = 1;
    if (todayPOs.length > 0) {
        const lastNumber = todayPOs[0].poNumber.split('-').pop();
        sequence = parseInt(lastNumber, 10) + 1;
    }

    const paddedSequence = sequence.toString().padStart(4, '0');
    return `${prefix}${paddedSequence}`;
};

// Generate receipt number: REC-YYYYMMDD-####
const generateReceiptNumber = async (tenantId) => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `REC-${dateStr}-`;

    // Find the highest number for today
    const todayReceipts = await PurchaseOrderReceipt.find({
        tenantId,
        receiptNumber: { $regex: `^${prefix}` }
    }).sort({ receiptNumber: -1 }).limit(1);

    let sequence = 1;
    if (todayReceipts.length > 0) {
        const lastNumber = todayReceipts[0].receiptNumber.split('-').pop();
        sequence = parseInt(lastNumber, 10) + 1;
    }

    const paddedSequence = sequence.toString().padStart(4, '0');
    return `${prefix}${paddedSequence}`;
};

// Create Purchase Order
export const createPurchaseOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { supplierId, items, expectedDeliveryDate, notes } = req.body;
        const tenantId = req.tenant._id;
        const userId = req.user._id;

        // Validate required fields
        if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'supplierId and items array are required'
            });
        }

        // Validate supplier exists
        if (!mongoose.Types.ObjectId.isValid(supplierId)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'Invalid supplier ID'
            });
        }

        const supplier = await Supplier.findOne({ _id: supplierId, tenantId }).session(session);
        if (!supplier) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                error: 'Supplier not found'
            });
        }

        // Generate PO number
        const poNumber = await generatePONumber(tenantId);

        // Validate and process items
        let totalAmount = 0;
        const itemDocuments = [];

        for (const item of items) {
            const { productId, variantSku, quantityOrdered, expectedPrice, notes: itemNotes } = item;

            if (!productId || !variantSku || !quantityOrdered || expectedPrice === undefined) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    success: false,
                    error: 'Each item must have productId, variantSku, quantityOrdered, and expectedPrice'
                });
            }

            if (!mongoose.Types.ObjectId.isValid(productId)) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    success: false,
                    error: 'Invalid product ID in items'
                });
            }

            if (quantityOrdered <= 0 || expectedPrice < 0) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    success: false,
                    error: 'quantityOrdered must be > 0 and expectedPrice must be >= 0'
                });
            }

            // Verify product exists
            const product = await Product.findOne({ _id: productId, tenantId }).session(session);
            if (!product) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({
                    success: false,
                    error: `Product not found: ${productId}`
                });
            }

            // Verify variant exists
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
                    error: `Variant not found: ${variantSku}`
                });
            }

            totalAmount += quantityOrdered * expectedPrice;
            itemDocuments.push({
                tenantId,
                purchaseOrderId: null, // Will be set after PO creation
                productId,
                variantId: variant._id,
                variantSku: variantSku.toUpperCase(),
                quantityOrdered,
                expectedPrice,
                quantityReceived: 0,
                notes: itemNotes || null
            });
        }

        // Create Purchase Order
        const purchaseOrder = await PurchaseOrder.create([{
            tenantId,
            poNumber,
            supplierId,
            status: 'draft',
            orderDate: new Date(),
            expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
            notes: notes || null,
            totalAmount,
            createdBy: userId
        }], { session });

        // Create Purchase Order Items
        const poId = purchaseOrder[0]._id;
        itemDocuments.forEach(item => {
            item.purchaseOrderId = poId;
        });

        const poItems = await PurchaseOrderItem.insertMany(itemDocuments, { session });

        await session.commitTransaction();
        session.endSession();

        // Populate and return
        const populatedPO = await PurchaseOrder.findById(poId)
            .populate('supplierId', 'name supplierCode')
            .populate('createdBy', 'profile.firstName profile.lastName email');

        const itemsWithDetails = await PurchaseOrderItem.find({ purchaseOrderId: poId })
            .populate('productId', 'name productCode')
            .populate('variantId', 'sku size color');

        // Emit socket event for PO creation
        emitPurchaseOrderCreated(req, {
            purchaseOrderId: poId.toString(),
            poNumber: poNumber,
            supplierId: supplierId.toString(),
            status: 'draft',
            items: itemsWithDetails.map(item => ({
                itemId: item._id.toString(),
                variantId: item.variantId.toString(),
                quantityOrdered: item.quantityOrdered
            }))
        });

        res.status(201).json({
            success: true,
            data: {
                ...populatedPO.toObject(),
                items: itemsWithDetails
            }
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Create purchase order error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to create purchase order'
        });
    }
};

// Get all Purchase Orders
export const getPurchaseOrders = async (req, res) => {
    try {
        const tenantId = req.tenant._id;
        const { page = 1, limit = 20, status, supplierId, startDate, endDate } = req.query;

        const query = { tenantId };

        // Filter by status
        if (status && ['draft', 'sent', 'confirmed', 'received'].includes(status)) {
            query.status = status;
        }

        // Filter by supplier
        if (supplierId) {
            if (!mongoose.Types.ObjectId.isValid(supplierId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid supplier ID'
                });
            }
            query.supplierId = supplierId;
        }

        // Filter by date range
        if (startDate || endDate) {
            query.orderDate = {};
            if (startDate) {
                query.orderDate.$gte = new Date(startDate);
            }
            if (endDate) {
                query.orderDate.$lte = new Date(endDate);
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const purchaseOrders = await PurchaseOrder.find(query)
            .populate('supplierId', 'name supplierCode')
            .populate('createdBy', 'profile.firstName profile.lastName email')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await PurchaseOrder.countDocuments(query);

        res.json({
            success: true,
            data: purchaseOrders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get purchase orders error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch purchase orders'
        });
    }
};

// Get Purchase Order by ID with items and receipts
export const getPurchaseOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid purchase order ID'
            });
        }

        const purchaseOrder = await PurchaseOrder.findOne({ _id: id, tenantId })
            .populate('supplierId', 'name supplierCode contactEmail contactPhone')
            .populate('createdBy', 'profile.firstName profile.lastName email');

        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                error: 'Purchase order not found'
            });
        }

        // Get items
        const items = await PurchaseOrderItem.find({ purchaseOrderId: id, tenantId })
            .populate('productId', 'name productCode')
            .populate('variantId', 'sku size color stock');

        // Get receipts
        const receipts = await PurchaseOrderReceipt.find({ purchaseOrderId: id, tenantId })
            .populate('createdBy', 'profile.firstName profile.lastName email')
            .sort({ receiptDate: -1 });

        // Calculate price variance for each item dynamically from receipts
        const itemsWithVariance = await Promise.all(items.map(async (item) => {
            // Get all receipts for this item
            const itemReceipts = receipts.filter(receipt =>
                receipt.items.some(ri => ri.itemId.toString() === item._id.toString())
            );

            // Calculate cumulative variance
            let totalVariance = 0;
            const receiptDetails = [];

            for (const receipt of itemReceipts) {
                const receiptItem = receipt.items.find(ri => ri.itemId.toString() === item._id.toString());
                if (receiptItem) {
                    const variance = (receiptItem.actualPrice - item.expectedPrice) * receiptItem.quantityReceived;
                    totalVariance += variance;
                    receiptDetails.push({
                        receiptNumber: receipt.receiptNumber,
                        receiptDate: receipt.receiptDate,
                        quantityReceived: receiptItem.quantityReceived,
                        actualPrice: receiptItem.actualPrice,
                        variance
                    });
                }
            }

            return {
                ...item.toObject(),
                priceVariance: totalVariance,
                receiptDetails
            };
        }));

        // Calculate totals
        const expectedTotal = items.reduce((sum, item) => sum + (item.quantityOrdered * item.expectedPrice), 0);
        const actualTotal = itemsWithVariance.reduce((sum, item) => {
            const itemActual = item.receiptDetails.reduce((s, rd) => s + (rd.quantityReceived * rd.actualPrice), 0);
            return sum + itemActual;
        }, 0);
        const totalVariance = actualTotal - expectedTotal;

        res.json({
            success: true,
            data: {
                ...purchaseOrder.toObject(),
                items: itemsWithVariance,
                receipts,
                totals: {
                    expected: expectedTotal,
                    actual: actualTotal,
                    variance: totalVariance
                }
            }
        });
    } catch (error) {
        console.error('Get purchase order error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch purchase order'
        });
    }
};

// Update Purchase Order (only if Draft)
export const updatePurchaseOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { items, expectedDeliveryDate, notes } = req.body;
        const tenantId = req.tenant._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'Invalid purchase order ID'
            });
        }

        const purchaseOrder = await PurchaseOrder.findOne({ _id: id, tenantId }).session(session);

        if (!purchaseOrder) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                error: 'Purchase order not found'
            });
        }

        // Only allow editing in Draft status
        if (purchaseOrder.status !== 'draft') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'Purchase order can only be edited in Draft status'
            });
        }

        // Update basic fields
        if (expectedDeliveryDate !== undefined) {
            purchaseOrder.expectedDeliveryDate = expectedDeliveryDate ? new Date(expectedDeliveryDate) : null;
        }
        if (notes !== undefined) {
            purchaseOrder.notes = notes || null;
        }

        // Update items if provided
        if (items && Array.isArray(items)) {
            // Delete existing items
            await PurchaseOrderItem.deleteMany({ purchaseOrderId: id, tenantId }).session(session);

            // Validate and create new items
            let totalAmount = 0;
            const itemDocuments = [];

            for (const item of items) {
                const { productId, variantSku, quantityOrdered, expectedPrice, notes: itemNotes } = item;

                if (!productId || !variantSku || !quantityOrdered || expectedPrice === undefined) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json({
                        success: false,
                        error: 'Each item must have productId, variantSku, quantityOrdered, and expectedPrice'
                    });
                }

                if (!mongoose.Types.ObjectId.isValid(productId)) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid product ID in items'
                    });
                }

                if (quantityOrdered <= 0 || expectedPrice < 0) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(400).json({
                        success: false,
                        error: 'quantityOrdered must be > 0 and expectedPrice must be >= 0'
                    });
                }

                // Verify product and variant exist
                const product = await Product.findOne({ _id: productId, tenantId }).session(session);
                if (!product) {
                    await session.abortTransaction();
                    session.endSession();
                    return res.status(404).json({
                        success: false,
                        error: `Product not found: ${productId}`
                    });
                }

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
                        error: `Variant not found: ${variantSku}`
                    });
                }

                totalAmount += quantityOrdered * expectedPrice;
                itemDocuments.push({
                    tenantId,
                    purchaseOrderId: id,
                    productId,
                    variantId: variant._id,
                    variantSku: variantSku.toUpperCase(),
                    quantityOrdered,
                    expectedPrice,
                    quantityReceived: 0,
                    notes: itemNotes || null
                });
            }

            purchaseOrder.totalAmount = totalAmount;
            await PurchaseOrderItem.insertMany(itemDocuments, { session });
        } else {
            // Recalculate total if items not updated
            const existingItems = await PurchaseOrderItem.find({ purchaseOrderId: id, tenantId }).session(session);
            purchaseOrder.totalAmount = existingItems.reduce((sum, item) => 
                sum + (item.quantityOrdered * item.expectedPrice), 0
            );
        }

        await purchaseOrder.save({ session });
        await session.commitTransaction();
        session.endSession();

        // Return updated PO
        const updatedPO = await PurchaseOrder.findById(id)
            .populate('supplierId', 'name supplierCode')
            .populate('createdBy', 'profile.firstName profile.lastName email');

        const itemsWithDetails = await PurchaseOrderItem.find({ purchaseOrderId: id })
            .populate('productId', 'name productCode')
            .populate('variantId', 'sku size color');

        res.json({
            success: true,
            data: {
                ...updatedPO.toObject(),
                items: itemsWithDetails
            }
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Update purchase order error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to update purchase order'
        });
    }
};

// Delete Purchase Order (only if Draft)
export const deletePurchaseOrder = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const tenantId = req.tenant._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'Invalid purchase order ID'
            });
        }

        const purchaseOrder = await PurchaseOrder.findOne({ _id: id, tenantId }).session(session);

        if (!purchaseOrder) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                error: 'Purchase order not found'
            });
        }

        // Only allow deletion in Draft status
        if (purchaseOrder.status !== 'draft') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'Purchase order can only be deleted in Draft status'
            });
        }

        // Delete items and receipts (if any)
        await PurchaseOrderItem.deleteMany({ purchaseOrderId: id, tenantId }).session(session);
        await PurchaseOrderReceipt.deleteMany({ purchaseOrderId: id, tenantId }).session(session);
        await PurchaseOrder.deleteOne({ _id: id, tenantId }).session(session);

        await session.commitTransaction();
        session.endSession();

        res.json({
            success: true,
            message: 'Purchase order deleted successfully'
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Delete purchase order error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete purchase order'
        });
    }
};

// Update Purchase Order Status
export const updatePurchaseOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const tenantId = req.tenant._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid purchase order ID'
            });
        }

        if (!status || !['draft', 'sent', 'confirmed', 'received'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Valid status is required (draft, sent, confirmed, received)'
            });
        }

        const purchaseOrder = await PurchaseOrder.findOne({ _id: id, tenantId });

        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                error: 'Purchase order not found'
            });
        }

        // Validate status transition
        const validTransitions = {
            draft: ['sent', 'draft'],
            sent: ['confirmed', 'draft'],
            confirmed: ['received'],
            received: [] // Cannot change from received
        };

        if (!validTransitions[purchaseOrder.status].includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status transition from ${purchaseOrder.status} to ${status}`
            });
        }

        // Cannot manually set to 'received' - it's set automatically when all items are received
        if (status === 'received') {
            return res.status(400).json({
                success: false,
                error: 'Status cannot be manually set to received. It is automatically set when all items are received.'
            });
        }

        const previousStatus = purchaseOrder.status;
        purchaseOrder.status = status;
        await purchaseOrder.save();

        // Emit socket event for status update
        emitPurchaseOrderStatusUpdated(req, {
            purchaseOrderId: id,
            poNumber: purchaseOrder.poNumber,
            previousStatus,
            newStatus: status
        });

        res.json({
            success: true,
            data: purchaseOrder
        });
    } catch (error) {
        console.error('Update purchase order status error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to update purchase order status'
        });
    }
};

// Create Purchase Order Receipt
export const createPurchaseOrderReceipt = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const { items, receiptDate, notes } = req.body;
        const tenantId = req.tenant._id;
        const userId = req.user._id;

        if (!items || !Array.isArray(items) || items.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'items array is required'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'Invalid purchase order ID'
            });
        }

        const purchaseOrder = await PurchaseOrder.findOne({ _id: id, tenantId }).session(session);

        if (!purchaseOrder) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                error: 'Purchase order not found'
            });
        }

        // Cannot create receipt if PO is in draft status
        if (purchaseOrder.status === 'draft') {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'Cannot create receipt for purchase order in Draft status'
            });
        }

        // Generate receipt number
        const receiptNumber = await generateReceiptNumber(tenantId);

        // Validate and process receipt items
        const receiptItems = [];
        const itemsToUpdate = [];

        for (const item of items) {
            const { itemId, quantityReceived, actualPrice } = item;

            if (!itemId || quantityReceived === undefined || actualPrice === undefined) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    success: false,
                    error: 'Each receipt item must have itemId, quantityReceived, and actualPrice'
                });
            }

            if (!mongoose.Types.ObjectId.isValid(itemId)) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    success: false,
                    error: 'Invalid item ID in receipt items'
                });
            }

            if (quantityReceived <= 0 || actualPrice < 0) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    success: false,
                    error: 'quantityReceived must be > 0 and actualPrice must be >= 0'
                });
            }

            // Get PO item
            const poItem = await PurchaseOrderItem.findOne({
                _id: itemId,
                purchaseOrderId: id,
                tenantId
            }).session(session);

            if (!poItem) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({
                    success: false,
                    error: `Purchase order item not found: ${itemId}`
                });
            }

            // Check cumulative quantity
            const newQuantityReceived = poItem.quantityReceived + quantityReceived;
            if (newQuantityReceived > poItem.quantityOrdered) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({
                    success: false,
                    error: `Cannot receive more than ordered. Item ${poItem.variantSku}: ordered ${poItem.quantityOrdered}, already received ${poItem.quantityReceived}, trying to receive ${quantityReceived}`
                });
            }

            receiptItems.push({
                itemId: poItem._id,
                quantityReceived,
                actualPrice
            });

            itemsToUpdate.push({
                poItem,
                quantityReceived,
                variantId: poItem.variantId,
                variantSku: poItem.variantSku,
                productId: poItem.productId
            });
        }

        // Create receipt
        const receipt = await PurchaseOrderReceipt.create([{
            tenantId,
            purchaseOrderId: id,
            receiptNumber,
            receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
            items: receiptItems,
            notes: notes || null,
            createdBy: userId
        }], { session });

        // Update PO items and stock
        let allItemsReceived = true;

        for (const { poItem, quantityReceived, variantId, variantSku, productId } of itemsToUpdate) {
            // Update quantityReceived (cumulative)
            poItem.quantityReceived += quantityReceived;
            await poItem.save({ session });

            // Update variant stock
            const stockUpdate = await updateVariantStock(
                variantId,
                quantityReceived, // Positive quantity increases stock
                tenantId,
                session
            );

            // Create StockMovement record
            await StockMovement.create([{
                tenantId,
                productId,
                variantId,
                variantSku,
                movementType: 'purchase',
                quantity: quantityReceived,
                previousStock: stockUpdate.previousStock,
                newStock: stockUpdate.newStock,
                referenceId: id,
                referenceType: 'PurchaseOrder',
                notes: `Receipt ${receiptNumber}`,
                createdBy: userId
            }], { session });

            // Check if all items are fully received
            if (poItem.quantityReceived < poItem.quantityOrdered) {
                allItemsReceived = false;
            }
        }

        // Update PO status to 'received' if all items are fully received
        let poStatusUpdated = false;
        if (allItemsReceived && purchaseOrder.status !== 'received') {
            purchaseOrder.status = 'received';
            await purchaseOrder.save({ session });
            poStatusUpdated = true;
        }

        await session.commitTransaction();
        session.endSession();

        // Prepare stock updates data for socket event
        const stockUpdates = itemsToUpdate.map(({ variantId, variantSku, productId, quantityReceived, poItem }) => ({
            variantId: variantId.toString(),
            variantSku,
            productId: productId.toString(),
            quantityReceived,
            previousStock: poItem.quantityReceived - quantityReceived,
            newStock: poItem.quantityReceived
        }));

        // Emit socket event for receipt creation
        emitReceiptCreated(req, {
            receiptId: receipt[0]._id.toString(),
            receiptNumber,
            purchaseOrderId: id,
            items: receiptItems,
            stockUpdates
        });

        // Emit PO status update if it was changed to 'received'
        if (poStatusUpdated) {
            emitPurchaseOrderStatusUpdated(req, {
                purchaseOrderId: id,
                poNumber: purchaseOrder.poNumber,
                previousStatus: purchaseOrder.status === 'received' ? 'confirmed' : purchaseOrder.status,
                newStatus: 'received'
            });
        }

        // Return receipt with populated data
        const populatedReceipt = await PurchaseOrderReceipt.findById(receipt[0]._id)
            .populate('purchaseOrderId', 'poNumber status')
            .populate('createdBy', 'profile.firstName profile.lastName email');

        res.status(201).json({
            success: true,
            data: populatedReceipt
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Create purchase order receipt error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to create purchase order receipt'
        });
    }
};

// Get receipts for a Purchase Order
export const getPurchaseOrderReceipts = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid purchase order ID'
            });
        }

        // Verify PO exists
        const purchaseOrder = await PurchaseOrder.findOne({ _id: id, tenantId });
        if (!purchaseOrder) {
            return res.status(404).json({
                success: false,
                error: 'Purchase order not found'
            });
        }

        const receipts = await PurchaseOrderReceipt.find({ purchaseOrderId: id, tenantId })
            .populate('createdBy', 'profile.firstName profile.lastName email')
            .populate('items.itemId', 'variantSku quantityOrdered expectedPrice')
            .sort({ receiptDate: -1 });

        res.json({
            success: true,
            data: receipts
        });
    } catch (error) {
        console.error('Get purchase order receipts error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch purchase order receipts'
        });
    }
};

