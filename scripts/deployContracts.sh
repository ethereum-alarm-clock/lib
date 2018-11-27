#!/bin/bash
echo "Deploying contracts..."
cd node_modules/@ethereum-alarm-clock/contracts
truffle network --clean
truffle migrate --reset
cd ../../../

echo "Moving the generated contract files..."
rm config/contracts/test.json

node scripts/extractContractsInfo.js development

echo "Done."