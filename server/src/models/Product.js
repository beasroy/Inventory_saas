import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    productCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    basePrice: {
        type: Number,
        default: 0,
        min: 0
    },
    variantPrices: {
        type: Map,
        of: Number,
        default: {}
    }
}, {
    timestamps: true
});

productSchema.index({ tenantId: 1, productCode: 1 }, { unique: true });

export default mongoose.model('Product', productSchema);
