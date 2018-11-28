// tslint:disable-next-line:no-reference
/// <reference path="./global.d.ts" />

import BigNumber from 'bignumber.js';
import Web3 = require('web3');
import SchedulerInterfaceABI from './abi/SchedulerInterface';
import { SchedulerInterface } from '../types/web3-contracts/SchedulerInterface';
import RequestFactoryABI from './abi/RequestFactory';
import * as AddressesJSONKovan from '../config/contracts/42.json';
import * as AddressesJSONTest from '../config/contracts/1002.json';
import { TransactionReceipt } from 'web3/types';
import PromiEvent from 'web3/promiEvent';
import Constants from './Constants';
import { RequestFactory } from '../types/web3-contracts/RequestFactory';

const NETWORK_TO_ADDRESSES_MAPPING = {
  42: AddressesJSONKovan,
  1002: AddressesJSONTest
};

export enum TemporalUnit {
  BLOCK = 1,
  TIME = 2
}

type Address = string;

const MINIMUM_WINDOW_SIZE_TIMESTAMP = new BigNumber(5 * 60); // 5 minutes
const MINIMUM_WINDOW_SIZE_BLOCK = new BigNumber(16); // 16 blocks

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

enum SchedulingParamsError {
  InsufficientEndowment,
  ReservedWindowBiggerThanExecutionWindow,
  InvalidTemporalUnit,
  ExecutionWindowTooSoon,
  CallGasTooHigh,
  EmptyToAddress
}

export default class EAC {
  private privateKey: string;
  private web3: Web3;

  constructor(web3: Web3, privateKey?: string) {
    this.web3 = web3;
    this.privateKey = privateKey;
  }

  public async computeEndowment(options: SchedulingOptions) {
    this.assertRequiredOptionsArePresent(options);
    options = await this.fillMissingOptions(options);

    const scheduler = await this.getScheduler(options.timestampScheduling);

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

  public async schedule(options: SchedulingOptions): Promise<TransactionReceipt> {
    this.assertRequiredOptionsArePresent(options);

    options = await this.fillMissingOptions(options);

    const scheduler = await this.getScheduler(options.timestampScheduling);

    const endowment = await this.computeEndowment(options);

    await this.validateScheduleOptions(options, endowment);

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

    return new Promise<TransactionReceipt>(resolve => {
      sentTx
        .on('receipt', receipt => {
          resolve(receipt);
        })
        .on('error', error => {
          throw error;
        });
    });
  }

  public getTxRequestFromReceipt(receipt: any) {
    const foundLog = receipt.logs.find((log: any) => log.topics[0] === Constants.NEWREQUESTLOG);

    return '0x'.concat(foundLog.data.slice(-40));
  }

  private async validateScheduleOptions(options: SchedulingOptions, endowment: string) {
    const addresses = await this.getContractsAddresses();
    const requestLib = new this.web3.eth.Contract(
      RequestFactoryABI,
      addresses.requestFactory
    ) as RequestFactory;

    const temporalUnit = options.timestampScheduling ? TemporalUnit.TIME : TemporalUnit.BLOCK;
    const freezePeriod = options.timestampScheduling ? 3 * 60 : 10; // 3 minutes or 10 blocks
    const reservedWindowSize = options.timestampScheduling ? 5 * 60 : 16; // 5 minutes or 16 blocks
    const claimWindowSize = options.timestampScheduling ? 60 * 60 : 255; // 60 minutes or 255 blocks

    const addressArgs = [
      options.from,
      '0x0000000000000000000000000000000000000000',
      options.toAddress
    ];

    const uintArgs = [
      options.fee.toString(),
      options.bounty.toString(),
      claimWindowSize,
      freezePeriod,
      reservedWindowSize,
      temporalUnit,
      options.windowSize.toString(),
      options.windowStart.toString(),
      options.callGas.toString(),
      options.callValue.toString(),
      options.gasPrice.toString(),
      options.requiredDeposit.toString()
    ];

    const paramsValidity = await requestLib.methods
      .validateRequestParams(addressArgs, uintArgs, endowment)
      .call();

    const errors = this.parseSchedulingParametersValidity(paramsValidity);

    if (errors.length > 0) {
      let errorMessage = 'Schedule params validation errors: ';

      errors.forEach((error, index) => {
        errorMessage += `\n\r${index + 1}. ${SchedulingParamsError[error.toString()]}`;
      });

      throw Error(errorMessage);
    }
  }

  private async getNetworkId() {
    return this.web3.eth.net.getId();
  }

  private parseSchedulingParametersValidity(paramsValidity: boolean[]) {
    const errorsIndexMapping = [
      SchedulingParamsError.InsufficientEndowment,
      SchedulingParamsError.ReservedWindowBiggerThanExecutionWindow,
      SchedulingParamsError.InvalidTemporalUnit,
      SchedulingParamsError.ExecutionWindowTooSoon,
      SchedulingParamsError.CallGasTooHigh,
      SchedulingParamsError.EmptyToAddress
    ];

    const errors: SchedulingParamsError[] = [];

    paramsValidity.forEach((boolIsTrue, index) => {
      if (!boolIsTrue) {
        errors.push(errorsIndexMapping[index]);
      }
    });

    return errors;
  }

  private async getContractsAddresses() {
    const netId = await this.getNetworkId();

    const addresses = NETWORK_TO_ADDRESSES_MAPPING[netId];

    if (!addresses) {
      throw Error(`Network with id: "${netId}" is not supported.`);
    }

    return addresses;
  }

  private async getScheduler(timestamp = true): Promise<SchedulerInterface> {
    const addresses = await this.getContractsAddresses();

    const address = timestamp ? addresses.timestampScheduler : addresses.blockScheduler;

    return new this.web3.eth.Contract(SchedulerInterfaceABI, address) as SchedulerInterface;
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
