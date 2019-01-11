import BigNumber from 'bignumber.js';
import TransactionRequestData from './TransactionRequestData';
import Constants from '../Constants';
import Util from '../utils/Util';
import Web3 = require('web3');
import TransactionRequestCoreABI from '../abi/TransactionRequestCoreABI';
import { TransactionRequestCore } from '../../types/web3-contracts/TransactionRequestCore';
import { TemporalUnit } from '../eac';
import { EventLog } from 'web3/types';
import { ITransactionRequest } from './ITransactionRequest';

interface ExecutedEvent {
  blockNumber: number;
  bounty: number;
  fee: number;
  estimatedGas: number;
}

export default class TransactionRequest implements ITransactionRequest {
  private data: TransactionRequestData;
  private instance: TransactionRequestCore;
  private web3: Web3;
  private util: Util;

  constructor(address: string, web3: Web3) {
    this.util = new Util(web3);

    if (!this.util.isNotNullAddress(address)) {
      throw new Error('Attempted to instantiate a TxRequest class from a null address.');
    }

    this.web3 = web3;

    this.instance = new this.web3.eth.Contract(
      TransactionRequestCoreABI,
      address
    ) as TransactionRequestCore;
  }

  get address(): string {
    return this.instance._address.toLowerCase();
  }

  /**
   * Window centric getters
   */

  get claimWindowSize(): BigNumber {
    this.checkData();

    return this.data.schedule.claimWindowSize;
  }

  get claimWindowStart() {
    this.checkData();
    return this.windowStart.minus(this.freezePeriod).minus(this.claimWindowSize);
  }

  get claimWindowEnd() {
    this.checkData();
    return this.claimWindowStart.plus(this.claimWindowSize);
  }

  get freezePeriod() {
    this.checkData();
    return this.data.schedule.freezePeriod;
  }

  get freezePeriodStart() {
    this.checkData();
    return this.windowStart.plus(this.claimWindowSize);
  }

  get freezePeriodEnd() {
    this.checkData();
    return this.claimWindowEnd.plus(this.freezePeriod);
  }

  get temporalUnit(): TemporalUnit {
    this.checkData();
    return this.data.schedule.temporalUnit;
  }

  get windowSize() {
    this.checkData();
    return this.data.schedule.windowSize;
  }

  get windowStart() {
    this.checkData();
    return this.data.schedule.windowStart;
  }

  get reservedWindowSize() {
    this.checkData();
    return this.data.schedule.reservedWindowSize;
  }

  get reservedWindowEnd() {
    this.checkData();
    return this.windowStart.plus(this.reservedWindowSize);
  }

  get executionWindowEnd() {
    this.checkData();
    return this.windowStart.plus(this.windowSize);
  }

  /**
   * Dynamic getters
   */

  public async beforeClaimWindow() {
    const now = await this.now();
    return this.claimWindowStart.isGreaterThan(now);
  }

  public async inClaimWindow() {
    const now = await this.now();
    return this.claimWindowStart.isLessThanOrEqualTo(now) && this.claimWindowEnd.isGreaterThan(now);
  }

  public async inFreezePeriod() {
    const now = await this.now();
    return this.claimWindowEnd.isLessThanOrEqualTo(now) && this.freezePeriodEnd.isGreaterThan(now);
  }

  public async inExecutionWindow() {
    const now = await this.now();
    return (
      this.windowStart.isLessThanOrEqualTo(now) &&
      this.executionWindowEnd.isGreaterThanOrEqualTo(now)
    );
  }

  public async inReservedWindow() {
    const now = await this.now();
    return this.windowStart.isLessThanOrEqualTo(now) && this.reservedWindowEnd.isGreaterThan(now);
  }

  public async afterExecutionWindow() {
    const now = await this.now();
    return this.executionWindowEnd.isLessThan(now);
  }

  public async executedAt() {
    return (await this.getExecutedEvent()).blockNumber;
  }

  public getBucket(): number {
    let sign = -1;
    let bucketSize = 240;

    if (this.temporalUnit === TemporalUnit.TIME) {
      bucketSize = 3600;
      sign = 1;
    }

    return sign * this.windowStart.toNumber() - (this.windowStart.toNumber() % bucketSize);
  }

  /**
   * Claim props/methods
   */

  get claimedBy(): string {
    this.checkData();

    return this.data.claimData.claimedBy.toLowerCase();
  }

  get isClaimed() {
    this.checkData();
    return this.data.claimData.claimedBy !== Constants.NULL_ADDRESS;
  }

  public isClaimedBy(address: string) {
    this.checkData();
    return this.claimedBy === address;
  }

