const args = process.argv.slice(2);

/**
 * args[0] - network
 * args[1] - contracts' artifacts path
 */

let artifactsDir = `${__dirname}/../node_modules/@ethereum-alarm-clock/contracts/build/contracts`;

if (args && args[1]) {
  artifactsDir = args[1];
}

const contractsJSONDestination = `${__dirname}/../config/contracts/1002.json`;
const fs = require('fs');
const path = require('path');

const networks = {
  'mainnet': 1,
  'ropsten': 3,
  'rinkeby': 4,
  'kovan': 42,
  'development': 1002
};

const networkId = networks[args[0]];

const contracts = {}

fs.readdir(artifactsDir, (err, files) => {
  files.forEach(file => {
    const contractName = uncapitalize(file.split('.json')[0]);

    const filePath = path.join(artifactsDir, file)
    const content = fs.readFileSync(filePath)
    const parsedContent = JSON.parse(content)

    if (parsedContent.networks[networkId] && contractName !== 'migrations') {
      const address = parsedContent.networks[networkId].address;
      contracts[contractName] = address;
    }
  });

  fs.writeFileSync(contractsJSONDestination, JSON.stringify(contracts));
})

function uncapitalize(text) {
  return text.charAt(0).toLowerCase() + text.substr(1);
}
