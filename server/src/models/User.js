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
            'view_products', 'edit_products',
            'view_orders', 'create_orders',
            'view_inventory', 'adjust_inventory',
            'view_users', 'invite_users'
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