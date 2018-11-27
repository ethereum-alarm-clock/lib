import BigNumber from 'bignumber.js';
import Web3 = require('web3');
import TimestampSchedulerABI from './abi/TimestampScheduler';
import { TimestampScheduler } from '../types/web3-contracts/TimestampScheduler';

type Address = string;

const MINIMUM_WINDOW_SIZE_TIMESTAMP = new BigNumber(5 * 60); // 5 minutes
const MINIMUM_WINDOW_SIZE_BLOCK = new BigNumber(5);

const TIMESTAMP_SCHEDULER_KOVAN_ADDRESS = '0x44b28e47fe781eabf8095a2a21449a82a635745b';

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
    options = this.fillMissingOptions(options);

    const scheduler = new this.web3.eth.Contract(
      TimestampSchedulerABI,
      TIMESTAMP_SCHEDULER_KOVAN_ADDRESS
    ) as TimestampScheduler;

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

    options = this.fillMissingOptions(options);

    const scheduler = new this.web3.eth.Contract(
      TimestampSchedulerABI,
      TIMESTAMP_SCHEDULER_KOVAN_ADDRESS
    ) as TimestampScheduler;

    const endowment = await this.computeEndowment(options);

    const encodedABI = scheduler.methods
      .schedule(options.toAddress, this.web3.utils.fromAscii(options.callData), [
        options.callGas.toString(),
        options.callValue.toString(),
        options.windowSize.toString(),
        options.windowStart.toString(),
        options.gasPrice.toString(),
        options.fee.toString(),
        options.bounty.toString(),
        options.requiredDeposit.toString()
      ])
      .encodeABI();

    const tx = {
      from: '0xd8c6F58BbF71E0739E4CCfe9f9721a07285bB895',
      to: scheduler._address,
      data: encodedABI,
      value: endowment,
      gas: 600000
    };

    const signedTx = await this.web3.eth.accounts.signTransaction(tx, this.privateKey);

    const sentTx = this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);

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

  private assertRequiredOptionsArePresent(options: SchedulingOptions) {
    if (!options.toAddress) {
      throw new Error('toAddress in SchedulingOptions needs to be present.');
    }

    if (!options.windowStart) {
      throw new Error('windowStart in SchedulingOptions needs to be present.');
    }
  }

  private fillMissingOptions(options: SchedulingOptions): SchedulingOptions {
    if (typeof options.timestampScheduling === 'undefined') {
      options.timestampScheduling = true;
    }

    if (typeof options.bounty === 'undefined') {
      options.bounty = new BigNumber(this.web3.utils.toWei('0.01', 'ether'));
    }

    if (typeof options.from === 'undefined') {
      options.from = this.web3.eth.accounts[0];
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
