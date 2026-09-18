const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Backend-API/src/Mobile/customer-portal/customer-portal.service.ts';
let content = fs.readFileSync(path, 'utf8');

const targetMethod = `  async getCustomerRequests(orderId: number) {
    const requests = await this.dataSource.query(
      \`SELECT r.*, oo.outfit_type as outfit_name
       FROM order_requests r
       LEFT JOIN order_outfits oo ON oo.id = r.order_outfit_id
       WHERE r.order_id = $1
       ORDER BY r.created_at ASC\`,
      [orderId]
    );
    return { success: true, data: requests };
  }`;

const newMethod = `  async getCustomerRequests(orderId: number) {
    // Mark messages as read by customer when they fetch them
    await this.dataSource.query(
      \`UPDATE order_requests 
       SET is_read_by_customer = true 
       WHERE order_id = $1 AND sender_type = 'BUSINESS' AND is_read_by_customer = false\`,
      [orderId]
    );

    const requests = await this.dataSource.query(
      \`SELECT r.*, oo.outfit_type as outfit_name
       FROM order_requests r
       LEFT JOIN order_outfits oo ON oo.id = r.order_outfit_id
       WHERE r.order_id = $1
       ORDER BY r.created_at ASC\`,
      [orderId]
    );
    return { success: true, data: requests };
  }`;

content = content.replace(targetMethod, newMethod);
fs.writeFileSync(path, content);
console.log('Patched getCustomerRequests');
