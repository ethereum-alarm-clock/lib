import BigNumber from 'bignumber.js';
import Web3 = require('web3');
import Constants from '../Constants';
import * as ethUtil from 'ethereumjs-util';
import { TransactionReceipt, Subscribe } from 'web3/types';
import { Provider } from 'web3/providers';
import { Block, Transaction, BlockType } from 'web3/eth/types';
import { ITransactionRequest } from '../transactionRequest/ITransactionRequest';
import PromiEvent from 'web3/promiEvent';

import * as AddressesJSONMainnet from '../../config/contracts/1.json';
import * as AddressesJSONRopsten from '../../config/contracts/3.json';
import * as AddressesJSONRinkeby from '../../config/contracts/4.json';
import * as AddressesJSONRSKTestnet from '../../config/contracts/31.json';
import * as AddressesJSONKovan from '../../config/contracts/42.json';
import * as AddressesJSONTest from '../../config/contracts/1002.json';

export enum Networks {
  Private = 0,
  Mainnet = 1,
  Morden = 2,
  Ropsten = 3,
  Rinkeby = 4,
  // RSKMainNet = 30, not enabled yet
  RSKTestNet = 31,
  Kovan = 42,
  Docker = 1001,
  Development = 1002,
  Tobalaba = 401697
}

interface NetworkIdToNameMapType {
  [key: string]: EAC_NETWORK_NAME;
}

const NETWORK_ID_TO_NAME_MAP: NetworkIdToNameMapType = {
  [Networks.Mainnet]: 'mainnet',
  [Networks.Ropsten]: 'ropsten',
  [Networks.Rinkeby]: 'rinkeby',
  [Networks.RSKTestNet]: 'rsk_testnet',
  [Networks.Kovan]: 'kovan',
  [Networks.Docker]: 'docker',
  [Networks.Development]: 'development',
  [Networks.Tobalaba]: 'tobalaba'
};

type EAC_NETWORK_NAME =
  | 'mainnet'
  | 'ropsten'
  | 'rinkeby'
  | 'rsk_testnet'
  | 'kovan'
  | 'docker'
  | 'development'
  | 'tobalaba'
  | 'tester';

const REQUEST_FACTORY_STARTBLOCKS = {
  [Networks.Mainnet]: 6204104,
  [Networks.Ropsten]: 2594245,
  [Networks.Kovan]: 5555500,
  [Networks.RSKTestNet]: '0x21b0f'
};

const NETWORK_TO_ADDRESSES_MAPPING = {
  1: AddressesJSONMainnet,
  3: AddressesJSONRopsten,
  4: AddressesJSONRinkeby,
  31: AddressesJSONRSKTestnet,
  42: AddressesJSONKovan,
  1002: AddressesJSONTest
};

const EXECUTION_OVERHEAD = 180000;

export default class Util {
  public static getWeb3FromProviderUrl(providerUrl: string): Web3 {
    let provider: Provider;

    if (this.isHTTPConnection(providerUrl)) {
      provider = new Web3.providers.HttpProvider(providerUrl);
    } else if (this.isWSConnection(providerUrl)) {
      provider = new Web3.providers.WebsocketProvider(providerUrl);
    } else {
      throw Error('Unsupported provider.');
    }

    return new Web3(provider);
  }

  public static isHTTPConnection(url: string): boolean {
    return url.includes('http://') || url.includes('https://');
  }

