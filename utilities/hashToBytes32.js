const CID = require("cids");

function hashToBytes32(hash) {
  const cid = new CID(hash);
  const hashId = cid.multihash.slice(0, 2).toString("hex");
  const bytes32 = cid.multihash.slice(2).toString("hex");
  if (hashId !== "1220" || bytes32.length / 2 !== 32) {
    throw Error(`IPFS hash is not SHA-256 32 bytes: ${hashId} !== "1220"`);
  } else {
    return "0x" + bytes32;
  }
}

module.exports = hashToBytes32;
