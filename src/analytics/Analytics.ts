import BigNumber from 'bignumber.js';
import TransactionRequest from '../transactionRequest/TransactionRequest';
import Web3 = require('web3');
import RequestFactory from '../requestFactory/RequestFactory';
import { EventLog } from 'web3/types';
import { Util } from '..';
import fetch from 'node-fetch';
import { ITransactionRequestRaw } from '../transactionRequest/ITransactionRequest';

export default class Analytics {
  private requestFactory: RequestFactory;
  private web3: Web3;
  private util: Util;

  constructor(web3: Web3, requestFactory: RequestFactory) {
    this.requestFactory = requestFactory;
    this.web3 = web3;
    this.util = new Util(web3);
  }

  public async getTotalEthTransferred(): Promise<number> {
    let totalEthTransferred = 0;

    const chainName = await this.util.getChainName();

    const addresses = await this.util.getContractsAddresses();

    const subdomain = chainName === 'mainnet' ? 'api' : `api-${chainName}`;

    const baseUrl = `https://${subdomain}.etherscan.io/api?module=account&action=txlist&startblock=0&endblock=99999999&sort=asc`;
    const timestampSchedulerUrl = `${baseUrl}&address=${addresses.timestampScheduler}`;
    const blockSchedulerUrl = `${baseUrl}&address=${addresses.blockScheduler}`;

    const urls = [timestampSchedulerUrl, blockSchedulerUrl];

    const promises: Promise<any>[] = [];

    urls.forEach(url => {
      const resultPromise = fetch(url).then(async resp => {
        const response = await resp.json();

        if (response.status === '1' && response.message === 'OK') {
          const weiTransferred = response.result.reduce(
            (acc: any, tx: any) => acc + parseInt(tx.value, 10),
            0
          );
          return this.web3.utils.fromWei(weiTransferred.toString(), 'ether');
        } else {
          throw Error(response.result);
        }
      });
      promises.push(resultPromise);
    });

    let values;
    try {
      values = await Promise.all(promises);
      totalEthTransferred = values.reduce((acc, value) => acc + parseFloat(value), 0);
    } catch (e) {
      console.log('Unable to connect to Etherscan. Fetching analytics natively...');
      totalEthTransferred = new BigNumber(await this.getTotalEthTransferredNatively()).toNumber();
    }

    return totalEthTransferred;
  }

  public async getTotalEthTransferredNatively(): Promise<string> {
    const fromBlock = await this.util.getRequestFactoryStartBlock();

    const events = await new Promise<ITransactionRequestRaw[]>(resolve => {
      this.requestFactory.instance.events
        .RequestCreated({
          fromBlock
        })
        .on('event', (error: any, logs: EventLog[]) => {
          resolve(
            logs.map((log: EventLog) => ({
              address: log.returnValues.request,
              params: log.returnValues.params
            }))
          );
        });
    });

    const transactions = await Promise.all<TransactionRequest>(
      events.map(
        async (tx): Promise<TransactionRequest> => {
          const request = new TransactionRequest(tx.address, this.web3);
          await request.fillData();
          return request;
        }
      )
    );

    const weiTransferred = transactions.reduce(
      (sum, tx) => sum.plus(tx.callValue),
      new BigNumber(0)
    );

    return this.web3.utils.fromWei(weiTransferred.toString(), 'ether');
  }
}
