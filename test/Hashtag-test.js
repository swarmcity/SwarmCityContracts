
var MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
var MiniMeToken = artifacts.require("MiniMeToken");
var DetailedERC20 = artifacts.require("DetailedERC20");
var Hashtag = artifacts.require("HashtagSimpleDeal");

contract('HashtagSimpleDeal', (accounts) => {

    var miniMeTokenFactory; // The fake SWT factory
    var swtToken; // The fake SWT token
    var hashtagContract; // The SimpleDeal hashtag contract
    var seeker = accounts[1]; // The "Seeker" account
    var provider = accounts[2]; // The "Provider" account
    var maintainer = accounts[3]; // The "Maintainer" account
    var swrsToken; // The "Seeker" reputation token address
    var swrpToken; // The "Provider" reputation token address
    var hashtagMeta = "QmVFumDg1Ey6B1vaQbrPfh5EW1DbcW8yeFsbuYFiGUU381"; // The MetaData for the hashtag
    var hashtagFee = 600000000000000000; // The HashtagFee
    var itemId = "abc"; // The clear text item ID
    var itemHash = web3.sha3(itemId); // The SHA3Hashed itemId
    var itemValue = 1200000000000000000; // The value of the item being requested
    var itemIpfs = "QmPsUmJTEHEHtPetyFsKaarwVWwBMJiYhvcLEQz5kWAJZX"; // The textual description of what is requested
    var requestValue = itemValue + hashtagFee / 2;

    describe('Token Factory Deploy', function () {
        it("should deploy MiniMeTokenFactory contract", function (done) {
            MiniMeTokenFactory.new().then(function (_miniMeTokenFactory) {
                assert.ok(_miniMeTokenFactory.address);
                miniMeTokenFactory = _miniMeTokenFactory;
                done();
            });
        });
    });

    describe('Token Deploy', function () {
        it("should deploy SWT MiniMeToken contract", function (done) {
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

        it("should mint SWT for Seeker", function(done) {
            swtToken.generateTokens(seeker, 100e18).then(function() {
                done();
            });
        });
  
        it("should increase Seeker balance", function(done) {
            swtToken.balanceOf(seeker).then(function(balance) {
                assert.equal(balance.toNumber(), 100e18, "Seeker balance not correct after swt minting");
                done();r
            });
        });
    
        it("should mint SWT for Provider", function(done) {
            swtToken.generateTokens(provider, 100e18).then(function() {
                done();
            });
        });
  
        it("should increase Provider balance", function(done) {
            swtToken.balanceOf(provider).then(function(balance) {
                assert.equal(balance.toNumber(), 100e18, "Provider balance not correct after swt minting");
                done();
            });
        });

    });

    describe('Hashtag Deploy', function() {
        it("should deploy a Hashtag", function(done) {
            Hashtag.new(swtToken.address, "HashtagSimpleDealTest", hashtagFee, hashtagMeta).then(function(instance) {
                hashtagContract = instance;
                assert.isNotNull(hashtagContract);
                done();
            });
        });

        it("should create Seeker reputation token", function (done) {
            hashtagContract.SeekerRep.call().then(function(res){
                swrsToken = res.toString('hex');
                assert.isNotNull(swrsToken);
                done();
            });
        });

        it("should create Provider reputation token", function (done) {
            hashtagContract.ProviderRep.call().then(function(res){
                swrpToken = res.toString('hex');
                assert.isNotNull(swrpToken);
                done();
            });
        });

        it("should set Maintainer address", function(done) {
            hashtagContract.setPayoutAddress(maintainer, {
              gas: 4700000,
              from: accounts[0]
            }).then(function(res) {
                done();
            });
        });

        it("should verify Maintainer address on Hashtag", function(done) {
            hashtagContract.payoutAddress.call().then(function(result) {
                assert.equal(result, maintainer, "Maintainer address not set");
                done();
            });
        });

        // it("should have no reputation token balance for Seeker account", async function(done) {
        //     let repToken = artifacts.require("DetailedERC20");
        //     let repTokenInstance = await repToken.at(swrsToken);
        //     var repBalance = await repTokenInstance.balanceOf(seeker);
        //     assert.equal(repBalance.toNumber(), 0, "Seeker reputation balance not correct after hashtag creation");
        //     await done();
        // });

        // it("should have no reputation token balance for Provider account", async function(done) {
        //     let repToken = artifacts.require("DetailedERC20");
        //     let repTokenInstance = await repToken.at(swrpToken);
        //     var repBalance = await repTokenInstance.balanceOf(provider);
        //     assert.equal(repBalance.toNumber(), 0, "Provider reputation balance not correct after hashtag creation");
        //     await done();
        // });

    });

    describe('Item Creation Stage', function () {
        it("should create a new Item on the Hashtag contract", function(done) {

            // Set up some listeners to get SOME debugging info

            var hashtagContractInstance = web3.eth.contract(hashtagContract.abi).at(hashtagContract.address);

            var ReceivedApprovalEvent = hashtagContractInstance.ReceivedApproval({
				fromBlock: "latest"
            });

            var NewItemEvent = hashtagContractInstance.NewItemForTwo({
				fromBlock: "latest"
			});
            
			ReceivedApprovalEvent.watch(function(error, result) {
                //console.log('Hashtag received approval for item ', result.args.itemHash);
			});

            NewItemEvent.watch(function(error, result) {
                //console.log('Hashtag created new item ', result.args);
                done();
            });
            

            var txdata = hashtagContractInstance.newItem.getData(itemHash, itemValue, itemIpfs, {
                from: seeker,
            });
            
            swtToken.approveAndCall(hashtagContract.address, requestValue, txdata, {
                from: seeker,
                gas: 4700000
            }).then(function(res) {
                //console.log(res.tx);
            });

        });

        it("should see token balance Seeker account decrease", function(done) {
            swtToken.balanceOf(seeker).then(function(balance) {
                assert.equal(balance.toNumber(), 98500000000000000000, "Seeker balance not correct after deal making");
                //console.log("seeker balance: ", balance.toNumber());
                done();
            });
        });

        it("should see token balance Hashtag account increase", function(done) {
            swtToken.balanceOf(hashtagContract.address).then(function(balance) {
                assert.equal(balance.toNumber(), 1500000000000000000, "Hashtag balance not correct after deal making");
                //console.log("hashtag balance: ", balance.toNumber());
                done();
            });
        });

        it("should find the Item on the Hashtag", function(done) {
            hashtagContract.readDeal(itemHash).then(function(res) {
                //console.log(res);
                assert.equal(res[2].toNumber(), itemValue, "Item creation error");
                done();
             });
        });

    });
    
    describe('Item Funding Stage', function () {
        it("should fund the new Item on the Hashtag contract", function(done) {
            var hashtagContractInstance = web3.eth.contract(hashtagContract.abi).at(hashtagContract.address);

            var ReceivedApprovalEvent = hashtagContractInstance.ReceivedApproval({
				fromBlock: "latest"
            });

            var FundDealEvent = hashtagContractInstance.FundDeal({
				fromBlock: "latest"
			});
            
			ReceivedApprovalEvent.watch(function(error, result) {
                //console.log('Hashtag received approval for item ', result);
			});

            FundDealEvent.watch(function(error, result) {
                //console.log('Hashtag fund new item ', result);
                assert.equal(result.args.provider, provider, "Provider address is not correct");
                done();
            });
            
            var txdata = hashtagContractInstance.fundDeal.getData(itemId, {
                from: provider,
            });
            
            swtToken.approveAndCall(hashtagContract.address, requestValue, txdata, {
                from: provider,
                gas: 4700000
            }).then(function(res) {
                //done();
            });
        });

        it("should see token balance Provider account decrease", function(done) {
            swtToken.balanceOf(provider).then(function(balance) {
                assert.equal(balance.toNumber(), 98500000000000000000, "Provider balance not correct after swt minting");
                //console.log(balance.toNumber());
                done();
            });
        });

        it("should set Provider address in Item", function(done) {
            hashtagContract.readDeal(itemHash).then(function(res) {
                //console.log('readdeal: ',res[5]);
                assert.equal(res[5], provider, "Provider address is not correct");
                done();
            });
        });

    });

    describe('Payout Stage', function () {
        it("should payout the item", function(done) {
            hashtagContract.payout(itemHash, {from: seeker,
                gas: 4700000
            }).then(function(res) {
                done();
            });
        });
            
    
        it("should see token balance Provider account increase", function(done) {
            swtToken.balanceOf(provider).then(function(balance) {
                assert.equal(balance.toNumber(), 100900000000000000000, "Provider balance not correct after payout");
                //console.log("Provider balance: ", balance.toNumber());
                done();
            });
        });

        // it("should see reputation token balance Provider account", function(done) {
        //     var swrpTokenInstance = web3.eth.contract(RepToken.abi).at(swrpToken);

        //     swrpTokenInstance.balanceOf(provider).then(function(balance) {
        //         //assert.equal(balance.toNumber(), 100e18, "Seeker balance not correct after swt minting");
        //         console.log("Provider reptoken balance: ", balance.toNumber());
        //         //done();
        //     });
        // });

        it("should see token balance Seeker account decrease", function(done) {
            swtToken.balanceOf(seeker).then(function(balance) {
                assert.equal(balance.toNumber(), 98500000000000000000, "Seeker balance not correct after payout");
                //console.log("Seeker balance: ", balance.toNumber());
                done();
            });
        });

        it("should see reputation token balance Seeker account increase", async function() {
            let repToken = artifacts.require("DetailedERC20");
            let repTokenInstance = await repToken.at(swrsToken);
            var repBalance = await repTokenInstance.balanceOf(seeker);
            assert.equal(repBalance.toNumber(), 5, "Seeker reputation balance not correct after payout");
            //done();
        });

        it("should see reputation token balance Provider account increase", async function() {
            let repToken = artifacts.require("DetailedERC20");
            let repTokenInstance = await repToken.at(swrpToken);
            var repBalance = await repTokenInstance.balanceOf(provider);
            assert.equal(repBalance.toNumber(), 5, "Provider reputation balance not correct after payout");
            //done();
        });

        it("should see token balance Maintainer account increase", function(done) {
            swtToken.balanceOf(maintainer).then(function(balance) {
                assert.equal(balance.toNumber(), 600000000000000000, "Maintainer balance not correct after payout");
                //console.log("Maintainer holds: ", balance.toNumber());
                done();
            });
        });

        it("should see token balance Hashtag account decrease", function(done) {
            swtToken.balanceOf(hashtagContract.address).then(function(balance) {
                assert.equal(balance.toNumber(), 0, "Hashtag balance not correct after payout");
                //console.log("Hashtag holds: ", balance.toNumber());
                done();
            });
        });

    });


});
