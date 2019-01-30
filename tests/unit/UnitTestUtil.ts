import { expect, assert } from 'chai';
import { Util } from '../../src';
import { providerUrl } from '../helpers';
import BigNumber from 'bignumber.js';

describe('Util Unit Tests', async () => {
  const web3 = Util.getWeb3FromProviderUrl(providerUrl);

  const util: Util = new Util(web3);

  describe('getAverageBlockTime()', () => {
    it('returns the average blocktime of last 100 blocks', async () => {
      const avgBlockTime = await util.getAverageBlockTime();
      assert.isNumber(avgBlockTime);
      assert.isAbove(avgBlockTime, 0);
    });
  });

  describe('getBlock()', () => {
    it('returns a error when no block found for block number', async () => {
      const blockNumber = 1000000000;
      let err: Error;

      try {
        await util.getBlock(blockNumber);
      } catch (e) {
        err = e;
      }

      expect(err.message).to.equal(`Returned block ${blockNumber} is null`);
    });
  });

  describe('isWatchingEnabled()', () => {
    it('returns true when watching', async () => {
      const watching = await Util.isWatchingEnabled(web3);
      assert.isTrue(watching);
    });
  });

  describe('estimateMaximumExecutionGasPrice()', () => {
    it('estimates gasPrice > current gas price when bounty is higher than costs', () => {
      const bounty = new BigNumber(web3.utils.toWei('0.02', 'ether'));
      const gasPrice = new BigNumber(web3.utils.toWei('2', 'gwei'));
      const callGas = new BigNumber(21000);

      const estimation = Util.estimateMaximumExecutionGasPrice(bounty, gasPrice, callGas);

      assert.isTrue(estimation.isGreaterThan(gasPrice));
    });
  });
});
