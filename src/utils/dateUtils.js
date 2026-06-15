/**
 * Utility functions for date formatting and manipulation
 */

/**
 * Formats a date string or Date object to DD/MM/YYYY
 * @param date String or Date object
 * @returns Formatted date string (e.g., 25/12/2025)
 */
export const formatDate = (date) => {
    if (!date) return '';

    let d = null;

    if (typeof date === 'string') {
        // Strict DD/MM/YYYY parsing
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(date)) {
            const parts = date.split('/').map(Number);
            let [p1, p2, year] = parts;

            // Detect MM/DD/YYYY
            if (p1 <= 12 && p2 > 12) {
                // MM/DD/YYYY → convert to correct Date
                d = new Date(year, p1 - 1, p2);
            } else {
                // Assume DD/MM/YYYY
                d = new Date(year, p2 - 1, p1);
            }
        } else {
            // Handle ISO or other formats
            d = new Date(date);
        }
    } else {
        // Handle Firestore Timestamp with toDate()
        if (date && typeof date.toDate === 'function') {
            d = date.toDate();
        } else {
            d = date;
        }
    }

    // Invalid date check
    if (!d || isNaN(d.getTime())) {
        return typeof date === 'string' ? date : '';
    }

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
};

/**
 * Formats a date with time when available. For ISO strings returns DD/MM/YYYY HH:MM (12-hour).
 * For YYYY-MM-DD only (legacy), returns DD/MM/YYYY.
 * @param date String (YYYY-MM-DD, ISO), Date object, or Firestore Timestamp
 * @returns Formatted string (e.g. 01/03/2026 11:54 PM)
 */
export const formatDateWithTime = (date) => {
    if (!date) return '';

    let d = null;
    if (typeof date === 'string') {
        if (date.includes('T')) {
            d = new Date(date);
        } else if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
            const [y, m, day] = date.split('-').map(Number);
            d = new Date(y, (m || 1) - 1, day || 1);
        } else {
            d = parseDate(date);
        }
    } else if (date && typeof date.toDate === 'function') {
        d = date.toDate();
    } else {
        d = date instanceof Date ? date : parseDate(date);
    }

    if (!d || isNaN(d.getTime())) return '';

    const base = formatDate(d);
    if (typeof date === 'string' && date.includes('T')) {
        const timeStr = d.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
        return `${base} ${timeStr}`;
    }
    return base;
};

/**
 * Formats a date with day of week, e.g. 02/03/2026 (Wed)
 * @param date String (YYYY-MM-DD or ISO), Date object, or Firestore Timestamp
 * @returns Formatted string
 */
export const formatDateWithDay = (date) => {
    if (!date) return '';

    let d = null;
    if (typeof date === 'string') {
        if (/^\d{4}-\d{2}-\d{2}/.test(date)) {
            const [y, m, day] = date.split('-').map(Number);
            d = new Date(y, (m || 1) - 1, day || 1);
        } else {
            d = parseDate(date);
        }
    } else if (date && typeof date.toDate === 'function') {
        d = date.toDate();
    } else {
        d = date instanceof Date ? date : parseDate(date);
    }

    if (!d || isNaN(d.getTime())) return '';

    const base = formatDate(d);
    const dayName = d.toLocaleDateString('en', { weekday: 'short' });
    return `${base} (${dayName})`;
};

/**
 * Safely parses a date string (DD/MM/YYYY or ISO) or Firestore Timestamp into a Date object
 */
export const parseDate = (dateVal) => {
    if (!dateVal) return new Date();

    // Firestore Timestamp
    if (dateVal && typeof dateVal.toDate === 'function') {
        return dateVal.toDate();
    }

    // Date object
    if (dateVal instanceof Date) {
        return dateVal;
    }

    // String handling
    if (typeof dateVal === 'string') {
        if (!dateVal) return new Date();

        // ISO format
        if (dateVal.includes('T')) {
            return new Date(dateVal);
        }

        // DD/MM/YYYY or MM/DD/YYYY
        if (dateVal.includes('/')) {
            const parts = dateVal.split('/').map(Number);
            if (parts.length === 3) {
                let [p1, p2, y] = parts;

                if (p1 <= 12 && p2 > 12) {
                    return new Date(y, p1 - 1, p2); // MM/DD/YYYY
                }

                return new Date(y, p2 - 1, p1); // DD/MM/YYYY
            }
        }

        const d = new Date(dateVal);
        return isNaN(d.getTime()) ? new Date() : d;
    }

    return new Date();
};

/**
 * Gets the current date in DD/MM/YYYY format
 */
export const getCurrentDate = () => {
    return formatDate(new Date());
};

/**
 * Gets the current time in HH:MM AM/PM format
 */
export const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

/**
 * Formats a date for display as "DD MMM, YYYY" (e.g., 26 Mar, 2026)
 * @param date String or Date object
 * @returns Formatted date string
 */
export const formatDisplayDate = (date) => {
    if (!date) return '';

    let d = null;
    if (date instanceof Date) {
        d = date;
    } else {
        d = parseDate(date);
    }

    if (!d || isNaN(d.getTime())) return typeof date === 'string' ? date : '';

    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const year = d.getFullYear();

    return `${day} ${month}, ${year}`;
};
