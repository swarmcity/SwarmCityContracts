// HashtagSimpleDeal
var ERC677BridgeToken = artifacts.require("ERC677BridgeToken");

const ipfs = require("nano-ipfs-store").at("https://ipfs.swarm.city");

contract('HashtagSimpleDeal', (accounts) => { 

    var seeker = accounts[1]; // The "Seeker" account
    var provider = accounts[2]; // The "Provider" account
    var maintainer = accounts[3]; // The "Maintainer" account
    var hashtagContract; // The SimpleDeal hashtag contract
    var hashtagContract_next; // The SimpleDeal hashtag contract
    var swtToken; // The fake SWT token
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
            await swtToken.mint(seeker, 100);
            var balance = await swtToken.balanceOf(seeker);
            assert.equal(balance.toNumber(), 100, "Seeker balance not correct after swt minting");
        });

        it("should mint SWT for Provider", async function () {
            await swtToken.mint(provider, 100);
            var balance = await swtToken.balanceOf(provider);
            assert.equal(balance.toNumber(), 100, "Provider balance not correct after swt minting");
        });

        it("should see correct token balance Seeker account", async function () {
            var balance = await swtToken.balanceOf(seeker);
            console.log(balance.toNumber());
            //assert.equal(balance.toNumber(), 69700000000000000000, "Seeker balance not correct");
        });

        it("should see correct token balance provider account", async function () {
            var balance = await swtToken.balanceOf(provider);
            console.log(balance.toNumber());
            //assert.equal(balance.toNumber(), 69700000000000000000, "Seeker balance not correct");
        });
    });

    describe('Staging: Hashtag Deploy', function() {
        it("should deploy a Hashtag", async function () {
            var hashtagMetaJson = {
                "hashtagName": "Settler",
                "hashtagFee": 600000000000000000,
                "description": "",
            };
        
            var hashtagMetaHash = await ipfs.add(JSON.stringify(hashtagMetaJson));
            //var bytes32_hashtagMetaHash = web3.fromAscii(hashtagMetaHash);

            hashtagContract = await Hashtag.new(
                swtToken.address, 
                "TestHashtag", 
                600000000000000000, 
                "0x0",
                0x0,
                0x0
            );

            assert.isNotNull(hashtagContract);
        });

        it("should create Seeker reputation token", async function () {
            var address = await hashtagContract.SeekerRep.call();
            swrsToken = address.toString('hex');
            assert.isNotNull(swrsToken);
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

});