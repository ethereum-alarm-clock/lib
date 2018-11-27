import BigNumber from 'bignumber.js';
import Web3 = require('web3');
import TimestampSchedulerABI from './abi/TimestampScheduler';
import { TimestampScheduler } from '../types/web3-contracts/TimestampScheduler';
import * as AddressesJSONKovan from '../config/contracts/42.json';
import * as AddressesJSONTest from '../config/contracts/1002.json';
import { TransactionReceipt } from 'web3/types';
import PromiEvent from 'web3/promiEvent';

const NETWORK_TO_ADDRESSES_MAPPING = {
  42: AddressesJSONKovan,
  1002: AddressesJSONTest
};

type Address = string;

const MINIMUM_WINDOW_SIZE_TIMESTAMP = new BigNumber(5 * 60); // 5 minutes
const MINIMUM_WINDOW_SIZE_BLOCK = new BigNumber(5);

interface SchedulingOptions {
  toAddress: Address;
  windowStart: BigNumber;
  timestampScheduling?: boolean;
  bounty?: BigNumber;
  from?: Address;
  callData?: string;
  callGas?: BigNumber;
  callValue?: BigNumber;
  windowSize?: BigNumber;
  gasPrice?: BigNumber;
  fee?: BigNumber;
  requiredDeposit?: BigNumber;
}

export default class EAC {
  private privateKey: string;
  private web3: Web3;

  constructor(web3: Web3, privateKey: string) {
    this.web3 = web3;
    this.privateKey = privateKey;
  }

  public async computeEndowment(options: SchedulingOptions) {
    this.assertRequiredOptionsArePresent(options);
    options = await this.fillMissingOptions(options);

    const scheduler = await this.getTimestampScheduler();

    return scheduler.methods
      .computeEndowment(
        options.bounty.toString(),
        options.fee.toString(),
        options.callGas.toString(),
        options.callValue.toString(),
        options.gasPrice.toString()
      )
      .call();
  }

  public async schedule(options: SchedulingOptions) {
    this.assertRequiredOptionsArePresent(options);

    options = await this.fillMissingOptions(options);

    const scheduler = await this.getTimestampScheduler();

    const endowment = await this.computeEndowment(options);

    const scheduleTransaction = scheduler.methods.schedule(
      options.toAddress,
      this.web3.utils.fromAscii(options.callData),
      [
        options.callGas.toString(),
        options.callValue.toString(),
        options.windowSize.toString(),
        options.windowStart.toString(),
        options.gasPrice.toString(),
        options.fee.toString(),
        options.bounty.toString(),
        options.requiredDeposit.toString()
      ]
    );

    const encodedABI = scheduleTransaction.encodeABI();

    const tx = {
      from: options.from,
      to: scheduler._address,
      data: encodedABI,
      value: endowment,
      gas: 600000
    };

    let sentTx: PromiEvent<TransactionReceipt>;

    if (this.privateKey) {
      const signedTx = await this.web3.eth.accounts.signTransaction(tx, this.privateKey);
      sentTx = this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    } else {
      sentTx = this.web3.eth.sendTransaction(tx);
    }

    sentTx
      .on('confirmation', confirmationNumber => {
        console.log('=> confirmation: ' + confirmationNumber);
      })
      .on('transactionHash', hash => {
        console.log('=> hash');
        console.log(hash);
      })
      .on('receipt', receipt => {
        console.log('=> reciept');
        console.log(receipt);
      })
      .on('error', console.error);
  }

  private async getNetworkId() {
    return this.web3.eth.net.getId();
  }

  private async getTimestampScheduler() {
    const netId = await this.getNetworkId();

    const addresses = NETWORK_TO_ADDRESSES_MAPPING[netId];

    if (!addresses) {
      throw Error(`Network with id: "${netId}" is not supported.`);
    }

    return new this.web3.eth.Contract(
      TimestampSchedulerABI,
      (addresses as any).timestampScheduler
    ) as TimestampScheduler;
  }

  private assertRequiredOptionsArePresent(options: SchedulingOptions) {
    if (!options.toAddress) {
      throw new Error('toAddress in SchedulingOptions needs to be present.');
    }

    if (!options.windowStart) {
      throw new Error('windowStart in SchedulingOptions needs to be present.');
    }
  }

  private async fillMissingOptions(options: SchedulingOptions): Promise<SchedulingOptions> {
    if (typeof options.timestampScheduling === 'undefined') {
      options.timestampScheduling = true;
    }

    if (typeof options.bounty === 'undefined') {
      options.bounty = new BigNumber(this.web3.utils.toWei('0.01', 'ether'));
    }

    if (typeof options.from === 'undefined') {
      const accounts = await this.web3.eth.getAccounts();
      options.from = accounts[0];
    }

    if (typeof options.callData === 'undefined') {
      options.callData = '';
    }

    if (typeof options.callGas === 'undefined') {
      options.callGas = new BigNumber('21000');
    }

    if (typeof options.callValue === 'undefined') {
      options.callValue = new BigNumber('0');
    }

    if (typeof options.windowSize === 'undefined') {
      options.windowSize = (options.timestampScheduling
        ? MINIMUM_WINDOW_SIZE_TIMESTAMP
        : MINIMUM_WINDOW_SIZE_BLOCK
      ).times(2);
    }

    if (typeof options.gasPrice === 'undefined') {
      options.gasPrice = new BigNumber('30');
    }

    if (typeof options.fee === 'undefined') {
      options.fee = new BigNumber('0');
    }

    if (typeof options.requiredDeposit === 'undefined') {
      options.requiredDeposit = new BigNumber('0');
    }

    return options;
  }
}
