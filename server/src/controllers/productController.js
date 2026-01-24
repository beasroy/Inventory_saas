import Product from '../models/Product.js';
import Variant from '../models/Variant.js';
import StockMovement from '../models/StockMovement.js';
import mongoose from 'mongoose';


const generateSku = (productCode, size, color) => {
    const sizeCode = size.toUpperCase().replaceAll(' ', '-');
    const colorCode = color.toUpperCase().replaceAll(' ', '-');
    return `${productCode.toUpperCase()}-${sizeCode}-${colorCode}`;
};


export const createProduct = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { name, description, productCode, basePrice, variants } = req.body;
        const tenantId = req.tenant._id;

        // Validate required fields
        if (!name || !description || !productCode) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'Name, description, and productCode are required'
            });
        }

       
        const existingProduct = await Product.findOne({ tenantId, productCode: productCode.toUpperCase() }).session(session);
        if (existingProduct) {
            await session.abortTransaction();
            session.endSession();
            return res.status(409).json({
                success: false,
                error: 'Product code already exists for this tenant'
            });
        }


        if (!variants || !Array.isArray(variants) || variants.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'At least one variant is required'
            });
        }

     
        const combinations = new Set();
        const processedVariants = variants.map(variant => {
            const { size, color, stock = 0, reservedStock = 0 } = variant;
            
            if (!size || !color) {
                throw new Error('Size and color are required for each variant');
            }

            const key = `${size}-${color}`.toLowerCase();
            if (combinations.has(key)) {
                throw new Error(`Duplicate variant combination: ${size} × ${color}`);
            }
            combinations.add(key);

            const sku = generateSku(productCode, size, color);
            
            return {
                size: size.trim(),
                color: color.trim(),
                sku,
                stock: Math.max(0, stock),
                reservedStock: Math.max(0, reservedStock)
            };
        });

        // Create product
        const product = await Product.create({
            name: name.trim(),
            description: description.trim(),
            productCode: productCode.toUpperCase(),
            basePrice: basePrice || 0,
            tenantId
        }, { session });

        // Create variants
        const variantDocuments = processedVariants.map(v => ({
            tenantId,
            productId: product._id,
            sku: v.sku,
            size: v.size,
            color: v.color,
            stock: v.stock,
            reservedStock: v.reservedStock
        }));

        const createdVariants = await Variant.create(variantDocuments, { session });

        await session.commitTransaction();
        session.endSession();

        // Populate product with variants for response
        const productWithVariants = {
            ...product.toObject(),
            variants: createdVariants
        };

        res.status(201).json({
            success: true,
            data: productWithVariants
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Create product error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to create product'
        });
    }
};


export const getProducts = async (req, res) => {
    try {
        const tenantId = req.tenant._id;
        const { page = 1, limit = 10, search } = req.query;

        const query = { tenantId };

        // Search by name or productCode
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { productCode: { $regex: search.toUpperCase(), $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Ensure tenantId is ObjectId for comparison
        const tenantObjectId = mongoose.Types.ObjectId.isValid(tenantId) 
            ? (tenantId instanceof mongoose.Types.ObjectId ? tenantId : new mongoose.Types.ObjectId(tenantId))
            : tenantId;
        
        // Build aggregation pipeline
        const pipeline = [
            // Match products based on query
            { $match: query },
            // Sort by creation date (newest first)
            { $sort: { createdAt: -1 } },
            // Lookup variants for each product
            {
                $lookup: {
                    from: 'variants',
                    let: { productId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$productId', '$$productId'] },
                                        { $eq: ['$tenantId', tenantObjectId] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'variants'
                }
            },
            // Skip and limit for pagination
            { $skip: skip },
            { $limit: parseInt(limit) }
        ];

        // Execute aggregation to get products with variants
        const productsWithVariants = await Product.aggregate(pipeline);

        // Get total count for pagination
        const total = await Product.countDocuments(query);

        res.json({
            success: true,
            data: productsWithVariants,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch products'
        });
    }
};


export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid product ID'
            });
        }

        const product = await Product.findOne({ _id: id, tenantId });

        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        // Get variants for this product
        const variants = await Variant.find({ productId: id, tenantId });

        const productWithVariants = {
            ...product.toObject(),
            variants
        };

        res.json({
            success: true,
            data: productWithVariants
        });
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch product'
        });
    }
};

