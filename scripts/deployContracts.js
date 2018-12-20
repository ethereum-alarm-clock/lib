#!/usr/bin/env node

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require('path');
const fs = require('fs');

function relativePath(pathToAdd) {
  return path.join(__dirname, pathToAdd);
}

function getContractsDirectory() {
  const PATHS_TO_TEST = [
    relativePath('../node_modules/@ethereum-alarm-clock/contracts'),
    relativePath('../../contracts')
  ];

  for (const path of PATHS_TO_TEST) {
    if (fs.existsSync(path)) {
      return path;
    }
  }

  throw `Can't find @ethereum-alarm-clock/contracts directory`;
}

const CONTRACTS_DIRECTORY = getContractsDirectory();
const BUILT_CONTRACTS_DIRECTORY = path.join(CONTRACTS_DIRECTORY, 'build/contracts');

async function executeCommand(command, directory) {
  const options = {};

  if (directory) {
    options.cwd = directory;
  }

  try {
    const { stdout, stderr } = await exec(command, options);

    console.log(stdout);
    console.error(stderr);
  } catch (error) {
    if (error && error.stdout) {
      console.error(error.stdout);
    } else {
      console.error(error);
    }
  }
}

function removeIfExists(pathToFile) {
  if (fs.existsSync(pathToFile)) {
    fs.unlinkSync(pathToFile);
  }
}

async function deployContracts() {
  console.log('Deploying contracts...');

  await executeCommand('npm run clean', CONTRACTS_DIRECTORY)
  await executeCommand('npm run migrate-reset', CONTRACTS_DIRECTORY)

  console.log('Moving the generated addresses files...');

  removeIfExists(relativePath('../config/contracts/1002.json'));

  await executeCommand(`node extractContractsInfo.js development "${BUILT_CONTRACTS_DIRECTORY}"`, relativePath(''));

  console.log('Done.');
}

deployContracts();
