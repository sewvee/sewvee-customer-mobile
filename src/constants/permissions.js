/**
 * Module identifiers for permission checks
 */
export const MODULES = {
    DASHBOARD: 'Dashboard',
    CLIENTS: 'Customers',
    ORDERS: 'Orders',
    PAYMENTS: 'Payments',
    INSIGHTS: 'Insights',
    OUTFITS: 'Outfits',
    TEAM_MANAGEMENT: 'Team Management',
    PAYROLL: 'Payroll',
};

/**
 * Action types per module
 */
export const ACTIONS = {
    CREATE: 'create',
    EDIT: 'edit',
    VIEW: 'view',
    DELETE: 'delete',
};

/**
 * Permission matrix from spec (Section 3.5)
 * Format: { [module]: { create, edit, view, delete, viewScope?: 'self' | 'all' } }
 * viewScope: 'self' = view own data only, 'all' = view all data (default)
 */
const createPerms = (create, edit, view, del, viewScope = 'all') => ({
    create,
    edit,
    view,
    delete: del,
    viewScope,
});

const fullAccess = () => createPerms(true, true, true, true);

export const DEFAULT_ROLE_PERMISSIONS = {
    Owner: {
        Dashboard: fullAccess(),
        Clients: fullAccess(),
        Orders: fullAccess(),
        Payments: fullAccess(),
        Insights: fullAccess(),
        Outfits: fullAccess(),
        'Team Management': fullAccess(),
        Payroll: fullAccess(),
    },
    Admin: {
        Dashboard: createPerms(false, false, true, false),
        Clients: createPerms(true, true, true, false),
        Orders: createPerms(true, true, true, true),
        Payments: createPerms(false, false, true, false),
        Insights: createPerms(false, false, true, false),
        Outfits: createPerms(true, true, true, true),
        'Team Management': createPerms(true, true, true, false),
        Payroll: createPerms(false, true, true, false),
    },
    Manager: {
        Dashboard: createPerms(false, false, true, false),
        Clients: createPerms(true, true, true, false),
        Orders: createPerms(true, true, true, true),
        Payments: createPerms(false, false, true, false),
        Insights: createPerms(false, false, true, false),
        Outfits: createPerms(true, true, true, true),
        'Team Management': createPerms(true, true, true, false),
        Payroll: createPerms(false, true, true, false),
    },
    Receptionist: {
        Dashboard: createPerms(false, false, true, false),
        Clients: createPerms(true, true, true, false),
        Orders: createPerms(true, true, true, true),
        Payments: createPerms(false, false, true, false),
        Insights: createPerms(false, false, true, false),
        Outfits: createPerms(true, true, true, false),
        'Team Management': createPerms(false, false, true, false, 'self'),
        Payroll: createPerms(false, false, true, false, 'self'),
    },
    Tailor: {
        Dashboard: createPerms(false, false, true, false),
        Clients: createPerms(false, false, true, false),
        Orders: createPerms(true, true, true, true),
        Payments: createPerms(false, false, true, false),
        Insights: createPerms(false, false, true, false),
        Outfits: createPerms(true, true, true, true),
        'Team Management': createPerms(false, false, true, false, 'self'),
        Payroll: createPerms(false, false, true, false, 'self'),
    },
};