  get requiredDeposit() {
    this.checkData();
    return this.data.claimData.requiredDeposit;
  }

  public async claimPaymentModifier(): Promise<BigNumber> {
    // If the data is not filled it will cause errors.
    if (!this.data.claimData.paymentModifier) {
      await this.refreshData();
    }

    // TxRequest is claimed and already has a set paymentModifier.
    if (this.isClaimed) {
      return new BigNumber(this.data.claimData.paymentModifier);
    }

    // TxRequest is unclaimed so paymentModifier is calculated.
    const now = await this.now();
    const elapsed = now.minus(this.claimWindowStart);
    return elapsed.times(100).dividedToIntegerBy(this.claimWindowSize);
  }

  public async now(): Promise<BigNumber> {
    // If being called with an empty temporal unit the data needs to be filled.
    if (!this.temporalUnit) {
      await this.refreshData();
    }

    if (this.temporalUnit === TemporalUnit.BLOCK) {
      // The reason for the `plus(1)` here is that the next block to be mined
      // is for all intents and purposes the `now` since the soonest this transaction
      // could be included is alongside it.
      return new BigNumber(await this.web3.eth.getBlockNumber()).plus(1);
    }

    if (this.temporalUnit === TemporalUnit.TIME) {
      const timestamp = new BigNumber((await this.web3.eth.getBlock('latest')).timestamp);
      const local = new BigNumber(Math.floor(new Date().getTime() / 1000));

      return local.gt(timestamp) ? local : timestamp;
    }

    throw new Error(`[${this.address}] Unrecognized temporal unit: ${this.temporalUnit}`);
  }

  /**
   * Meta
   */
  get isCancelled() {
    this.checkData();
    return this.data.meta.isCancelled;
  }

  get wasCalled() {
    this.checkData();
    return this.data.meta.wasCalled;
  }

  get wasSuccessful() {
    this.checkData();
    return this.data.meta.wasSuccessful;
  }

  get owner() {
    this.checkData();

    return this.data.meta.owner.toLowerCase();
  }

  /**
   * TxData
   */

  get toAddress() {
    this.checkData();
    return this.data.txData.toAddress && this.data.txData.toAddress.toLowerCase();
  }

  get callGas() {
    this.checkData();
    return this.data.txData.callGas;
  }

  get callValue() {
    this.checkData();
    return this.data.txData.callValue;
  }

  get gasPrice() {
    this.checkData();
    return this.data.txData.gasPrice;
  }

  get fee() {
    this.checkData();
    return this.data.paymentData.fee;
  }

  get bounty() {
    this.checkData();
    return this.data.paymentData.bounty;
  }

  public async callData() {
    return this.instance.methods.callData().call();
  }

  /**
   * Data management
   */

  public async fillData(): Promise<void> {
    const requestData = await TransactionRequestData.from(this.instance);
    this.data = requestData;
  }

  public async refreshData(): Promise<void> {
    if (!this.data) {
      return this.fillData();
    }

    return this.data.refresh();
  }

  /**
   * ABI convenience functions
   */

  public get claimData() {
    return this.instance.methods.claim().encodeABI();
  }

  public get executeData() {
    return this.instance.methods.execute().encodeABI();
  }

  public get cancelData() {
    return this.instance.methods.cancel().encodeABI();
  }

  /**
   * Error handling
   */
  private checkData() {
    if (!this.data) {
      throw new Error(
        'Data has not been filled! Please call `txRequest.fillData()` before using this method.'
      );
    }
  }

  private async getExecutedEvent(): Promise<ExecutedEvent> {
    if (!this.wasCalled) {
      return {
        blockNumber: 0,
        bounty: 0,
        fee: 0,
        estimatedGas: 0
      };
    }

    const events = this.instance.events.allEvents({ fromBlock: 0 });

    return new Promise<ExecutedEvent>((resolve, reject) => {
      events.on('event', (error: Error, logs: EventLog[]) => {
        if (error) {
          return reject(error);
        }

        const Executed = logs.filter(
          log =>
            log.raw.topics[0] ===
            '0x3e504bb8b225ad41f613b0c3c4205cdd752d1615b4d77cd1773417282fcfb5d9'
        );

        resolve({
          blockNumber: Executed[0].blockNumber,
          bounty: this.web3.utils.toDecimal('0x' + Executed[0].raw.data.slice(2, 66)),
          fee: this.web3.utils.toDecimal('0x' + Executed[0].raw.data.slice(67, 130)),
          estimatedGas: this.web3.utils.toDecimal('0x' + Executed[0].raw.data.slice(131, 194))
        });
      });
    });
  }
}
