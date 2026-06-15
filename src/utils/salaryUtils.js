/**
 * Utility functions for salary display and calculations
 */

/**
 * Returns the unit suffix for salary type display (e.g. /daily, /week, /mo)
 * @param {string} salaryType - Daily, Weekly, or Monthly
 * @returns {string}
 */
export const getSalaryUnitSuffix = (salaryType) => {
    if (!salaryType || salaryType === 'Monthly') return '/mo';
    if (salaryType === 'Daily') return '/daily';
    if (salaryType === 'Weekly') return '/week';
    return '/mo';
};
