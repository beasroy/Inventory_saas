import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
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
    sku: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    size: {
        type: String,
        required: true,
        trim: true
    },
    color: {
        type: String,
        required: true,
        trim: true
    },
    stock: {
        type: Number,
        default: 0,
        min: 0
    },
    reservedStock: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});


variantSchema.virtual('availableStock').get(function() {
    return Math.max(0, this.stock - this.reservedStock);
});


variantSchema.set('toJSON', { virtuals: true });
variantSchema.set('toObject', { virtuals: true });


variantSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
variantSchema.index({ tenantId: 1, productId: 1 });
variantSchema.index({ tenantId: 1, productId: 1, size: 1, color: 1 }, { unique: true });


variantSchema.pre('save', async function() {
    if (this.stock < 0) {
        throw new Error('Stock cannot be negative');
    }
    if (this.reservedStock < 0) {
        throw new Error('Reserved stock cannot be negative');
    }
    if (this.reservedStock > this.stock) {
        throw new Error('Reserved stock cannot exceed total stock');
    }
});

const Variant = mongoose.model('Variant', variantSchema);

export default Variant;

