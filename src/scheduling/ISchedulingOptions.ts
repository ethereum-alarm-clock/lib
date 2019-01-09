import BigNumber from 'bignumber.js';

type Address = string;

export default interface ISchedulingOptions {
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
