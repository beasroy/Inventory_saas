import mongoose from 'mongoose';

const receiptItemSchema = new mongoose.Schema({
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PurchaseOrderItem',
        required: true
    },
    quantityReceived: {
        type: Number,
        required: true,
        min: 1
    },
    actualPrice: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false });

const purchaseOrderReceiptSchema = new mongoose.Schema({
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
    receiptNumber: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    receiptDate: {
        type: Date,
        default: Date.now
    },
    items: {
        type: [receiptItemSchema],
        required: true,
        validate: {
            validator: function(items) {
                return items && items.length > 0;
            },
            message: 'At least one receipt item is required'
        }
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

// Unique constraint: receiptNumber per tenant
purchaseOrderReceiptSchema.index({ tenantId: 1, receiptNumber: 1 }, { unique: true });
purchaseOrderReceiptSchema.index({ tenantId: 1, purchaseOrderId: 1 });

const PurchaseOrderReceipt = mongoose.model('PurchaseOrderReceipt', purchaseOrderReceiptSchema);

export default PurchaseOrderReceipt;

