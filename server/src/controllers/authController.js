import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const getPermissionsForRole = (role) => {
    const permissions = {
        owner: ['view_products', 'edit_products', 'view_orders', 'create_orders',
            'view_inventory', 'adjust_inventory', 'view_users', 'invite_users'],
        manager: ['view_products', 'edit_products', 'view_orders', 'create_orders',
            'view_inventory', 'adjust_inventory'],
        staff: ['view_products', 'view_orders', 'create_orders', 'view_inventory']
    };
    return permissions[role] || [];
};

const setTokenCookie = (res, token) => {
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
    });
};

const clearTokenCookie = (res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/'
    });
};

export const register = async (req, res) => {
    try {
        const { email, password, tenantName, firstName, lastName } = req.body;

        if (!email || !password || !tenantName) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and tenant name are required'
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // Hash the password before storing
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const tenant = await Tenant.create({
            name: tenantName,
        });

        const user = await User.create({
            email,
            password: hashedPassword,
            tenantId: tenant._id,
            role: 'owner',
            permissions: getPermissionsForRole('owner'),
            profile: {
                firstName: firstName || '',
                lastName: lastName || ''
            },
            status: 'active'
        });

        const userResponse = {
            id: user._id,
            email: user.email,
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            role: user.role,
            permissions: user.permissions,
            status: user.status
        };
        const tenantResponse = {
            id: tenant._id,
            name: tenant.name,
            slug: tenant.slug,
            status: tenant.status
        };

        res.status(201).json({
            success: true,
            data: {
                user: userResponse,
                tenant: tenantResponse
            },
            message: 'Registration successful. Please login to continue.'
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Registration failed'
        });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                error: 'Invalid  password'
            });
        }

        // Block suspended users, but allow active and invited users
        if (user.status === 'suspended') {
            return res.status(403).json({
                success: false,
                error: 'Account has been suspended'
            });
        }

        const tenant = await Tenant.findById(user.tenantId);
        if (!tenant || tenant.status !== 'active') {
            return res.status(403).json({
                success: false,
                error: 'Workspace is not active'
            });
        }

        user.lastLogin = new Date();
        user.loginCount += 1;
        await user.save();

        const token = jwt.sign(
            {
                userId: user._id,
                tenantId: user.tenantId,
                role: user.role,
                email: user.email
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        setTokenCookie(res, token);

        const response = {
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.profile.firstName,
                    lastName: user.profile.lastName,
                    role: user.role,
                    permissions: user.permissions
                },
                tenant: {
                    id: tenant._id,
                    name: tenant.name,
                    slug: tenant.slug
                }
            },
            message: 'Login successful'
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Login failed' });
    }
};

export const logout = async (req, res) => {
    try {
        clearTokenCookie(res);
        res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ success: false, error: 'Logout failed' });
    }
};

export const acceptInvite = async (req, res) => {
    try {
      
        const { email, password, firstName, lastName , slug, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        if (!slug) {
            return res.status(400).json({
                success: false,
                error: 'Slug is required in the invite link'
            });
        }

        if (!role) {
            return res.status(400).json({
                success: false,
                error: 'Role is required in the invite link'
            });
        }

        if (!['owner', 'manager', 'staff'].includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role'
            });
        }

        let tenant;
        if (slug) {
            tenant = await Tenant.findOne({ slug });
        } 

        if (!tenant) {
            return res.status(404).json({
                success: false,
                error: 'Workspace not found'
            });
        }

        if (tenant.status !== 'active') {
            return res.status(403).json({
                success: false,
                error: 'Workspace is not active'
            });
        }

        const existingUser = await User.findOne({ 
            email: email.toLowerCase(),
            tenantId: tenant._id 
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User already exists in this workspace'
            });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const user = await User.create({
            email: email.toLowerCase(),
            password: hashedPassword,
            tenantId: tenant._id,
            role: role,
            permissions: getPermissionsForRole(role),
            profile: {
                firstName: firstName || '',
                lastName: lastName || ''
            },
            status: 'invited'
        });

        const userResponse = {
            id: user._id,
            email: user.email,
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
            role: user.role,
            permissions: user.permissions,
            status: user.status
        };

        const tenantResponse = {
            id: tenant._id,
            name: tenant.name,
            slug: tenant.slug,
            status: tenant.status
        };

        res.status(201).json({
            success: true,
            data: {
                user: userResponse,
                tenant: tenantResponse
            },
            message: 'Invite accepted successfully. Please login to continue.'
        });
    } catch (error) {
        console.error('Invite acceptance error:', error);
        res.status(500).json({
            success: false,
            error: 'Invite acceptance failed'
        });
    }
};

export const getCurrentUser = async (req, res) => {
    try {
        const user = req.user;
        const tenant = req.tenant;

        if (!user || !tenant) {
            clearTokenCookie(res);
            return res.status(401).json({
                success: false,
                error: 'Session expired'
            });
        }

        const response = {
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.profile.firstName,
                    lastName: user.profile.lastName,
                    role: user.role,
                    permissions: user.permissions,
                    lastLogin: user.lastLogin,
                    loginCount: user.loginCount
                },
                tenant: {
                    id: tenant._id,
                    name: tenant.name,
                    slug: tenant.slug
                }
            }
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ success: false, error: 'Failed to get current user' });
    }
};