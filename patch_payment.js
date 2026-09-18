const fs = require('fs');
const path = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Backend-API/src/Mobile/payments/payments.controller.ts';
let content = fs.readFileSync(path, 'utf8');

const oldEndpoint = `@Get(':id/invoice/download')
  @UseGuards(JwtAuthGuard)
  @ApiProduces('application/pdf')
  @ApiOperation({ summary: 'Download customer copy invoice as PDF (auth required)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Payment ID' })
  @ApiOkResponse({ description: 'Invoice PDF downloaded', schema: { type: 'string', format: 'binary' } })
  @ApiNotFoundResponse({ description: 'Payment not found' })
  async downloadInvoice(
    @Param('id') id: string,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const payment = await this.paymentsService.findOne(id, (req.user?.companyId || req.user?.company_id) ?? req.headers["company-id"]);
    const result = await this.orderInvoiceService.generatePdfBuffer(payment.order_details.order_id, payment.payment_details.payment_id);`;

const newEndpoint = `@Get(':id/invoice/download')
  @Public()
  @ApiProduces('application/pdf')
  @ApiOperation({ summary: 'Download customer copy invoice as PDF (no auth required)' })
  @ApiParam({ name: 'id', type: 'number', description: 'Payment ID' })
  @ApiOkResponse({ description: 'Invoice PDF downloaded', schema: { type: 'string', format: 'binary' } })
  @ApiNotFoundResponse({ description: 'Payment not found' })
  async downloadInvoice(
    @Param('id') id: string,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const payment = await this.paymentsService.findOneRaw(id);
    if (!payment) {
      res.status(404).json({ success: false, message: 'Payment not found' });
      return;
    }
    const result = await this.orderInvoiceService.generatePdfBuffer(payment.order_id, payment.id);`;

content = content.replace(oldEndpoint, newEndpoint);
fs.writeFileSync(path, content);
console.log('Patched payments.controller.ts');
