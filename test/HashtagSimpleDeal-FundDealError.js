var chai = require('chai');  
var expect = chai.expect;    // Using Expect style

var MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
var MiniMeToken = artifacts.require("MiniMeToken");
var HashtagSimpleDeal = artifacts.require("HashtagSimpleDeal.sol");
var utility = require('../utility.js')();
const ethUtil = require('ethereumjs-util');
const ethCrypto = require('eth-crypto');

contract('HashtagSimpleDeal', (accounts) => {

    const payoutaddress = accounts[4];
    const seeker = accounts[1];
    const provider = accounts[2];
    const tokenAmount = 100e18;
    const hashtagMeta = "QmVFumDg1Ey6B1vaQbrPfh5EW1DbcW8yeFsbuYFiGUU381";
    const hashtagCommission = 600000000000000000;
    const itemId = "abc";
    const privateKey1 = "7a66a08362e3f762de3635a753d7cedb06c8bc35d617f273082a365c12a3be86";
    const itemIpfs = "QmPsUmJTEHEHtPetyFsKaarwVWwBMJiYhvcLEQz5kWAJZX";

    describe('SWT Token interaction (give tokens to participants)', function () {

        const accounts = {
            seeker,
            provider
        }

        for (const user in accounts) {
            const account = accounts[user];
            it("should mint SWT tokens for "+user, async () => {
                let miniMeToken = await MiniMeToken.deployed();
                await miniMeToken.generateTokens(account, tokenAmount)
                let balance = await miniMeToken.balanceOf(account);
                assert.equal(balance.toNumber(), tokenAmount, 
                    user+" balance not correct after swt minting");
            });
        }
    });

    describe('Hashtag Simple Deal creation flow', function() {
      
        it("should verify the commission of the Simple Deal hashtag", async () => {
            let hashtagSimpleDeal = await HashtagSimpleDeal.deployed();
            let fee = await hashtagSimpleDeal.hashtagFee.call();
            assert.equal(fee.toNumber(), hashtagCommission, "Commission value not set");
        });
    });

    describe('Deal making and payout flow', function () {

        const itemHash = web3.sha3(itemId);
        const itemValue = 1200000000000000000;

        it("Makes sure that the deal doesn't already exist", async() => {
            let hashtagSimpleDeal = await HashtagSimpleDeal.deployed();
            let deal = await hashtagSimpleDeal.readDeal.call(itemHash);
            // hashtagFee and dealValue must be zero
            assert.equal(String(deal[1]), '0', "hashtagFee must be zero. Deal is not empty")
            assert.equal(String(deal[2]), '0', "dealValue must be zero. Deal is not empty")
        })

        it("Verifies the makeDealForTwo assertions before hand", async() => {
            let hashtagSimpleDeal = await HashtagSimpleDeal.deployed();

            // Require 1: make sure there is enough to pay the hashtag fee later on
            // require (hashtagFee / 2 <= _offerValue);
            let hashtagFee = ( await hashtagSimpleDeal.hashtagFee.call() ).toNumber();
            expect(hashtagFee/2).to.not.be.above(itemValue);

            // Require 2: overflow protection
            // require ( _offerValue + hashtagFee / 2 >= _offerValue);
            expect(hashtagFee).to.be.at.least(0);

            // Require 3: if deal already exists don't allow to overwrite it
            // require (deals[_dealhash].hashtagFee == 0 && deals[_dealhash].dealValue == 0);
            let deal = await hashtagSimpleDeal.readDeal.call(itemHash);
            assert.equal(String(deal[1]), '0', "hashtagFee must be zero. Deal is not empty")
            assert.equal(String(deal[2]), '0', "dealValue must be zero. Deal is not empty")
        })

        it("Create a new deal on the hashtag contract", async () => {
            var sig = ethUtil.ecsign(new Buffer(itemHash.slice(2), 'hex'), new Buffer(privateKey1, 'hex'));
            const v = sig.v;
            const r = `0x${sig.r.toString('hex')}`;
            const s = `0x${sig.s.toString('hex')}`;
            var requestValue = itemValue + hashtagCommission / 2;

            let hashtagSimpleDeal = await HashtagSimpleDeal.deployed();
            let txData = await hashtagSimpleDeal.makeDealForTwo(
                // Method arguments
                itemHash, 
                itemValue, 
                itemIpfs, 
                v, 
                r, 
                s, 
                // Transaction options
                { from: seeker }
            );            

            // write the approve function first / check if it has been set
            // then do the tx

            console.log('\n\n\n\n'+txData+'\n\n\n\n');

            // var t = web3.eth.contract(MiniMeToken.abi);
            // var swtTokenInstance = t.at(swtToken.address);

            // swtToken.approveAndCall(hashtagContract.address, requestValue, txdata, {
            //     from: seeker,
            //     gas: 4700000
            // }).then(function(res) {
            //     done();
            // });
        });
    });
});
