import BigNumber from 'bignumber.js';
import Web3 = require('web3');
import Constants from '../Constants';
import * as ethUtil from 'ethereumjs-util';
import { TransactionReceipt } from 'web3/types';

const NETWORK_ID = {
  MAINNET: '1',
  ROPSTEN: '3',
  RINKEBY: '4',
  KOVAN: '42',
  DOCKER: '1001',
  DEVELOPMENT: '1002',
  TOBALABA: '401697'
};

const NETWORK_ID_TO_NAME_MAP = {
  [NETWORK_ID.MAINNET]: 'mainnet',
  [NETWORK_ID.ROPSTEN]: 'ropsten',
  [NETWORK_ID.RINKEBY]: 'rinkeby',
  [NETWORK_ID.KOVAN]: 'kovan',
  [NETWORK_ID.DOCKER]: 'docker',
  [NETWORK_ID.DEVELOPMENT]: 'development',
  [NETWORK_ID.TOBALABA]: 'tobalaba'
};

/**
 * @TODO refactor
 *
 * Used only in this lib
 *
 */
// const waitForTransactionToBeMined = (web3, txHash, interval) => {
//   interval = interval || 500
//   const txReceiptAsync = (txHash, resolve, reject) => {
//     web3.eth.getTransactionReceipt(txHash, (err, receipt) => {
//       if (err) {
//         reject(err)
//       } else if (receipt == null) {
//         setTimeout(() => {
//           txReceiptAsync(txHash, resolve, reject)
//         }, interval)
//       } else {
//         resolve(receipt)
//       }
//     })
//   }
//   return new Promise((resolve, reject) => {
//     txReceiptAsync(txHash, resolve, reject)
//   })
// }

export default class W3Util {
  public static getWeb3FromProviderUrl(providerUrl: string) {
    let provider: any;

    if (this.isHTTPConnection(providerUrl)) {
      provider = new Web3.providers.HttpProvider(providerUrl);
    } else if (this.isWSConnection(providerUrl)) {
      provider = new Web3.providers.WebsocketProvider(providerUrl);
      provider.__proto__.sendAsync = provider.__proto__.sendAsync || provider.__proto__.send;
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
          method: 'eth_getFilterLogs',
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
    const web3 = W3Util.getWeb3FromProviderUrl(providerUrl);
    return W3Util.isWatchingEnabled(web3);
  }

  private web3: Web3;

  constructor(web3?: Web3) {
    this.web3 = web3;
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

  /**
   * @TODO refactor, use this synchronous method instead of async call to contract in eac
   *
   * @param callGas
   * @param callValue
   * @param gasPrice
   * @param fee
   * @param bounty
   */
  public calcEndowment(callGas: any, callValue: any, gasPrice: any, fee: any, bounty: any) {
    const callGasBN = new BigNumber(callGas);
    const callValueBN = new BigNumber(callValue);
    const gasPriceBN = new BigNumber(gasPrice);
    const feeBN = new BigNumber(fee);
    const bountyBN = new BigNumber(bounty);

    return bountyBN
      .plus(feeBN)
      .plus(callGasBN.times(gasPrice))
      .plus(gasPriceBN.times(180000))
      .plus(callValueBN);
  }

  public getABI(name: string) {
    return require(`${__dirname}/build/abi/${name}.json`);
  }

  /**
   * Returns the string argument of the detected network.
   *
   * @param {Web3} web3
   */
  public async getChainName() {
    const netId = await this.web3.eth.net.getId();

    if (netId > 1517361627) {
      return 'tester';
    }

    return NETWORK_ID_TO_NAME_MAP[netId];
  }
}
