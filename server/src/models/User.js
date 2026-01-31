import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true 
    },

    password: {
        type: String, 
        required: function () {
            return this.status === 'active' || this.status === 'invited';
        }, 
        minlength: 8, 
        select: false
    },

    status: { 
        type: String, 
        enum: ['active', 'invited', 'suspended'], 
        default: 'invited' 
    },

    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
        index: true
    },

    role: { 
        type: String, 
        enum: ['owner', 'manager', 'staff'], 
        default: 'staff', 
        required: true 
    },

    permissions: [{
        type: String,
        enum: [
            'view_products', 'create_products', 'edit_products', 'delete_products',
            'view_orders', 'create_orders',
            'view_inventory', 'adjust_inventory',
            'view_users', 'invite_users',
            'view_suppliers', 'create_suppliers', 'edit_suppliers', 'delete_suppliers',
            'view_purchase_orders', 'create_purchase_orders', 'edit_purchase_orders', 'delete_purchase_orders'
        ]
    }],

    profile: {
        firstName: String,
        lastName: String,
        phone: String,
    },
    
    lastLogin: Date,
    
    loginCount: {
        type: Number,
        default: 0
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }

}, {
    timestamps: true 
});

userSchema.virtual('fullName').get(function() {
    return `${this.profile.firstName || ''} ${this.profile.lastName || ''}`.trim();
});

userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

export default mongoose.model('User', userSchema);