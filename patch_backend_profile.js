const fs = require('fs');
const file = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Backend-API/src/Mobile/customer-auth/customer-auth.controller.ts';
let content = fs.readFileSync(file, 'utf8');

const getProfileCode = `
  @Get('profile')
  @ApiOperation({ summary: 'Get current customer profile' })
  async getProfile(@Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException('No token provided');
    return this.authService.getProfile(token);
  }
`;

content = content.replace("import { Controller, Post, Body, Patch, Headers, UnauthorizedException } from '@nestjs/common';", "import { Controller, Get, Post, Body, Patch, Headers, UnauthorizedException } from '@nestjs/common';");
content = content.replace("  @Patch('profile')", getProfileCode + "\n  @Patch('profile')");

fs.writeFileSync(file, content);

const serviceFile = '/Users/bhuvan/Documents/Bhuvan/Products/Sewvee-Backend-API/src/Mobile/customer-auth/customer-auth.service.ts';
let srvContent = fs.readFileSync(serviceFile, 'utf8');

const getProfileSrvCode = `
  async getProfile(token: string) {
    const jwt = require('jsonwebtoken');
    let payload: any;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    const customer = await this.customerRepository.findOne({ where: { id: payload.sub, isDeleted: false } });
    if (!customer) throw new UnauthorizedException('Customer not found');

    return {
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        mobile: customer.mobile,
        email: customer.email,
      }
    };
  }
`;

srvContent = srvContent.replace("  async updateProfile(", getProfileSrvCode + "\n  async updateProfile(");
fs.writeFileSync(serviceFile, srvContent);
