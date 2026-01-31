import mongoose from 'mongoose';

const purchaseOrderItemSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    purchaseOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrder',
        required: true,
        index: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
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
        uppercase: true
    },
    quantityOrdered: {
        type: Number,
        required: true,
        min: 1
    },
    expectedPrice: {
        type: Number,
        required: true,
        min: 0
    },
    quantityReceived: {
        type: Number,
        default: 0,
        min: 0
    },
    notes: {
        type: String,
        trim: true,
        default: null
    }
}, {
    timestamps: true
});

// Indexes
purchaseOrderItemSchema.index({ tenantId: 1, purchaseOrderId: 1 });
purchaseOrderItemSchema.index({ tenantId: 1, variantId: 1 });

// Validation: quantityReceived cannot exceed quantityOrdered
purchaseOrderItemSchema.pre('save', async function() {
    if (this.quantityReceived > this.quantityOrdered) {
        throw new Error('Quantity received cannot exceed quantity ordered');
    }
});

const PurchaseOrderItem = mongoose.model('PurchaseOrderItem', purchaseOrderItemSchema);

export default PurchaseOrderItem;

