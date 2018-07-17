var MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
var MiniMeToken = artifacts.require("MiniMeToken");
var Hashtag = artifacts.require("HashtagSimpleDeal.sol");

const hashtagMeta = "QmVFumDg1Ey6B1vaQbrPfh5EW1DbcW8yeFsbuYFiGUU381";
const hashtagCommission = 600000000000000000;


const parentToken = 0;
const parentSnapShotBlock = 0;
const tokenName = "Swarm City Token";
const decimalUnits = 18;
const tokenSymbol = "SWT";
const transfersEnabled = true;

module.exports = function(deployer) {
    // Deploy MiniMeTokenFactory
    return deployer.deploy(MiniMeTokenFactory)
    // Then, deploy MiniMeToken
    .then(() => deployer.deploy(
        // Token instance
        MiniMeToken,
        // Constructor arguments
        MiniMeTokenFactory.address,
        parentToken,
        parentSnapShotBlock,
        tokenName,
        decimalUnits,
        tokenSymbol,
        transfersEnabled
    ))
    // Then, deploy Hashtag contract
    .then(() => deployer.deploy(
        // Token instance
        Hashtag,
        // Constructor arguments
        MiniMeToken.address,
        "HashtagSimpleDealTest",
        hashtagCommission,
        hashtagMeta
    ));
};