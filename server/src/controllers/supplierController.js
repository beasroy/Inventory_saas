import Supplier from '../models/Supplier.js';
import Product from '../models/Product.js';
import mongoose from 'mongoose';

// Create supplier
export const createSupplier = async (req, res) => {
    try {
        const { supplierCode, name, contactEmail, contactPhone, address, notes } = req.body;
        const tenantId = req.tenant._id;

        // Validate required fields
        if (!supplierCode || !name) {
            return res.status(400).json({
                success: false,
                error: 'supplierCode and name are required'
            });
        }

        // Check if supplier code already exists
        const existingSupplier = await Supplier.findOne({
            tenantId,
            supplierCode: supplierCode.toUpperCase()
        });

        if (existingSupplier) {
            return res.status(409).json({
                success: false,
                error: 'Supplier code already exists for this tenant'
            });
        }

        // Create supplier
        const supplier = await Supplier.create({
            tenantId,
            supplierCode: supplierCode.toUpperCase(),
            name,
            contactEmail: contactEmail?.toLowerCase() || null,
            contactPhone: contactPhone || null,
            address: address || null,
            notes: notes || null,
            status: 'active',
            pricing: {}
        });

        res.status(201).json({
            success: true,
            data: supplier
        });
    } catch (error) {
        console.error('Create supplier error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to create supplier'
        });
    }
};

// Get all suppliers
export const getSuppliers = async (req, res) => {
    try {
        const tenantId = req.tenant._id;
        const { page = 1, limit = 20, status, search } = req.query;

        const query = { tenantId };

        // Filter by status
        if (status && ['active', 'inactive'].includes(status)) {
            query.status = status;
        }

        // Search by name or supplierCode
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { supplierCode: { $regex: search.toUpperCase(), $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const suppliers = await Supplier.find(query)
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await Supplier.countDocuments(query);

        res.json({
            success: true,
            data: suppliers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get suppliers error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch suppliers'
        });
    }
};

// Get supplier by ID
export const getSupplierById = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid supplier ID'
            });
        }

        const supplier = await Supplier.findOne({ _id: id, tenantId });

        if (!supplier) {
            return res.status(404).json({
                success: false,
                error: 'Supplier not found'
            });
        }

        res.json({
            success: true,
            data: supplier
        });
    } catch (error) {
        console.error('Get supplier error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch supplier'
        });
    }
};

// Update supplier
export const updateSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, contactEmail, contactPhone, address, status, notes } = req.body;
        const tenantId = req.tenant._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid supplier ID'
            });
        }

        const supplier = await Supplier.findOne({ _id: id, tenantId });

        if (!supplier) {
            return res.status(404).json({
                success: false,
                error: 'Supplier not found'
            });
        }

        // Update fields
        if (name !== undefined) supplier.name = name;
        if (contactEmail !== undefined) supplier.contactEmail = contactEmail?.toLowerCase() || null;
        if (contactPhone !== undefined) supplier.contactPhone = contactPhone || null;
        if (address !== undefined) supplier.address = address || null;
        if (status !== undefined && ['active', 'inactive'].includes(status)) supplier.status = status;
        if (notes !== undefined) supplier.notes = notes || null;

        await supplier.save();

        res.json({
            success: true,
            data: supplier
        });
    } catch (error) {
        console.error('Update supplier error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to update supplier'
        });
    }
};

// Delete supplier
export const deleteSupplier = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid supplier ID'
            });
        }

        const supplier = await Supplier.findOne({ _id: id, tenantId });

        if (!supplier) {
            return res.status(404).json({
                success: false,
                error: 'Supplier not found'
            });
        }
        await Supplier.deleteOne({ _id: id, tenantId });

        res.json({
            success: true,
            message: 'Supplier deleted successfully'
        });
    } catch (error) {
        console.error('Delete supplier error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete supplier'
        });
    }
};

// Add/update product pricing
export const addProductPricing = async (req, res) => {
    try {
        const { id } = req.params;
        const { productId, price } = req.body;
        const tenantId = req.tenant._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid supplier ID'
            });
        }

        if (!productId || price === undefined) {
            return res.status(400).json({
                success: false,
                error: 'productId and price are required'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid product ID'
            });
        }

        if (price < 0) {
            return res.status(400).json({
                success: false,
                error: 'Price must be >= 0'
            });
        }

        const supplier = await Supplier.findOne({ _id: id, tenantId });

        if (!supplier) {
            return res.status(404).json({
                success: false,
                error: 'Supplier not found'
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

        // Add/update pricing
        supplier.pricing.set(productId.toString(), price);
        await supplier.save();

        res.json({
            success: true,
            data: supplier
        });
    } catch (error) {
        console.error('Add product pricing error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to add product pricing'
        });
    }
};

// Remove product pricing
export const removeProductPricing = async (req, res) => {
    try {
        const { id, productId } = req.params;
        const tenantId = req.tenant._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid supplier ID'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid product ID'
            });
        }

        const supplier = await Supplier.findOne({ _id: id, tenantId });

        if (!supplier) {
            return res.status(404).json({
                success: false,
                error: 'Supplier not found'
            });
        }

        // Remove pricing
        supplier.pricing.delete(productId);
        await supplier.save();

        res.json({
            success: true,
            data: supplier
        });
    } catch (error) {
        console.error('Remove product pricing error:', error);
        res.status(400).json({
            success: false,
            error: error.message || 'Failed to remove product pricing'
        });
    }
};

// Get supplier's products with prices
export const getSupplierProducts = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.tenant._id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid supplier ID'
            });
        }

        const supplier = await Supplier.findOne({ _id: id, tenantId });

        if (!supplier) {
            return res.status(404).json({
                success: false,
                error: 'Supplier not found'
            });
        }

        // Get all products with pricing
        const productIds = Array.from(supplier.pricing.keys());
        
        if (productIds.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        const products = await Product.find({
            _id: { $in: productIds },
            tenantId
        });

        // Map products with prices
        const productsWithPrices = products.map(product => ({
            productId: product._id,
            productCode: product.productCode,
            name: product.name,
            price: supplier.pricing.get(product._id.toString()) || null
        }));

        res.json({
            success: true,
            data: productsWithPrices
        });
    } catch (error) {
        console.error('Get supplier products error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch supplier products'
        });
    }
};