// Update product and variants
export const updateProduct = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const tenantId = req.tenant._id;
        const { name, description, basePrice, variantPrices, variants } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({
                success: false,
                error: 'Invalid product ID'
            });
        }

        const product = await Product.findOne({ _id: id, tenantId }).session(session);

        if (!product) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        // Update product fields
        if (name !== undefined) product.name = name.trim();
        if (description !== undefined) product.description = description.trim();
        if (basePrice !== undefined) product.basePrice = Math.max(0, basePrice);
        if (variantPrices !== undefined) {
            // Convert variantPrices object to Map
            const pricesMap = new Map();
            Object.entries(variantPrices).forEach(([sku, price]) => {
                pricesMap.set(sku.toUpperCase(), Math.max(0, price));
            });
            product.variantPrices = pricesMap;
        }

        await product.save({ session });

        // Handle variants if provided
        let updatedVariants = [];
        if (variants && Array.isArray(variants)) {
            // Get existing variants
            const existingVariants = await Variant.find({ productId: id, tenantId }).session(session);
            const existingVariantsMap = new Map();
            existingVariants.forEach(v => existingVariantsMap.set(v._id.toString(), v));

            // Validate variants and separate updates from creates
            // Track combinations from existing variants (excluding ones being updated)
            const combinations = new Set();
            const updatingVariantIds = new Set();
            
            // First pass: collect IDs of variants being updated
            variants.forEach(v => {
                if (v._id && mongoose.Types.ObjectId.isValid(v._id)) {
                    updatingVariantIds.add(v._id.toString());
                }
            });
            
            // Add existing variant combinations to Set (excluding ones being updated)
            existingVariants.forEach(v => {
                if (!updatingVariantIds.has(v._id.toString())) {
                    const key = `${v.size}-${v.color}`.toLowerCase();
                    combinations.add(key);
                }
            });

            const variantsToUpdate = [];
            const variantsToCreate = [];

            for (const variant of variants) {
                const { _id, size, color, stock, reservedStock } = variant;

                // Validate required fields
                if (!size || !color) {
                    throw new Error('Size and color are required for each variant');
                }

                // Check for duplicate size×color combinations using Set
                const key = `${size}-${color}`.toLowerCase();
                if (combinations.has(key)) {
                    throw new Error(`Duplicate variant combination: ${size} × ${color}`);
                }
                combinations.add(key); // Add to Set to track for next iteration

                const sku = generateSku(product.productCode, size, color);

                if (_id && mongoose.Types.ObjectId.isValid(_id)) {
                    // Update existing variant
                    const existingVariant = existingVariantsMap.get(_id.toString());
                    if (!existingVariant) {
                        throw new Error(`Variant with ID ${_id} not found`);
                    }

                    variantsToUpdate.push({
                        _id,
                        size: size.trim(),
                        color: color.trim(),
                        sku,
                        stock: stock !== undefined ? Math.max(0, stock) : existingVariant.stock,
                        reservedStock: reservedStock !== undefined ? Math.max(0, reservedStock) : existingVariant.reservedStock
                    });
                } else {
                    // Create new variant
                    variantsToCreate.push({
                        tenantId,
                        productId: id,
                        size: size.trim(),
                        color: color.trim(),
                        sku,
                        stock: Math.max(0, stock || 0),
                        reservedStock: Math.max(0, reservedStock || 0)
                    });
                }
            }

            // Update existing variants
            for (const variantData of variantsToUpdate) {
                const { _id, ...updateData } = variantData;
                const updated = await Variant.findOneAndUpdate(
                    { _id, productId: id, tenantId },
                    { $set: updateData },
                    { new: true, session }
                );
                if (updated) updatedVariants.push(updated);
            }

            // Create new variants
            if (variantsToCreate.length > 0) {
                const created = await Variant.create(variantsToCreate, { session });
                updatedVariants.push(...created);
            }

            // Get all variants for response (including ones not updated)
            const allVariants = await Variant.find({ productId: id, tenantId }).session(session);
            updatedVariants = allVariants;
        } else {
            // If variants not provided, get existing variants
            updatedVariants = await Variant.find({ productId: id, tenantId }).session(session);
        }

        await session.commitTransaction();
        session.endSession();

        const productWithVariants = {
            ...product.toObject(),
            variants: updatedVariants
        };

        res.json({
            success: true,
            data: productWithVariants
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Update product error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to update product'
        });
    }
};


