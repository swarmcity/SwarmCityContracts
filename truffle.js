// var HDWalletProvider = require("truffle-hdwallet-provider");

// var mnemonic = "";
// var provider = new HDWalletProvider(mnemonic, "https://ropsten.infura.io/");

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 7545,
      network_id: "42",
      gas: 8000000
    },
    live: {
      host: "localhost",
      port: 68545,
      network_id: "1"   // Match any network id
    },
    // ropsten: {
    //       provider: provider,
    //       network_id: 3 // official id of the ropsten network
    // }
  }
};
