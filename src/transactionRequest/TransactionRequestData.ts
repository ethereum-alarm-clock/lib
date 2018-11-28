import BigNumber from 'bignumber.js';
import { TemporalUnit } from '../eac';
import {
  TransactionRequestCore,
  TransactionRequestCoreRawData
} from '../../types/web3-contracts/TransactionRequestCore';

interface TransactionRequestScheduleData {
  claimWindowSize: BigNumber;
  freezePeriod: BigNumber;
  reservedWindowSize: BigNumber;
  temporalUnit: TemporalUnit;
  windowSize: BigNumber;
  windowStart: BigNumber;
}

interface TransactionRequestClaimData {
  claimedBy: string;
  claimDeposit: BigNumber;
  paymentModifier: number;
  requiredDeposit: BigNumber;
}

interface TransactionRequestTransferData {
  callGas: BigNumber;
  callValue: BigNumber;
  gasPrice: BigNumber;
  toAddress: string;
}

interface TransactionRequestMetaData {
  createdBy: string;
  owner: string;
  isCancelled: boolean;
  wasCalled: boolean;
  wasSuccessful: boolean;
}

export interface TransactionRequestPaymentData {
  feeRecipient: string;
  bountyBenefactor: string;
  fee: BigNumber;
  feeOwed: BigNumber;
  bounty: BigNumber;
  bountyOwed: BigNumber;
}

export default class TransactionRequestData {
  public static async from(txRequest: TransactionRequestCore): Promise<TransactionRequestData> {
    const data = await txRequest.methods.requestData().call();

    return new TransactionRequestData(data, txRequest);
  }

  public claimData: TransactionRequestClaimData;
  public meta: TransactionRequestMetaData;
  public paymentData: TransactionRequestPaymentData;
  public schedule: TransactionRequestScheduleData;
  public txData: TransactionRequestTransferData;
  public txRequest: TransactionRequestCore;

  constructor(data: TransactionRequestCoreRawData, txRequest: TransactionRequestCore) {
    if (typeof data === 'undefined' || typeof txRequest === 'undefined') {
      throw new Error('Cannot call the constructor directly.');
    }

    this.txRequest = txRequest;
    this.fill(data);
  }

  public fill(data: TransactionRequestCoreRawData) {
    this.claimData = {
      claimedBy: data[0][0],
      claimDeposit: new BigNumber(data[2][0]),
      paymentModifier: parseInt(data[3][0], 10),
      requiredDeposit: new BigNumber(data[2][14])
    };

    this.meta = {
      createdBy: data[0][1],
      owner: data[0][2],
      isCancelled: data[1][0],
      wasCalled: data[1][1],
      wasSuccessful: data[1][2]
    };

    this.paymentData = {
      feeRecipient: data[0][3],
      bountyBenefactor: data[0][4],
      fee: new BigNumber(data[2][1]),
      feeOwed: new BigNumber(data[2][2]),
      bounty: new BigNumber(data[2][3]),
      bountyOwed: new BigNumber(data[2][4])
    };

    this.schedule = {
      claimWindowSize: new BigNumber(data[2][5]),
      freezePeriod: new BigNumber(data[2][6]),
      reservedWindowSize: new BigNumber(data[2][7]),
      temporalUnit: parseInt(data[2][8], 10),
      windowSize: new BigNumber(data[2][9]),
      windowStart: new BigNumber(data[2][10])
    };

    this.txData = {
      callGas: new BigNumber(data[2][11]),
      callValue: new BigNumber(data[2][12]),
      gasPrice: new BigNumber(data[2][13]),
      toAddress: data[0][5]
    };
  }

  public async refresh() {
    const data = await this.txRequest.methods.requestData().call();

    this.fill(data);
  }
}