export const deleteProduct = async (req, res) => {
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
                error: 'Invalid product ID'
            });
        }

        const product = await Product.findOne({ _id: id, tenantId }).session(session);

        if (!product) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        // Check if product has any stock movements
        const hasMovements = await StockMovement.findOne({ productId: id, tenantId }).session(session);
        if (hasMovements) {
            await session.abortTransaction();
            session.endSession();
            return res.status(409).json({
                success: false,
                error: 'Cannot delete product with stock movement history'
            });
        }

        // Delete variants first
        await Variant.deleteMany({ productId: id, tenantId }).session(session);
        
        // Delete product
        await Product.deleteOne({ _id: id, tenantId }).session(session);

        await session.commitTransaction();
        session.endSession();

        res.json({
            success: true,
            message: 'Product deleted successfully'
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Delete product error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete product'
        });
    }
};


export const getProductVariants = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid product ID'
            });
        }

        const product = await Product.findOne({ _id: id, tenantId }).select('name productCode');

        if (!product) {
            return res.status(404).json({
                success: false,
                error: 'Product not found'
            });
        }

        // Get variants from Variant collection
        const variants = await Variant.find({ productId: id, tenantId }).sort({ size: 1, color: 1 });

        res.json({
            success: true,
            data: {
                productId: product._id,
                productName: product.name,
                productCode: product.productCode,
                variants
            }
        });
    } catch (error) {
        console.error('Get variants error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch variants'
        });
    }
};



// Reserve stock atomically (for pending orders)
export const reserveStock = async (variantId, quantity, tenantId) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Find variant and check available stock
        const variant = await Variant.findOne({
            _id: variantId,
            tenantId
        }).session(session);

        if (!variant) {
            throw new Error('Variant not found');
        }

        const availableStock = variant.availableStock;
        if (availableStock < quantity) {
            throw new Error(`Insufficient stock. Available: ${availableStock}, Requested: ${quantity}`);
        }

        // Atomically reserve stock
        const result = await Variant.findOneAndUpdate(
            {
                _id: variantId,
                tenantId,
                $expr: {
                    $gte: [
                        { $subtract: ['$stock', '$reservedStock'] },
                        quantity
                    ]
                }
            },
            {
                $inc: { reservedStock: quantity },
                $set: { updatedAt: new Date() }
            },
            { new: true, session }
        );

        if (!result) {
            throw new Error('Failed to reserve stock - insufficient available stock');
        }

        await session.commitTransaction();
        session.endSession();

        return {
            success: true,
            variant: result
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

// Release reserved stock (on cancellation)
export const releaseStock = async (variantId, quantity, tenantId) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const result = await Variant.findOneAndUpdate(
            {
                _id: variantId,
                tenantId,
                reservedStock: { $gte: quantity }
            },
            {
                $inc: { reservedStock: -quantity },
                $set: { updatedAt: new Date() }
            },
            { new: true, session }
        );

        if (!result) {
            throw new Error('Failed to release stock - insufficient reserved stock');
        }

        await session.commitTransaction();
        session.endSession();

        return {
            success: true,
            variant: result
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};

// Fulfill stock (convert reserved to fulfilled on order completion)
export const fulfillStock = async (variantId, quantity, tenantId) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const result = await Variant.findOneAndUpdate(
            {
                _id: variantId,
                tenantId,
                reservedStock: { $gte: quantity }
            },
            {
                $inc: {
                    stock: -quantity,
                    reservedStock: -quantity
                },
                $set: { updatedAt: new Date() }
            },
            { new: true, session }
        );

        if (!result) {
            throw new Error('Failed to fulfill stock - insufficient reserved stock');
        }

        await session.commitTransaction();
        session.endSession();

        return {
            success: true,
            variant: result
        };
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
};
