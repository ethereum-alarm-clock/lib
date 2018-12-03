import BigNumber from 'bignumber.js';
import { expect } from 'chai';
import { providerUrl } from '../helpers';
import { EAC, Util } from '../../src';
import {
  DEFAULT_BOUNTY,
  CLAIM_WINDOW_SIZE_BLOCK,
  DEFAULT_GAS_PRICE,
  TemporalUnit,
  DEFAULT_WINDOW_SIZE_BLOCK
} from '../../src/eac';
import Constants from '../../src/Constants';

const web3 = Util.getWeb3FromProviderUrl(providerUrl);
const eac = new EAC(web3);

const EXAMPLE_CALL_VALUE = new BigNumber(Math.pow(10, 18)); // 1 ether
const EXAMPLE_CALL_GAS = new BigNumber(1000000);

let mainAccount: string;
let secondaryAccount: string;

export const scheduleTestTx = async (blocksInFuture = 270) => {
  const accounts = await new Promise<string[]>(resolve => {
    // tslint:disable
    web3.eth.getAccounts((_error, result) => resolve(result));
    // tslint:enable
  });

  mainAccount = accounts[0].toLowerCase();
  secondaryAccount = accounts[1].toLowerCase();

  const windowStart = new BigNumber((await web3.eth.getBlockNumber()) + blocksInFuture);

  const receipt = await eac.schedule({
    from: mainAccount,
    toAddress: secondaryAccount,
    timestampScheduling: false,
    callGas: EXAMPLE_CALL_GAS,
    callValue: EXAMPLE_CALL_VALUE,
    windowStart
  });

  return receipt;
};

describe('ScheduleTx', () => {
  it('schedules a basic transaction', async () => {
    const blocksInFuture = 270;

    const windowStart = new BigNumber((await web3.eth.getBlockNumber()) + blocksInFuture);

    const receipt = await scheduleTestTx();

    expect(receipt.status).to.equal(true);

    const tx = eac.transactionRequestFromReceipt(receipt);

    await tx.fillData();

    expect(tx.address.length).to.equal(42);
    expect(await tx.beforeClaimWindow()).to.equal(true);
    expect(await tx.callData()).to.equal('0x00');
    expect(tx.callGas.toString()).to.equal(EXAMPLE_CALL_GAS.toString());
    expect(tx.cancelData).to.equal('0xea8a1af0');
    expect(tx.claimData).to.equal('0x4e71d92d');
    expect((await tx.claimPaymentModifier()).toString()).to.equal('-1');
    expect(tx.claimWindowSize.toNumber()).to.equal(CLAIM_WINDOW_SIZE_BLOCK);
    expect(tx.claimedBy).to.equal(Constants.NULL_ADDRESS);
    expect(tx.executeData).to.equal('0x61461954');
    expect(await tx.executedAt()).to.equal(0);
    expect(tx.fee.toNumber()).to.equal(0);
    expect(tx.freezePeriod.toNumber()).to.equal(10);
    expect(tx.gasPrice.toString()).to.equal(DEFAULT_GAS_PRICE.toString());
    expect(await tx.inClaimWindow()).to.equal(false);
    expect(await tx.inExecutionWindow()).to.equal(false);
    expect(await tx.inFreezePeriod()).to.equal(false);
    expect(await tx.inReservedWindow()).to.equal(false);
    expect(tx.isCancelled).to.equal(false);
    expect(tx.isClaimed).to.equal(false);
    expect(tx.owner).to.equal(mainAccount, 'owner is main account');
    expect(tx.requiredDeposit.toString()).to.equal('0');
    expect(tx.temporalUnit).to.equal(TemporalUnit.BLOCK);
    expect(tx.toAddress).to.equal(secondaryAccount, 'to account is secondary account');
    expect(tx.wasCalled).to.equal(false);
    expect(tx.wasSuccessful).to.equal(false);
    expect(tx.windowSize.toString()).to.equal(DEFAULT_WINDOW_SIZE_BLOCK.toString());
    expect(tx.windowStart.toString()).to.equal(windowStart.toString());
    expect(await tx.afterExecutionWindow()).to.equal(false);
    expect(tx.bounty.toString()).to.equal(DEFAULT_BOUNTY.toString());
    expect(tx.callValue.toString()).to.equal(EXAMPLE_CALL_VALUE.toString());
  }).timeout(20000);
});
