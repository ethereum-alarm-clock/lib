import { BigNumber } from 'bignumber.js';

export interface ITransactionRequest {
  address: string;
  claimedBy: string;
  requiredDeposit: BigNumber;
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
  windowStart: BigNumber;
  windowSize: BigNumber;
  freezePeriod: BigNumber;
  reservedWindowSize: BigNumber;
  claimWindowEnd: BigNumber;
  freezePeriodEnd: BigNumber;
  reservedWindowEnd: BigNumber;

  refreshData(): Promise<any>;
  claimPaymentModifier(): Promise<BigNumber>;
  inReservedWindow(): Promise<boolean>;
  beforeClaimWindow(): Promise<boolean>;
  inClaimWindow(): Promise<boolean>;
  inFreezePeriod(): Promise<boolean>;
  inExecutionWindow(): Promise<boolean>;
  now(): Promise<BigNumber>;
  isClaimedBy(address: string): boolean;
}
