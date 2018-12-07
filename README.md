[<img src="https://s3.amazonaws.com/chronologic.network/ChronoLogic_logo.svg" width="128px">](https://github.com/chronologic)

[![npm version](https://badge.fury.io/js/%40ethereum-alarm-clock%2Flib.svg)](https://badge.fury.io/js/%40ethereum-alarm-clock%2Flib)
[![Build Status](https://travis-ci.org/ethereum-alarm-clock/lib.svg?branch=master)](https://travis-ci.org/ethereum-alarm-clock/lib)
[![Greenkeeper badge](https://badges.greenkeeper.io/ethereum-alarm-clock/lib.svg)](https://greenkeeper.io/)
[![Coverage Status](https://coveralls.io/repos/github/ethereum-alarm-clock/lib/badge.svg?branch=master)](https://coveralls.io/github/ethereum-alarm-clock/lib?branch=master)

# lib

This package contains all of the key logic necessary for the interacting with the [Ethereum Alarm Clock](https://github.com/ethereum-alarm-clock/ethereum-alarm-clock) contracts.

## Contribute

If you would like to hack on `lib` or notice a bug, please open an issue or come find us on the Ethereum Alarm Clock Gitter channel and tell us. If you're feeling more ambitious and would like to contribute directly via a pull request, that's cool too. We will review all pull requests and issues opened on this repository. Even if you think something isn't working right or that it should work another way, we would really appreciate if you helped us by opening an issue!

## How to Build

If you decide to contribute then you will be working on the TypeScript files in the `src/` directory. However, we don't export these files to the world, but we transpile them down to ES5 first. We do this by initiating the TypeScript compiler.

But, you can use the scripts provided in the `package.json` file to help you build the files.

```
npm run build
```

It will produce an `index.js` file which can be imported into any project and used.

## Test
```
npm run ganache
./scripts/deployContracts.sh
npm run test
```

## How to Lint

Initiate linting process by calling:

```
npm run lint
```

## Want more?

This package is a part of EAC family ~
* [lib](https://github.com/ethereum-alarm-clock/lib)
* [timenode-core](https://github.com/ethereum-alarm-clock/timenode-core)
* [cli](https://github.com/ethereum-alarm-clock/cli)
