#!/bin/bash

CWD="$( cd "$(dirname "$0")" ; pwd -P )"
LIB_DIR=$CWD/../
CONTRACTS_DIR=$CWD/../node_modules/@ethereum-alarm-clock/contracts
TEST_ASSETS_FILE=$LIB_DIR/config/contracts/1002.json

if [ ! -d "$CONTRACTS_DIR" ]; then
    CONTRACTS_DIR=$CWD/../../contracts
fi

echo "Deploying contracts..."
cd "$CONTRACTS_DIR"
npm run clean
npm run migrate-reset
cd "$LIB_DIR"

echo "Moving the generated contract files..."

if [ -f "$TEST_ASSETS_FILE" ]; then
    rm "$TEST_ASSETS_FILE"
fi

echo "$LIB_DIR/scripts/extractContractsInfo.js"

node "$LIB_DIR/scripts/extractContractsInfo.js" development "$CONTRACTS_DIR/build/contracts"

echo "Done."
