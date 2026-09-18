const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Backend-API/src/Mobile/order/order.controller.ts';
let content = fs.readFileSync(path, 'utf8');

const oldCode = `@Get([':id/invoice/download', ':id/invoice/pdf'])
  @ApiProduces('application/pdf')
  @ApiOperation({ summary: 'Stream customer copy invoice as PDF for order' })
  @ApiParam({ name: 'id', type: 'number', description: 'Order ID' })
  @ApiOkResponse({ description: 'Customer copy PDF streamed', schema: { type: 'string', format: 'binary' } })
  @ApiNotFoundResponse({ description: 'Order not found' })
  async downloadInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const payment = await this.paymentsService.getLatestPaymentForOrder(id, (req.user?.companyId || req.user?.company_id) ?? req.headers["company-id"]);`;

const newCode = `@Get([':id/invoice/download', ':id/invoice/pdf'])
  @Public()
  @ApiProduces('application/pdf')
  @ApiOperation({ summary: 'Stream customer copy invoice as PDF for order' })
  @ApiParam({ name: 'id', type: 'number', description: 'Order ID' })
  @ApiOkResponse({ description: 'Customer copy PDF streamed', schema: { type: 'string', format: 'binary' } })
  @ApiNotFoundResponse({ description: 'Order not found' })
  async downloadInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    // If accessed publicly by a customer, bypass the companyId requirement
    const payment = req.user?.companyId || req.headers["company-id"] 
      ? await this.paymentsService.getLatestPaymentForOrder(id, (req.user?.companyId || req.user?.company_id) ?? req.headers["company-id"])
      : await this.paymentsService['paymentRepo'].findOne({
          where: { order_id: id, payment_status: 'SUCCESS' },
          order: { created_at: 'DESC' },
        });`;

content = content.replace(oldCode, newCode);
fs.writeFileSync(path, content);
console.log('Patched order.controller.ts');
