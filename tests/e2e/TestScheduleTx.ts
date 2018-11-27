import BigNumber from 'bignumber.js';
import { expect } from 'chai';
import { providerUrl } from '../helpers';
import { W3Util, EAC } from '../../src';
import { getHelperMethods } from '../helpers/Helpers';

const web3 = W3Util.getWeb3FromProviderUrl(providerUrl);
const util = new W3Util(web3);

export const SCHEDULED_TX_PARAMS = {
  callValue: new BigNumber(Math.pow(10, 18))
};

export const scheduleTestTx = async (blocksInFuture = 270) => {
  const eac = new EAC(web3);

  const { callValue } = SCHEDULED_TX_PARAMS;

  const callGas = new BigNumber(1000000);

  const accounts = await new Promise((resolve: any) => {
    // tslint:disable
    web3.eth.getAccounts((_error, result) => resolve(result));
    // tslint:enable
  });
  const mainAccount = accounts[0];
  const secondaryAccount = accounts[1];

  const windowStart = new BigNumber((await util.getBlockNumber()) + blocksInFuture);

  const receipt = await eac.schedule({
    from: mainAccount,
    toAddress: secondaryAccount,
    timestampScheduling: false,
    callGas,
    callValue,
    windowStart
  });

  return receipt;
};

describe('ScheduleTx', () => {
  it('schedules a basic transaction', async () => {
    const { withSnapshotRevert } = getHelperMethods(web3);

    await withSnapshotRevert(async () => {
      const receipt = await scheduleTestTx();

      expect(receipt.status).to.equal(true);

      expect(receipt).to.exist; // tslint:disable-line no-unused-expression
    });
  }).timeout(20000);
});
