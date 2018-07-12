var MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
var MiniMeToken = artifacts.require("MiniMeToken");
var Hashtag = artifacts.require("HashtagSimpleDeal.sol");
var utility = require('../utility.js')();
const ethUtil = require('ethereumjs-util');
const ethCrypto = require('eth-crypto');

contract('HashtagSimpleDeal', (accounts) => {

    var miniMeTokenFactory;
    var swtToken;
    var payoutaddress = accounts[4];
    var seeker = accounts[1];
    var provider = accounts[2];
    var hashtagMeta = "QmVFumDg1Ey6B1vaQbrPfh5EW1DbcW8yeFsbuYFiGUU381";
    var hashtagCommission = 600000000000000000;
    var itemId = "abc";
    var privateKey1 = "23101c653848e6a516cb4af59d483af9060b29bb438425d38078b4a3378d4211";
    var itemValue = 1200000000000000000;
    var itemIpfs = "QmPsUmJTEHEHtPetyFsKaarwVWwBMJiYhvcLEQz5kWAJZX";

    describe('Deploy MiniMeTokenFactory', function () {
        it("should deploy MiniMeTokenFactory contract", function (done) {
            MiniMeTokenFactory.new().then(function (_miniMeTokenFactory) {
                assert.ok(_miniMeTokenFactory.address);
                miniMeTokenFactory = _miniMeTokenFactory;
                done();
            });
        });
    });

    describe('Deploy SWT (test) Token', function () {
        it("should deploy a MiniMeToken contract", function (done) {
            MiniMeToken.new(
                miniMeTokenFactory.address,
                0,
                0,
                "Swarm City Token",
                18,
                "SWT",
                true
            ).then(function (_miniMeToken) {
                assert.ok(_miniMeToken.address);
                swtToken = _miniMeToken;
                done();
            });
        });

        it("should mint SWT tokens for Seeker", function(done) {
            swtToken.generateTokens(seeker, 100e18).then(function() {
                done();
            });
        });
  
        it("should see token balance Seeker account", function(done) {
            swtToken.balanceOf(seeker).then(function(balance) {
                assert.equal(balance.toNumber(), 100e18, "Seeker balance not correct after swt minting");
                done();
            });
        });
    
        it("should mint SWT tokens for Provider", function(done) {
            swtToken.generateTokens(provider, 100e18).then(function() {
                done();
            });
        });
  
        it("should see token balance Provider account", function(done) {
            swtToken.balanceOf(provider).then(function(balance) {
                assert.equal(balance.toNumber(), 100e18, "Provider balance not correct after swt minting");
                done();
            });
        });
    });

    describe('Hashtag Simple Deal creation flow', function() {
        it("should deploy 'BoardWalkV2Test' Hashtag", function(done) {
            Hashtag.new(swtToken.address, "HashtagSimpleDealTest", hashtagCommission, hashtagMeta).then(function(instance) {
                hashtagContract = instance;
                assert.isNotNull(hashtagContract);
                done();
            });
        });

        it("should set payout address to address[4]", function(done) {
            hashtagContract.setPayoutAddress(payoutaddress, {
              gas: 4700000,
              from: accounts[0]
            }).then(function(res) {
                done();
            });
        });
      
        it("should verify the payout address of the Simple Deal hashtag", function(done) {
            hashtagContract.payoutAddress.call().then(function(result) {
                assert.equal(result, payoutaddress, "Payout address not set");
                done();
            });
        });
      
        it("should verify the commission of the Simple Deal hashtag", function(done) {
            hashtagContract.hashtagFee.call().then(function(result) {
                assert.equal(result.toNumber(), hashtagCommission, "Commission value not set");
                done();
            });
        });
    });

    describe('Deal making and payout flow', function () {
        it("Create a new deal on the hashtag contract", function(done) {
            var itemHash = web3.sha3(itemId);

            var sig = ethUtil.ecsign(new Buffer(itemHash.slice(2), 'hex'), new Buffer(privateKey1, 'hex'));

            const v = sig.v;
            const r = `0x${sig.r.toString('hex')}`;
            const s = `0x${sig.s.toString('hex')}`;

            var requestValue = itemValue + hashtagCommission / 2;

            var c = web3.eth.contract(hashtagContract.abi);
            var hashtagContractInstance = c.at(hashtagContract.address);

            var txdata = hashtagContractInstance.makeDealForTwo.getData(itemHash, itemValue, itemIpfs, v, r, s, {
                from: seeker,
            });

            // txdata: 0x8f142ce94e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c4500000000000000000000000000000000000000000000000010a741a46278000000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000001b811e87718179f6fbc44862e68ff81fed75902c575f6b999dfb2fa300b09ce7f53ff4ffcbd60dd10f3064645a5180b77d2c763138afd42ed320c42e1745b40bcc000000000000000000000000000000000000000000000000000000000000002e516d5073556d4a5445484548745065747946734b61617277565777424d4a69596876634c45517a356b57414a5a58000000000000000000000000000000000000
            
            var t = web3.eth.contract(MiniMeToken.abi);
            var swtTokenInstance = t.at(swtToken.address);

            swtTokenInstance.approveAndCall(hashtagContract.address, requestValue, txdata, {
                from: seeker,
                gas: 4700000
             }).then(function(res) {
                done();
             });
        });
    });
});
