import BigNumber from 'bignumber.js';
import Constants from '../Constants';
import * as ethUtil from 'ethereumjs-util';
import Web3 = require('web3');
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
 * @TODO Replace compute endowment which is async and calls contract with this synchronous faster version
 *
 * @param callGas
 * @param callValue
 * @param gasPrice
 * @param fee
 * @param bounty
 */
const calcEndowment = (callGas: any, callValue: any, gasPrice: any, fee: any, bounty: any) => {
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
};

function checkNotNullAddress(address: string) {
  return address !== Constants.NULL_ADDRESS;
}

function checkValidAddress(address: string): boolean {
  return ethUtil.isValidAddress(address);
}

// / Requires a case sensitive name of the contract and will return the ABI if found.
const getABI = (name: string) => {
  return require(`${__dirname}/build/abi/${name}.json`);
};

function getTxRequestFromReceipt(receipt: TransactionReceipt) {
  const foundLog = receipt.logs.find(log => log.topics[0] === Constants.NEWREQUESTLOG);

  return `0x${foundLog.data.slice(-40)}`;
}

/**
 * Returns the string argument of the detected network.
 *
 * @param {Web3} web3
 */
async function getChainName(web3: Web3) {
  const netId = await web3.eth.net.getId();

  if (netId > 1517361627) {
    return 'tester';
  }

  return NETWORK_ID_TO_NAME_MAP[netId];
}

/**
 * @TODO refactor
 *
 * Used only in this lib
 *
 * @param web3
 * @param txHash
 * @param interval
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

export default function(web3?: Web3) {
  if (web3) {
    return {
      calcEndowment,
      checkNotNullAddress,
      checkValidAddress,
      getABI,
      getChainName: () => getChainName(web3),
      getTxRequestFromReceipt
    };
  }

  return {
    calcEndowment,
    checkNotNullAddress,
    checkValidAddress,
    getABI,
    getChainName,
    getTxRequestFromReceipt
  };
}