  public static isWatchingEnabled(web3: Web3): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      web3.currentProvider.send(
        {
          jsonrpc: '2.0',
          id: new Date().getTime(),
          method: 'eth_subscribe',
          params: ['0x16'] // we need to provide at least 1 argument, this is test data
        },
        (err: any) => {
          resolve(err === null);
        }
      );
    });
  }

  public static isWSConnection(url: string): boolean {
    return url.includes('ws://') || url.includes('wss://');
  }

  public static testProvider(providerUrl: string): Promise<boolean> {
    const web3 = Util.getWeb3FromProviderUrl(providerUrl);
    return Util.isWatchingEnabled(web3);
  }

  /**
   * @TODO refactor, use this synchronous method instead of async call to contract in eac
   *
   * @param callGas
   * @param callValue
   * @param gasPrice
   * @param fee
   * @param bounty
   */
  public static calcEndowment(callGas: any, callValue: any, gasPrice: any, fee: any, bounty: any) {
    const callGasBN = new BigNumber(callGas);
    const callValueBN = new BigNumber(callValue);
    const gasPriceBN = new BigNumber(gasPrice);
    const feeBN = new BigNumber(fee);
    const bountyBN = new BigNumber(bounty);

    return bountyBN
      .plus(feeBN)
      .plus(callGasBN.times(gasPrice))
      .plus(gasPriceBN.times(EXECUTION_OVERHEAD))
      .plus(callValueBN);
  }

  public static estimateMaximumExecutionGasPrice(
    bounty: BigNumber,
    gasPrice: BigNumber,
    callGas: BigNumber
  ) {
    if (!gasPrice || !callGas || !bounty) {
      throw new Error('Missing arguments');
    }

    if (gasPrice.isNegative() || callGas.isNegative() || bounty.isNegative()) {
      throw new Error('gasPrice, callGas and bounty has to be positive number');
    }

    const arbitraryCoefficient = 0.85;
    const paymentModifier = 0.9;
    const claimingGasAmount = 100000;
    const claimingGasCost = gasPrice.times(claimingGasAmount);
    const executionGasAmount = callGas.plus(EXECUTION_OVERHEAD);

    return bounty
      .times(paymentModifier)
      .minus(claimingGasCost)
      .dividedBy(executionGasAmount)
      .times(arbitraryCoefficient)
      .decimalPlaces(0);
  }

  public static estimateBountyForExecutionGasPrice(
    gasPrice: BigNumber,
    callGas: BigNumber,
    additionalGasPrice: BigNumber
  ) {
    if (!gasPrice || !callGas || !additionalGasPrice) {
      throw new Error('Missing arguments');
    }

    if (gasPrice.isNegative() || callGas.isNegative() || additionalGasPrice.isNegative()) {
      throw new Error('gasPrice, callGas and additionalGasPrice has to be positive number');
    }

    const arbitraryCoefficient = 0.85;
    const paymentModifier = 0.9;
    const claimingGasAmount = 100000;
    const claimingGasCost = gasPrice.times(claimingGasAmount);
    const executionGasAmount = callGas.plus(EXECUTION_OVERHEAD);

    return additionalGasPrice
      .times(executionGasAmount)
      .plus(claimingGasCost)
      .dividedBy(paymentModifier)
      .dividedBy(arbitraryCoefficient)
      .decimalPlaces(0);
  }

  private web3: Web3;

  constructor(web3: Web3) {
    this.web3 = web3;
  }

  public async isNetworkSupported() {
    const netId = await this.web3.eth.net.getId();
    if ((Object as any).values(Networks).includes(netId)) {
      return true;
    }
    return false;
  }

  public isNotNullAddress(address: string) {
    return address !== Constants.NULL_ADDRESS;
  }

  public checkValidAddress(address: string): boolean {
    return ethUtil.isValidAddress(address);
  }

  public getTransactionRequestAddressFromReceipt(receipt: TransactionReceipt) {
    const foundLog = receipt.logs.find(log => log.topics[0] === Constants.NEWREQUESTLOG);

    return `0x${foundLog.data.slice(-40)}`;
  }

  public sendRawTransaction(transaction: string): PromiEvent<TransactionReceipt> {
    return this.web3.eth.sendSignedTransaction(transaction);
  }

  public getABI(name: string) {
    return require(`${__dirname}/../abi/${name}.json`);
  }

  /**
   * Returns the string argument of the detected network.
   *
   * @param {Web3} web3
   */
  public async getChainName(): Promise<EAC_NETWORK_NAME> {
    const netId = await this.web3.eth.net.getId();

    if (netId > 1517361627) {
      return 'tester';
    }

    return NETWORK_ID_TO_NAME_MAP[netId];
  }

  public async getRequestFactoryStartBlock(): Promise<BlockType> {
    const netId = await this.web3.eth.net.getId();

    return REQUEST_FACTORY_STARTBLOCKS[netId] || 0;
  }

  public async balanceOf(account: string): Promise<BigNumber> {
    const balance = (await this.web3.eth.getBalance(account)).toString();

    return new BigNumber(balance);
  }

  public async getBlock(blockNumber: BlockType = 'latest'): Promise<Block> {
    if (
      ['genesis', 'latest', 'pending'].indexOf(blockNumber.toString()) === -1 &&
      typeof blockNumber === 'string'
    ) {
      blockNumber = parseInt(blockNumber, 10);
    }

    const block = await this.web3.eth.getBlock(blockNumber as number);

    if (block) {
      return block;
    }

    throw Error(`Returned block ${blockNumber} is null`);
  }

  public async getTimestampForBlock(blockNum: BlockType): Promise<number> {
    const curBlockNum = await this.web3.eth.getBlockNumber();
    if (blockNum > curBlockNum) {
      throw new Error(
        `Must pass in a blocknumber at or lower than the current blocknumber. Now: ${curBlockNum} | Tried: ${blockNum}`
      );
    }
    const block = await this.web3.eth.getBlock(blockNum as number);
    return block.timestamp;
  }

  public async getTransactionCount(address: string): Promise<number> {
    return this.web3.eth.getTransactionCount(address);
  }

  public async getReceipt(transactionHash: string): Promise<TransactionReceipt> {
    return this.web3.eth.getTransactionReceipt(transactionHash);
  }

  public async getTransaction(transactionHash: string): Promise<Transaction> {
    return this.web3.eth.getTransaction(transactionHash);
  }

  public toHex(value: any): string {
    return this.web3.utils.toHex(value);
  }

  public async getContractsAddresses(): Promise<EACAddresses> {
    const netId = await this.web3.eth.net.getId();

    const addresses = NETWORK_TO_ADDRESSES_MAPPING[netId];

    if (!addresses) {
      throw Error(`Network with id: "${netId}" is not supported.`);
    }

    return addresses;
  }

  public stopFilter(filter: Subscribe<any>): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      let unsubscriptionSuccessful: boolean | void = false;

      if (filter.subscription) {
        unsubscriptionSuccessful = filter.subscription.unsubscribe();

        resolve(unsubscriptionSuccessful || false);
      } else {
        (filter as any).unsubscribe((error: any, success: boolean) => {
          if (success) {
            resolve(success);
          } else {
            reject(error);
          }
        });
      }
    });
  }

  /*
   * Takes an average of the last 100 blocks and estimates the
   * blocktime.
   */
  public async getAverageBlockTime(): Promise<number> {
    const numLookbackBlocks: number = 100;
    const times: number[] = [];

    const blockPromises: Promise<Block>[] = [];
    const currentBlockNumber: number = await this.web3.eth.getBlockNumber();
    const firstBlock: Block = await this.web3.eth.getBlock(currentBlockNumber - numLookbackBlocks);

    for (let i = firstBlock.number; i < currentBlockNumber; i++) {
      blockPromises.push(this.web3.eth.getBlock(i));
    }

    const resolvedBlocks: Block[] = await Promise.all(blockPromises);

    let prevTimestamp = firstBlock.timestamp;
    resolvedBlocks.forEach((block: Block) => {
      const time = block.timestamp - prevTimestamp;
      prevTimestamp = block.timestamp;
      times.push(time);
    });

    if (times.length === 0) {
      return 1;
    }

    return Math.round(times.reduce((a, b) => a + b) / times.length);
  }

  public calculateGasAmount(txRequest: ITransactionRequest): BigNumber {
    return txRequest.callGas
      .plus(180000)
      .div(64)
      .times(65)
      .decimalPlaces(0);
  }

  public async waitForConfirmations(
    sentTransaction: PromiEvent<TransactionReceipt>,
    desiredConfirmations: number = 12
  ): Promise<TransactionReceipt> {
    return new Promise<TransactionReceipt>((resolve, reject) => {
      sentTransaction.on(
        'confirmation',
        (confirmationNumber: number, receipt: TransactionReceipt) => {
          if (confirmationNumber >= desiredConfirmations) {
            resolve(receipt);
          }
        }
      );

      sentTransaction.on('error', reject);
    });
  }
}
