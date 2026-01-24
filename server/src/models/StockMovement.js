import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    variantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Variant',
        required: true,
        index: true
    },
    variantSku: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        index: true
    },
    movementType: {
        type: String,
        enum: ['purchase', 'sale', 'return', 'adjustment'],
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    previousStock: {
        type: Number,
        required: true
    },
    newStock: {
        type: Number,
        required: true
    },
    referenceId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'referenceType'
    },
    referenceType: {
        type: String,
        enum: ['Order', 'PurchaseOrder', null]
    },
    notes: {
        type: String,
        trim: true,
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Compound indexes for efficient querying
stockMovementSchema.index({ tenantId: 1, productId: 1, createdAt: -1 });
stockMovementSchema.index({ tenantId: 1, variantId: 1, createdAt: -1 });
stockMovementSchema.index({ tenantId: 1, variantSku: 1, createdAt: -1 });
stockMovementSchema.index({ tenantId: 1, movementType: 1, createdAt: -1 });

const StockMovement = mongoose.model('StockMovement', stockMovementSchema);

export default StockMovement;

