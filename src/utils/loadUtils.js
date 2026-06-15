// getDeliveryLoad.js

/**
 * Load status can be: 'low' | 'medium' | 'high'
 * DeliveryLoadMap format:
 * {
 *   'dd/mm/yyyy': {
 *      count: number,
 *      status: 'low' | 'medium' | 'high',
 *      urgentCount: number
 *   }
 * }
 */
import { Orders } from '../types';

export const getDeliveryLoad = (orders, month = -1, year = -1) => {
    const loadMap = {};

    // Filter relevant orders
    const activeOrders = orders.filter(o =>
        o.status !== 'Cancelled' &&
        o.status !== 'Delivered' &&
        o.status !== 'Completed'
    );

    activeOrders.forEach(order => {
        // Collect all relevant dates for this order
        const relevantDates = new Set();
        const dateToUrgency = new Map();

        // Check Items first
        let hasItemDates = false;

        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                if (item.status !== 'Cancelled' && item.deliveryDate) {
                    hasItemDates = true;
                    relevantDates.add(item.deliveryDate);

                    const orderUrgency =
                        order.urgency === 'Urgent' || order.urgency === 'High';
                    const itemUrgency =
                        item.urgency === 'Urgent' || item.urgency === 'High';

                    if (itemUrgency || orderUrgency) {
                        dateToUrgency.set(item.deliveryDate, true);
                    }
                }
            });
        }

        // Fallback to order delivery date if no item-level dates
        if (!hasItemDates && order.deliveryDate) {
            relevantDates.add(order.deliveryDate);

            const orderUrgent =
                order.urgency === 'Urgent' || order.urgency === 'High';

            if (orderUrgent) {
                dateToUrgency.set(order.deliveryDate, true);
            }
        }

        // Process found dates
        relevantDates.forEach(dateStr => {
            // Expected format: dd/mm/yyyy
            const parts = dateStr.split('/');
            if (parts.length === 3) {
                const mC = parseInt(parts[1], 10) - 1; // month (0-based)
                const yC = parseInt(parts[2], 10);

                // Filter by month/year if provided
                if (
                    (month === -1 && year === -1) ||
                    (mC === month && yC === year)
                ) {
                    if (!loadMap[dateStr]) {
                        loadMap[dateStr] = {
                            count: 0,
                            status: 'low',
                            urgentCount: 0,
                        };
                    }

                    // Count one load per order per date
                    loadMap[dateStr].count++;

                    if (dateToUrgency.get(dateStr)) {
                        loadMap[dateStr].urgentCount++;
                    }
                }
            }
        });
    });

    // Determine load status based on count
    Object.keys(loadMap).forEach(date => {
        const count = loadMap[date].count;

        if (count <= 2) loadMap[date].status = 'low';
        else if (count <= 5) loadMap[date].status = 'medium';
        else loadMap[date].status = 'high';
    });

    return loadMap;
};