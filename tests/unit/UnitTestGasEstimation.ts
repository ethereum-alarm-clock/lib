import { assert } from 'chai';
import BigNumber from 'bignumber.js';
import { BlockScaleFetchingService } from '../../src/utils/GasEstimation/BlockScaleFetchingService';
import { EthGasStationFetchingService } from '../../src/utils/GasEstimation/EthGasStationFetchingService';
import { Util } from '../../src';
import { providerUrl } from '../helpers';

describe('Gas Price Estimation Tests', async () => {
  const gasPriceValues = ['average', 'fast', 'fastest', 'safeLow'];
  const web3 = Util.getWeb3FromProviderUrl(providerUrl);

  describe('BlockScaleFetchingService', async () => {
    const blockscale = new BlockScaleFetchingService();
    const result = await blockscale.fetchGasPrice();

    Object.keys(result).forEach(field => {
      assert.isTrue(result[field] instanceof BigNumber, `${field} is not a BigNumber!`);
    });

    gasPriceValues.forEach(value => {
      assert.isTrue(new BigNumber(result[value]).isGreaterThan(web3.utils.toWei('0.05', 'gwei')));
    });

    assert.isTrue(result.safeLow.isLessThanOrEqualTo(result.average));
    assert.isTrue(result.average.isLessThanOrEqualTo(result.fast));
    assert.isTrue(result.fast.isLessThanOrEqualTo(result.fastest));
  });

  describe('EthGasStationFetchingService', async () => {
    const ethGasStaion = new EthGasStationFetchingService();

    const result = await ethGasStaion.fetchGasPrice();

    Object.keys(result).forEach(field => {
      assert.isTrue(result[field] instanceof BigNumber, `${field} is not a BigNumber!`);
    });

    gasPriceValues.forEach(value => {
      assert.isTrue(new BigNumber(result[value]).isGreaterThan(web3.utils.toWei('0.05', 'gwei')));
    });

    assert.isTrue(result.safeLow.isLessThanOrEqualTo(result.average));
    assert.isTrue(result.average.isLessThanOrEqualTo(result.fast));
    assert.isTrue(result.fast.isLessThanOrEqualTo(result.fastest));
  });
});
