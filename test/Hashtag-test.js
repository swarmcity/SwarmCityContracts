
var MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
var MiniMeToken = artifacts.require("MiniMeToken");
var RepToken = artifacts.require("DetailedERC20.sol");
var Hashtag = artifacts.require("HashtagSimpleDeal.sol");
var utility = require('../utility.js')();
const ethUtil = require('ethereumjs-util');
const ethCrypto = require('eth-crypto');

contract('HashtagSimpleDeal', (accounts) => {

    var miniMeTokenFactory; // The fake SWT factory
    var swtToken; // The fake SWT token
    var hashtagContract; // The SimpleDeal hashtag contract
    var seeker = accounts[1]; // The "Seeker" account
    var provider = accounts[2]; // The "Provider" account
    var maintainer = accounts[4]; // The "Maintainer" account
    var swrsToken; // The "Seeker" reputation token
    var swrpToken; // The "Provider" reputation token
    var hashtagMeta = "QmVFumDg1Ey6B1vaQbrPfh5EW1DbcW8yeFsbuYFiGUU381"; // The MetaData for the hashtag
    var hashtagFee = 600000000000000000; // The HashtagFee
    var itemId = "abc"; // The clear text item ID
    var itemHash = web3.sha3(itemId); // The SHA3Hashed itemId
    var itemValue = 1200000000000000000; // The value of the item being requested
    var itemIpfs = "QmPsUmJTEHEHtPetyFsKaarwVWwBMJiYhvcLEQz5kWAJZX"; // The textual description of what is requested
    var requestValue = itemValue + hashtagFee / 2;


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
                done();r
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
        it("should deploy 'HashtagSimpleDeal'", function(done) {
            Hashtag.new(swtToken.address, "HashtagSimpleDealTest", hashtagFee, hashtagMeta).then(function(instance) {
                hashtagContract = instance;
                assert.isNotNull(hashtagContract);
                done();
            });
        });

        it("should have created two reputation tokens", function (done) {
            hashtagContract.ProviderRep.call().then(function(res){
                //console.log('ProviderRep: ', res);
                swrpToken = res;
                assert.isNotNull(swrpToken);
            });
            hashtagContract.SeekerRep.call().then(function(res){
                //console.log('SeekerRep: ', res);
                swrsToken = res;
                assert.isNotNull(swrsToken);
            });
            done();
        });

        // it("should see 0 reptutation on the Provider rep token for both seeker and provider", function (done) {
        //     var repContractInstance = web3.eth.contract(RepToken.abi).at(swrpToken);
        //     repContractInstance.balanceOf(seeker).then(function(balance){
        //         console.log('Seeker balance in Provider rep token: ', balance);
        //     });
        //     // // repContractInstance.balanceOf(provider).then(function(res){
        //     //     console.log('Provider balance in Provider rep token: ', res);
        //     // });
        //     done();

        // });

    });

    describe('Deal making flow', function () {
        it("Create a new deal on the hashtag contract", function(done) {

            // Set up some listeners to get SOME debugging info
            
            var ReceivedApprovalEvent = hashtagContract.ReceivedApproval({
				fromBlock: "latest"
            });

            var NewItemEvent = hashtagContract.NewItemForTwo({
				fromBlock: "latest"
			});
            
			var ReceivedApprovalListener = ReceivedApprovalEvent.watch(function(error, result) {
				console.log('Hashtag received approval for item ', result.args.itemHash);
			});

            var NewItemListener = NewItemEvent.watch(function(error, result) {
				console.log('Hashtag created new item ', result.args);
            });
            
            var hashtagContractInstance = web3.eth.contract(hashtagContract.abi).at(hashtagContract.address);

            var txdata = hashtagContractInstance.newItem.getData(itemHash, itemValue, itemIpfs, {
                from: seeker,
            });
            
            swtToken.approveAndCall(hashtagContract.address, requestValue, txdata, {
                from: seeker,
                gas: 4700000
            }).then(function(res) {
                console.log(res.tx);
                done();
            });

        });

        it("should see token balance Seeker account", function(done) {
            swtToken.balanceOf(seeker).then(function(balance) {
                //assert.equal(balance.toNumber(), 100e18, "Seeker balance not correct after swt minting");
                console.log(balance.toNumber());
                done();
            });
        });

        it("should find the item on the contract", function(done) {
            hashtagContract.readDeal(itemHash).then(function(res) {
                console.log('readdeal: ',res[0].toNumber());
                console.log('readdeal: ',res[1].toNumber());
                console.log('readdeal: ',res[2].toNumber());
                console.log('readdeal: ',res[3].toNumber());
                console.log('readdeal: ',res[4].toNumber());
                console.log('readdeal: ',res[5]);
                console.log('readdeal: ',res[6].toString());
                //assert.equal(res[2].toNumber(), dealvalue, "deal balance not correct after funding");
                done();
             });
        });

    });
    
    describe('Funding flow', function () {
        // it("Fund the new deal on the hashtag contract", function(done) {
        //     var itemHash = web3.sha3(itemId);
        //     var requestValue = itemValue + hashtagFee / 2;
        //     var c = web3.eth.contract(hashtagContract.abi).at(hashtagContract.address);
            
        //     var events = c.ReceivedApproval({
        //         fromBlock: "latest"
        //     });
        //     var listener = events.watch(function(error, result) {
        //         console.log('/////// EVENT ApproveCall received:', result.args.itemHash);
        //     });

        //     var events2 = c.FundDeal({
        //         fromBlock: "latest"
        //     });
            
        //     var listener2 = events2.watch(function(error, result) {
        //         console.log('/////// EVENT FundDeal received:', result.args);
        //     });
            
        //     var txdata = c.fundDeal.getData(itemId, {
        //         from: provider,
        //     });
            
        //     swtToken.approveAndCall(hashtagContract.address, requestValue, txdata, {
        //         from: provider,
        //         gas: 4700000
        //     }).then(function(res) {
        //         done();
        //     });
        // });

        // it("should see token balance Provider account", function(done) {
        //     swtToken.balanceOf(provider).then(function(balance) {
        //         //assert.equal(balance.toNumber(), 100e18, "Seeker balance not correct after swt minting");
        //         console.log(balance.toNumber());
        //         done();
        //     });
        // });

        // it("should find the item on the contract", function(done) {
        //     var c = web3.eth.contract(hashtagContract.abi).at(hashtagContract.address);
        //     var itemHash = web3.sha3(itemId);
        //     console.log(itemHash);
        //     hashtagContract.readDeal(itemHash).then(function(res) {
        //         console.log('readdeal: ',res[0].toNumber(), res[1].toNumber(), res[2].toNumber(), res[3].toString());
        //         //assert.equal(res[2].toNumber(), dealvalue, "deal balance not correct after funding");
        //         done();
        //         });
        // });

        // it("should see token balance Provider account", function(done) {
        //     swtToken.balanceOf(hashtagContract.address).then(function(balance) {
        //         //assert.equal(balance.toNumber(), 100e18, "Seeker balance not correct after swt minting");
        //         console.log("Hashtag holds: ", balance.toNumber());
        //         done();
        //     });
        // });
    });

    //     describe('Payout flow', function () {
    //         it("Pays out the new deal on the hashtag contract", function(done) {
    //             var itemHash = web3.sha3(itemId);

    //             hashtagContract.payout(itemHash, {from: seeker,
    //                 gas: 4700000
    //             }).then(function(res) {
    //                 done();
    //             });
    //         });

            
    
    //         it("should see token balance Provider account", function(done) {
    //             swtToken.balanceOf(provider).then(function(balance) {
    //                 //assert.equal(balance.toNumber(), 100e18, "Seeker balance not correct after swt minting");
    //                 console.log("Provider balance: ", balance.toNumber());
    //                 done();
    //             });
    //         });

    //         it("should see reputation token balance Provider account", function(done) {
    //             var swrpTokenInstance = web3.eth.contract(repToken.abi).at(swrpToken.address);

    //             swrpTokenInstance.balanceOf(provider).then(function(balance) {
    //                 //assert.equal(balance.toNumber(), 100e18, "Seeker balance not correct after swt minting");
    //                 console.log("Provider reptoken balance: ", balance.toNumber());
    //                 done();
    //             });
    //         });

    //         it("should see token balance Seeker account", function(done) {
    //             swtToken.balanceOf(seeker).then(function(balance) {
    //                 //assert.equal(balance.toNumber(), 100e18, "Seeker balance not correct after swt minting");
    //                 console.log("Seeker balance: ", balance.toNumber());
    //                 done();
    //             });
    //         });

    //         // it("should see reputation token balance Seeker account", function(done) {
    //         //     swrsToken.balanceOf(seeker).then(function(balance) {
    //         //         //assert.equal(balance.toNumber(), 100e18, "Seeker balance not correct after swt minting");
    //         //         console.log("Seeker reptoken balance: ", balance.toNumber());
    //         //         done();
    //         //     });
    //         // });

    //         it("should see token balance hashtag account", function(done) {
    //             swtToken.balanceOf(hashtagContract.address).then(function(balance) {
    //                 //assert.equal(balance.toNumber(), 100e18, "Seeker balance not correct after swt minting");
    //                 console.log("Hashtag holds: ", balance.toNumber());
    //                 done();
    //             });
    //         });
    //     });
    // });


});
