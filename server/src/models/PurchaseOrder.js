import mongoose from 'mongoose';

const purchaseOrderSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    poNumber: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    supplierId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier',
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['draft', 'sent', 'confirmed', 'received'],
        default: 'draft',
        index: true
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    expectedDeliveryDate: {
        type: Date,
        default: null
    },
    notes: {
        type: String,
        trim: true,
        default: null
    },
    totalAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Unique constraint: poNumber per tenant
purchaseOrderSchema.index({ tenantId: 1, poNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ tenantId: 1, supplierId: 1 });
purchaseOrderSchema.index({ tenantId: 1, status: 1 });

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

export default PurchaseOrder;

