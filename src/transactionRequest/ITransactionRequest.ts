import { BigNumber } from 'bignumber.js';

export interface ITransactionRequest extends ITransactionRequestPending {
  address: string;
  callValue: BigNumber;
  cancelData: string;
  claimedBy: string;
  claimWindowSize: BigNumber;
  fee: BigNumber;
  owner: string;
  requiredDeposit: BigNumber;
  toAddress: string;
  claimData: string;
  executeData: string;
  bounty: BigNumber;
  callGas: BigNumber;
  gasPrice: BigNumber;
  isCancelled: boolean;
  isClaimed: boolean;
  wasCalled: boolean;
  executionWindowEnd: BigNumber;
  temporalUnit: number;
  claimWindowStart: BigNumber;
  wasSuccessful: boolean;
  windowStart: BigNumber;
  windowSize: BigNumber;
  freezePeriod: BigNumber;
  reservedWindowSize: BigNumber;
  claimWindowEnd: BigNumber;
  freezePeriodEnd: BigNumber;
  reservedWindowEnd: BigNumber;

  afterExecutionWindow(): Promise<boolean>;
  callData(): Promise<string[]>;
  executedAt(): Promise<number>;
  fillData(): Promise<void>;
  refreshData(): Promise<void>;
  claimPaymentModifier(): Promise<BigNumber>;
  inReservedWindow(): Promise<boolean>;
  beforeClaimWindow(): Promise<boolean>;
  inClaimWindow(): Promise<boolean>;
  inFreezePeriod(): Promise<boolean>;
  inExecutionWindow(): Promise<boolean>;
  now(): Promise<BigNumber>;
  isClaimedBy(address: string): boolean;
}

export interface ITransactionRequestPending {
  address: string;
  gasPrice: BigNumber;
}

export interface ITransactionRequestRaw {
  address: string;
  params: string[];
}
