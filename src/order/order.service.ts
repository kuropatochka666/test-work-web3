import { Injectable } from '@nestjs/common';
import Web3 from 'web3';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AbiItem } from 'web3-utils';
import { Contract } from 'web3-eth-contract';

import { OrderDto } from './dto/order.dto';
import { OrderMatchDto } from './dto/order-match.dto';
import { Order } from './entities/order.entity';

@Injectable()
export class OrderService {
  private readonly web3Instance: Web3;
  private abiAddress = `https://api-rinkeby.etherscan.io/api`;

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.web3Instance = new Web3(
      this.configService.get<string>('WEB3_RPC_ENDPOINT'),
    );
    this.getAllOrders();
  }

  getContractAbi(): Promise<AbiItem> {
    return this.httpService.axiosRef
      .get(this.abiAddress, {
        params: {
          module: 'contract',
          action: 'getabi',
          address: this.configService.get<string>('CONTRACT_ADDRESS'),
          apikey: this.configService.get<string>('ETHERSCAN_API_KEY'),
        },
      })
      .then((value) => JSON.parse(value.data.result))
      .catch((reason) => console.log(reason));
  }

  async getContract(): Promise<Contract> {
    const contractAbi = await this.getContractAbi();
    return new this.web3Instance.eth.Contract(
      contractAbi,
      this.configService.get<string>('CONTRACT_ADDRESS'),
    );
  }

  async getAllOrders(): Promise<void> {
    const contract = await this.getContract();
    try {
      let i = 0;
      const getOrderIdLength: number = await contract.methods
        .getOrderIdLength()
        .call();

      while (i < getOrderIdLength) {
        const getOrderId: string = await contract.methods.getOrderId(i).call();
        const getOrderInfo = await contract.methods
          .getOrderInfo(getOrderId)
          .call();
        const orderDto: OrderDto = {
          orderId: getOrderInfo['0'],
          amountA: getOrderInfo['1'],
          amountB: getOrderInfo['2'],
          amountLeftToFill: getOrderInfo['3'],
          fees: getOrderInfo['4'],
          tokenA: getOrderInfo['5'],
          tokenB: getOrderInfo['6'],
          user: getOrderInfo['7'],
          isCancelled: getOrderInfo['8'],
        };
        const findUnique = await this.orderRepository.findOneBy({
          orderId: orderDto.orderId,
        });
        if (!findUnique) this.orderRepository.save(orderDto);
        i++;
      }
    } catch (e) {
      console.log(e);
    }
  }

  async getOrdersMatch(): Promise<OrderMatchDto[]> {
    return await this.orderRepository.query(
      `select o1."orderId", o2."orderId" as "orderId2"
       from orders o1
                inner join orders o2
                           on o1."tokenA" = o2."tokenB" and o1."tokenB" = o2."tokenA" and
                              o1."amountA" = o2."amountB" and o1."amountB" = o2."amountA"
       where o1."isCancelled" = false
          and o2."isCancelled" = false`,
    );
  }

  async executeOrderMatch(match: OrderMatchDto): Promise<any> {
    const contract = await this.getContract();
    const firstOrderMatch = await this.orderRepository.findOneBy({
      orderId: match.orderId,
    });
    try {
      const order = await contract.methods
        .matchOrders(
          [match.orderId2],
          firstOrderMatch.tokenA,
          firstOrderMatch.tokenB,
          firstOrderMatch.amountA,
          firstOrderMatch.amountB,
          false,
        )
        .call();
      console.log(order);
      return order;
    } catch (e) {
      console.log(e);
      return e;
    }
  }
}
