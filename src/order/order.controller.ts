import { Body, Controller, Get, Post } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderMatchDto } from './dto/order-match.dto';

@Controller('/api/order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('/getAbi')
  getAbi() {
    return this.orderService.getContractAbi();
  }

  @Get()
  getMatch() {
    return this.orderService.getOrdersMatch();
  }

  @Post()
  executeMatch(@Body() orderMatchDto: OrderMatchDto) {
    return this.orderService.executeOrderMatch(orderMatchDto);
  }
}
