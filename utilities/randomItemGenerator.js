const hashToBytes32 = require("./hashToBytes32");
const getRandomItemDescription = require("./getRandomItemDescription");
const ipfsClient = require("ipfs-http-client");
const ipfs = ipfsClient({ host: "ipfs.infura.io", protocol: "https" });

const maxItemValue = 10;

async function ipfsAdd(obj) {
  const content = Buffer.from(JSON.stringify(obj));
  const results = await ipfs.add(content);
  return hashToBytes32(results[0].hash); // "Qm...WW"
}

async function randomItemGenerator() {
  const itemValue = Math.ceil(maxItemValue * Math.random());

  // Generate a random description
  const description = getRandomItemDescription();
  const metadata = {
    description
  };
  const itemMetadataHash = await ipfsAdd(metadata); // bytes32
  return {
    itemMetadataHash,
    itemValue
  };
}

module.exports = randomItemGenerator;
