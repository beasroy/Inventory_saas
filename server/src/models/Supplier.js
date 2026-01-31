import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },
    supplierCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    contactEmail: {
        type: String,
        trim: true,
        lowercase: true,
        default: null
    },
    contactPhone: {
        type: String,
        trim: true,
        default: null
    },
    address: {
        type: String,
        trim: true,
        default: null
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    pricing: {
        type: Map,
        of: Number,
        default: {}
    },
    notes: {
        type: String,
        trim: true,
        default: null
    }
}, {
    timestamps: true
});

// Unique constraint: supplierCode per tenant
supplierSchema.index({ tenantId: 1, supplierCode: 1 }, { unique: true });
supplierSchema.index({ tenantId: 1 });

// Validate email format if provided
supplierSchema.pre('save', function(next) {
    if (this.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.contactEmail)) {
        return next(new Error('Invalid email format'));
    }
    next();
});

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;

