var MiniMeTokenFactory = artifacts.require("MiniMeTokenFactory");
var ERC677BridgeToken = artifacts.require("ERC677BridgeToken");
var MiniMeToken = artifacts.require("MiniMeToken");
var Hashtag = artifacts.require("HashtagSimpleDeal");
var HashtagList = artifacts.require("HashtagList");
const ipfs = require("nano-ipfs-store").at("http://localhost:5001");
const uuid = require("uuid");

contract('HashtagSimpleDeal', (accounts) => {

    var bridgeToken; // The fake SWT factory
    var swtToken; // The fake SWT token
    let hashtagList; // The hashtagIndexer contract
    var hashtagContract; // The SimpleDeal hashtag contract
    var seeker = accounts[1]; // The "Seeker" account
    var provider = accounts[2]; // The "Provider" account
    var maintainer = accounts[3]; // The "Maintainer" account
    var swrsToken; // The "Seeker" reputation token address
    var swrpToken; // The "Provider" reputation token address
    var itemIdHash = {};
    var currentItemHash; // the itemHash the test is currently working with

    describe('Staging: Token Deploy', function () {
        it("should deploy SWT Bridged token contract", async function () {
            swtToken = await ERC677BridgeToken.new(
                "Swarm City Token Bridged",
                "SWTTEST",
                18
                );
                assert.ok(swtToken.address);
        });
  
        it("should mint SWT for Seeker", async function () {
            await swtToken.mint(seeker, 100e18);
            var balance = await swtToken.balanceOf(seeker);
            assert.equal(balance.toNumber(), 100e18, "Seeker balance not correct after swt minting");
        });

        it("should mint SWT for Provider", async function () {
            await swtToken.mint(provider, 100e18);
            var balance = await swtToken.balanceOf(provider);
            assert.equal(balance.toNumber(), 100e18, "Provider balance not correct after swt minting");
        });
    });

    describe('Staging: HashtagList Deploy', function() {
        it("should deploy HashtagList contract", async function () {
            hashtag_new = await HashtagList.new(
                "ListName",
                "IPFS"
            );
            hashtagList = hashtag_new.address;
            assert.ok(hashtag_new.address);
        });
    });

    describe('Staging: Hashtag Deploy', function() {
        it("should deploy a Hashtag", async function () {
            var hashtagMetaJson = {
                "hashtagName": "Settler",
                "hashtagFee": 600000000000000000,
                "description": "",
                "hashtagList": hashtagList 
            };
        
            var hashtagMetaHash = await ipfs.add(JSON.stringify(hashtagMetaJson));
            var bytes32_hashtagMetaHash = web3.fromAscii(hashtagMetaHash);

            hashtagContract = await Hashtag.new(
                swtToken.address, 
                "TestHashtag", 
                600000000000000000, 
                "0x0");

            assert.isNotNull(hashtagContract);
        });

        it("should create Seeker reputation token", async function () {
            var address = await hashtagContract.SeekerRep.call();
            swrsToken = address.toString('hex');
            assert.isNotNull(swrsToken);
        });

        it("should create Provider reputation token", async function () {
            var address = await hashtagContract.ProviderRep.call();
            swrpToken = address.toString('hex');
            assert.isNotNull(swrpToken);
        });

        it("should set Maintainer address", async function () {
            var result = await hashtagContract.setPayoutAddress(maintainer, {
              gas: 4700000,
              from: accounts[0]
            });
            var contractMaintainer = await hashtagContract.payoutAddress.call();
            assert.equal(contractMaintainer, maintainer, "Maintainer address not set");
        });
    });

    describe('Happy Flow: Item Creation Stage', function () {
        it("should create a new Item on the Hashtag contract", async function () {
            // 0. Upload to IPFS
            const metadataHash = await ipfs.add(JSON.stringify({
                username: "Frank",
                avatarHash: "QmSwyxpLq1h8gJe4uSRXgyStfMSonZTKcFAL6yuPB2QLEh",
                description: "Need a ride to Poland",
                location: "Location",
                publicKeySeeker: seeker
            }));

            var hashtagFee = await hashtagContract.hashtagFee.call();

            const itemBudgetWei = 30 * 1e18;
            const totalSum = parseInt(itemBudgetWei) + parseInt(hashtagFee / 2);

            currentItemHash = web3.fromAscii(metadataHash);

            var simpleDealContract = await web3.eth.contract(hashtagContract.abi).at(hashtagContract.address);
            const rawNewItem = simpleDealContract.newItem.getData(
                web3.fromAscii("ItemHash"),
                itemBudgetWei,
                currentItemHash,
                { from: seeker }
            );

            const result = await swtToken.transferAndCall(
                hashtagContract.address, // spender
                totalSum, // totalSum
                rawNewItem, // next call data
                {
                    from: seeker,
                    gas: 4700000
                }
            );

            assert.isNotNull(result);
        });

        it("should see correct token balance Seeker account", async function () {
            var balance = await swtToken.balanceOf(seeker);
            assert.equal(balance.toNumber(), 69700000000000000000, "Seeker balance not correct");
        });

        it("should see correct token balance Hashtag account", async function () {
            var balance = await swtToken.balanceOf(hashtagContract.address);
            assert.equal(balance.toNumber(), 30000000000000000000, "Hashtag balance not correct");
        });

        it("should see correct token balance Maintainer account", async function () {
            var balance = await swtToken.balanceOf(maintainer);
            assert.equal(balance.toNumber(), 300000000000000000, "Maintainer balance not correct");
        });

        it("should find the Item on the Hashtag", async function () {
            var result = await hashtagContract.readItemData(currentItemHash);
            assert.equal(result[0].toNumber(), 0, "Item creation error");
        });
    });

    describe('Happy Flow: Item Reply Stage', function () {
        it("should find the Reply on the Item", async function () {
            const metadataHash = await ipfs.add(JSON.stringify({
                username: "Matt",
                avatarHash: "ipfs",
                replierAddress: provider.address,
                message: "I can do that",
            }));

            var simpleDealContract = await web3.eth.contract(hashtagContract.abi).at(hashtagContract.address);

            const itemHash = web3.fromAscii("ItemHash");
            const metaDataHash_bytes32 = web3.fromAscii(metadataHash);

            const result = await simpleDealContract.replyItem(
                itemHash, 
                metaDataHash_bytes32,
                {
                    from: provider,
                    gas: 4700000
                }
            );
            assert.isNotNull(result);
        });
    });

    describe('Happy Flow: Item Selection Stage', function () {
        it("should select the Reply", async function () {
            var simpleDealContract = await web3.eth.contract(hashtagContract.abi).at(hashtagContract.address);

            const itemHash = web3.fromAscii("ItemHash");

            const result = await simpleDealContract.selectReplier(
                itemHash, 
                provider,
                {
                    from: seeker,
                    gas: 4700000
                }
            );
            assert.isNotNull(result);
        });
    });
    
    describe('Happy Flow: Item Funding Stage', function () {
        it("should fund the new Item on the Hashtag contract", async function () {
            var simpleDealContract = await web3.eth.contract(hashtagContract.abi).at(hashtagContract.address);
            var txdata = simpleDealContract.fundItem.getData(web3.fromAscii("ItemHash"), {
                from: provider,
            });
            var hashtagFee = await hashtagContract.hashtagFee.call();
            const itemBudgetWei = 30 * 1e18;
            const totalSum = parseInt(itemBudgetWei) + parseInt(hashtagFee / 2);
            var result = await swtToken.transferAndCall(hashtagContract.address, totalSum, txdata, {
                from: provider,
                gas: 4700000
            });
            assert.isNotNull(result);
        });

        it("should see correct token balance Provider account", async function () {
            var balance = await swtToken.balanceOf(provider);
            assert.equal(balance.toNumber(), 69700000000000000000, "Provider balance not correct");
        });

        it("should see correct token balance Hashtag account", async function () {
            var balance = await swtToken.balanceOf(hashtagContract.address);
            assert.equal(balance.toNumber(), 60000000000000000000, "Hashtag balance not correct");
        });

        it("should see correct token balance Maintainer account", async function () {
            var balance = await swtToken.balanceOf(maintainer);
            assert.equal(balance.toNumber(), 600000000000000000, "Maintainer balance not correct");
        });

        it("should set provider address on the Item", async function () {
            const itemHash = web3.fromAscii("ItemHash");
            var result = await hashtagContract.readItemData(itemHash);
            assert.equal(result[1], provider, "Item creation error");
        });
    });

    describe('Happy Flow: Payout Stage', function () {
        it("should payout the item", async function () {
            const itemHash = web3.fromAscii("ItemHash");
            result = await hashtagContract.payoutItem(itemHash, {from: seeker,
                gas: 4700000
            });
        });
    
        it("should see correct token balance Seeker account", async function () {
            var balance = await swtToken.balanceOf(seeker);
            assert.equal(balance.toNumber(), 69700000000000000000, "Provider balance not correct");
        });

        it("should see correct token balance Provider account", async function () {
            var balance = await swtToken.balanceOf(provider);
            assert.equal(balance.toNumber(), 129700000000000000000, "Provider balance not correct");
        });

        it("should see correct token balance Hashtag account", async function () {
            var balance = await swtToken.balanceOf(hashtagContract.address);
            assert.equal(balance.toNumber(), 0, "Hashtag balance not correct");
        });

        it("should see correct token balance Maintainer account", async function () {
            var balance = await swtToken.balanceOf(maintainer);
            assert.equal(balance.toNumber(), 600000000000000000, "Maintainer balance not correct");
        });

        it("should set itemStatus on the Item", async function () {
            const itemHash = web3.fromAscii("ItemHash");
            var result = await hashtagContract.readItemData(itemHash);
            assert.equal(result[0].toNumber(), 2, "Item creation error");
        });

        it("should see correct reputation token balance Seeker account", async function () {
            let repToken = artifacts.require("DetailedERC20");
            let repTokenInstance = await repToken.at(swrsToken);
            var repBalance = await repTokenInstance.balanceOf(seeker);
            assert.equal(repBalance.toNumber(), 5, "Seeker reputation balance not correct after payout");
        });

        it("should see correct reputation token balance Provider account", async function () {
            let repToken = artifacts.require("DetailedERC20");
            let repTokenInstance = await repToken.at(swrpToken);
            var repBalance = await repTokenInstance.balanceOf(provider);
            assert.equal(repBalance.toNumber(), 5, "Provider reputation balance not correct after payout");
        });
    });

    // describe('CancelItem: Item Creation Stage', function () {
    //     it("should create a new Item on the Hashtag contract", async function () {
    //         var itemId = uuid.v4();
    //         var itemHash = web3.sha3(itemId);
    //         currentItemHash = itemHash;
    //         itemIdHash[itemHash] = itemId;
    //         var hashtagFee = await hashtagContract.hashtagFee.call();
    //         var itemMetaJson = {
    //             "itemHash": itemHash,
    //             "username": "Gary",
    //             "avatarHash": "QmSwyxpLq1h8gJe4uSRXgyStfMSonZTKcFAL6yuPB2QLEh",
    //             "address": seeker, 
    //             "description": "Need a ride to Porcfest",
    //             "hashtagFee": hashtagFee,
    //             "itemValue": 30e18 
    //         };
    //         var itemMetaHash = await ipfs.add(JSON.stringify(itemMetaJson));
    //         var hashtagContractInstance = await web3.eth.contract(hashtagContract.abi).at(hashtagContract.address);
    //         var txdata = await hashtagContractInstance.newItem.getData(itemHash, itemMetaJson.itemValue, itemMetaHash, {
    //             from: seeker,
    //         });
    //         var requestValue = itemMetaJson.itemValue + itemMetaJson.hashtagFee / 2;
    //         var result = await swtToken.approveAndCall(hashtagContract.address, requestValue, txdata, {
    //             from: seeker,
    //             gas: 4700000
    //         });
    //         assert.isNotNull(result);
    //     });

    //     it("should see correct token balance Seeker account", async function () {
    //         var balance = await swtToken.balanceOf(seeker);
    //         assert.equal(balance.toNumber(), 39400000000000000000, "Seeker balance not correct");
    //     });

    //     it("should see correct token balance Hashtag account", async function () {
    //         var balance = await swtToken.balanceOf(hashtagContract.address);
    //         assert.equal(balance.toNumber(), 30000000000000000000, "Hashtag balance not correct");
    //     });

    //     it("should see correct token balance Maintainer account", async function () {
    //         var balance = await swtToken.balanceOf(maintainer);
    //         assert.equal(balance.toNumber(), 900000000000000000, "Maintainer balance not correct");
    //     });

    //     it("should find the Item on the Hashtag", async function () {
    //         var result = await hashtagContract.readDeal(currentItemHash);
    //         assert.equal(result[2].toNumber(), 30e18, "Item creation error");
    //     });
    // });

    // describe('CancelItem: Cancellation Stage', function () {
    //     it("should cancel the item", async function () {
    //         result = await hashtagContract.cancelItem(currentItemHash, {from: seeker,
    //             gas: 4700000
    //         });
    //     });
    
    //     it("should see correct token balance Seeker account", async function () {
    //         var balance = await swtToken.balanceOf(seeker);
    //         assert.equal(balance.toNumber(), 69400000000000000000, "Provider balance not correct");
    //     });

    //     it("should see correct token balance Provider account", async function () {
    //         var balance = await swtToken.balanceOf(provider);
    //         assert.equal(balance.toNumber(), 129700000000000000000, "Provider balance not correct");
    //     });

    //     it("should see correct token balance Hashtag account", async function () {
    //         var balance = await swtToken.balanceOf(hashtagContract.address);
    //         assert.equal(balance.toNumber(), 0, "Hashtag balance not correct");
    //     });

    //     it("should see correct token balance Maintainer account", async function () {
    //         var balance = await swtToken.balanceOf(maintainer);
    //         assert.equal(balance.toNumber(), 900000000000000000, "Maintainer balance not correct");
    //     });

    //     it("should set itemStatus on the Item", async function () {
    //         var result = await hashtagContract.readDeal(currentItemHash);
    //         assert.equal(result[0].toNumber(), 4, "Item creation error");
    //     });
    // });

    // describe('DisputeItem: Item Creation Stage', function () {
    //     it("should create a new Item on the Hashtag contract", async function () {
    //         var itemId = uuid.v4();
    //         var itemHash = web3.sha3(itemId);
    //         currentItemHash = itemHash;
    //         itemIdHash[itemHash] = itemId;
    //         var hashtagFee = await hashtagContract.hashtagFee.call();
    //         var itemMetaJson = {
    //             "itemHash": itemHash,
    //             "username": "Griff",
    //             "avatarHash": "QmSwyxpLq1h8gJe4uSRXgyStfMSonZTKcFAL6yuPB2QLEh",
    //             "address": seeker, 
    //             "description": "Write Giveth's mission/vision",
    //             "hashtagFee": hashtagFee,
    //             "itemValue": 30e18 
    //         };
    //         var itemMetaHash = await ipfs.add(JSON.stringify(itemMetaJson));
    //         var hashtagContractInstance = await web3.eth.contract(hashtagContract.abi).at(hashtagContract.address);
    //         var txdata = await hashtagContractInstance.newItem.getData(itemHash, itemMetaJson.itemValue, itemMetaHash, {
    //             from: seeker,
    //         });
    //         var requestValue = itemMetaJson.itemValue + itemMetaJson.hashtagFee / 2;
    //         var result = await swtToken.approveAndCall(hashtagContract.address, requestValue, txdata, {
    //             from: seeker,
    //             gas: 4700000
    //         });
    //         assert.isNotNull(result);
    //     });

    //     it("should see correct token balance Seeker account", async function () {
    //         var balance = await swtToken.balanceOf(seeker);
    //         assert.equal(balance.toNumber(), 39100000000000000000, "Seeker balance not correct");
    //     });

    //     it("should see correct token balance Hashtag account", async function () {
    //         var balance = await swtToken.balanceOf(hashtagContract.address);
    //         assert.equal(balance.toNumber(), 30000000000000000000, "Hashtag balance not correct");
    //     });

    //     it("should see correct token balance Maintainer account", async function () {
    //         var balance = await swtToken.balanceOf(maintainer);
    //         assert.equal(balance.toNumber(), 1200000000000000000, "Maintainer balance not correct");
    //     });

    //     it("should find the Item on the Hashtag", async function () {
    //         var result = await hashtagContract.readDeal(currentItemHash);
    //         assert.equal(result[2].toNumber(), 30e18, "Item creation error");
    //     });

    // });

    // describe('DisputeItem: Item Funding Stage', function () {
    //     it("should fund the new Item on the Hashtag contract", async function () {
    //         var itemOnContract = await hashtagContract.readDeal(currentItemHash);
    //         var tempItem = await ipfs.cat(itemOnContract[6]); 
    //         var itemMetaJson = JSON.parse(tempItem);
    //         var hashtagContractInstance = await web3.eth.contract(hashtagContract.abi).at(hashtagContract.address);
    //         var txdata = hashtagContractInstance.fundItem.getData(itemIdHash[currentItemHash], {
    //             from: provider,
    //         });
    //         var requestValue = itemMetaJson.itemValue + itemMetaJson.hashtagFee / 2;
    //         var result = await swtToken.approveAndCall(hashtagContract.address, requestValue, txdata, {
    //             from: provider,
    //             gas: 4700000
    //         });
    //         assert.isNotNull(result);
    //     });

    //     it("should see correct token balance Provider account", async function () {
    //         var balance = await swtToken.balanceOf(provider);
    //         assert.equal(balance.toNumber(), 99400000000000000000, "Provider balance not correct");
    //     });

    //     it("should see correct token balance Hashtag account", async function () {
    //         var balance = await swtToken.balanceOf(hashtagContract.address);
    //         assert.equal(balance.toNumber(), 60000000000000000000, "Hashtag balance not correct");
    //     });

    //     it("should see correct token balance Maintainer account", async function () {
    //         var balance = await swtToken.balanceOf(maintainer);
    //         assert.equal(balance.toNumber(), 1500000000000000000, "Maintainer balance not correct");
    //     });

    //     it("should set provider address on the Item", async function () {
    //         var result = await hashtagContract.readDeal(currentItemHash);
    //         assert.equal(result[5], provider, "Item creation error");
    //     });
    // });

    // describe('DisputeItem: Item Dispute Stage', function () {
    //     it("should make Seeker dispute the new Item", async function () {            
    //         result = await hashtagContract.disputeItem(currentItemHash, {from: seeker,
    //             gas: 4700000
    //         });
    //     });

    //     it("should set itemStatus on the Item", async function () {
    //         var result = await hashtagContract.readDeal(currentItemHash);
    //         assert.equal(result[0].toNumber(), 2, "Item status error");
    //     });
    // });

    // describe('DisputeItem: Item Resolve Stage ♡', function () {
    //     it("should make Maintainer resolve the new Item", async function () {  
    //         result = await hashtagContract.resolveItem(currentItemHash, 10e18, {from: maintainer,
    //             gas: 4700000
    //         });
    //     });

    //     it("should set itemStatus on the Item", async function () {
    //         var result = await hashtagContract.readDeal(currentItemHash);
    //         assert.equal(result[0].toNumber(), 3, "Item status error");
    //     });

    //     it("should see correct token balance Seeker account", async function () {
    //         var balance = await swtToken.balanceOf(seeker);
    //         assert.equal(balance.toNumber(), 49100000000000000000, "Seeker balance not correct");
    //     });

    //     it("should see correct token balance Provider account", async function () {
    //         var balance = await swtToken.balanceOf(provider);
    //         assert.equal(balance.toNumber(), 149400000000000000000, "Provider balance not correct");
    //     });

    //     it("should see correct token balance Hashtag account", async function () {
    //         var balance = await swtToken.balanceOf(hashtagContract.address);
    //         assert.equal(balance.toNumber(), 0, "Hashtag balance not correct");
    //     });

    //     it("should see correct token balance Maintainer account", async function () {
    //         var balance = await swtToken.balanceOf(maintainer);
    //         assert.equal(balance.toNumber(), 1500000000000000000, "Maintainer balance not correct");
    //     });
    // });
});