import { EAC } from './index';
import Web3 = require('web3');
import BigNumber from 'bignumber.js';
import * as moment from 'moment';

/* globals window */

async function getWeb3() {
  const WEB3_PROVIDER =
    'https://rarely-suitable-shark.quiknode.io/87817da9-942d-4275-98c0-4176eee51e1a/aB5gwSfQdN4jmkS65F1HyA==/';
  let web3;

  // if (typeof(window) !== 'undefined' && window.ethereum) {
  //     await window.ethereum.enable(); // new MetaMask requirement

  //     web3 = new Web3(window.ethereum);
  // } else {
  web3 = new Web3(WEB3_PROVIDER);
  // }

  return web3;
}

(async () => {
  const web3 = await getWeb3();

  const privateKey = '';
  const eac = new EAC(web3, privateKey);

  eac.schedule({
    toAddress: '0xd8c6F58BbF71E0739E4CCfe9f9721a07285bB895', // required
    windowStart: new BigNumber(
      moment()
        .add('1', 'days')
        .unix()
    ) // required
    // -- optional --
    // timestampScheduling: '', // defaults to true
    // bounty: '', // defaults to 0.01 ETH
    // from: '', // defaults to web3.eth.accounts[0]
    // callData: '', // defaults to ''
    // callGas: '', // defaults to 21000 or estimation
    // callValue: '', // defaults to 0
    // windowSize: '', // defaults to 2 * MINIMUM_WINDOW_START
    // gasPrice: '', // defaults to 30 GWEI
    // fee: '', // defaults to 0,
    // requiredDeposit: '', // defaults to 2 * bounty
  });
})();
