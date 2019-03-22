// HashtagSimpleDeal
const ERC677BridgeToken = artifacts.require("ERC677BridgeToken");
const HashtagSimpleDeal = artifacts.require("HashtagSimpleDeal");

contract("HashtagSimpleDeal", accounts => {
  // Deployed instances
  let erc677BridgeToken;
  let hashtagSimpleDeal;

  // Test params
  const balance = web3.utils.toWei("100");
  const hashtagFee = web3.utils.toWei("0.1");
  const hashtagMetadataHash = web3.utils.padLeft(
    web3.utils.utf8ToHex("Swarm City"),
    64
  );

  // Test accounts
  const seekerAddress = accounts[1]; // The "Seeker" account
  const providerAddress = accounts[2]; // The "Provider" account
  const maintainerAddress = accounts[3]; // The "Maintainer" account

  const accountsToMint = [seekerAddress, providerAddress];

  // Register how much gas is used on each contract function and log it afterwards
  const gasUsedRegister = {};

  // Utility to query getPastEvents using the tx result to get the block number
  const lastBlock = result => ({
    fromBlock: result.receipt.blockNumber,
    toBlock: result.receipt.blockNumber
  });
  const toString = res => res.toString();
  const balanceOf = addr => erc677BridgeToken.balanceOf(addr).then(toString);
  const toBN = web3.utils.toBN;
  const toS = bn => bn.toString();
  const add = (a, b) => toS(toBN(a).add(toBN(b)));
  const sub = (a, b) => toS(toBN(a).sub(toBN(b)));
  const mul = (a, b) => toS(toBN(a).mul(toBN(b)));
  const div = (a, b) => toS(toBN(a).div(toBN(b)));
  const assertObjProps = (res, obj, id) => {
    for (const key of Object.keys(obj)) {
      assert.equal(res[key], obj[key], `${id || ""}.${key} is not correct`);
    }
  };

  before(async function() {
    erc677BridgeToken = await ERC677BridgeToken.deployed();
    hashtagSimpleDeal = await HashtagSimpleDeal.deployed();
  });

  describe("Fund user's accounts by minting", function() {
    it(`Should mint ${balance} to ${accountsToMint.join(", ")}`, async () => {
      for (const address of accountsToMint) {
        await erc677BridgeToken.mint(address, balance);
        assert.equal(
          await balanceOf(address),
          balance,
          "Balance is not correct after minting"
        );
      }
    });
  });

  describe("Set contract global variables", function() {
    it("should set the payoutAddress", async function() {
      const result = await hashtagSimpleDeal.setPayoutAddress(
        maintainerAddress
      );
      gasUsedRegister.setPayoutAddress = result.receipt.gasUsed;
      const payoutAddressSet = result.logs.find(
        log => log.event == "PayoutAddressSet"
      );
      assert.ok(payoutAddressSet, "PayoutAddressSet event not found");
      assert.equal(
        payoutAddressSet.args.payoutAddress,
        maintainerAddress,
        "PayoutAddressSet event argument should state the new mantainer"
      );
      assert.equal(
        await hashtagSimpleDeal.payoutAddress.call(),
        maintainerAddress,
        "Maintainer address not correct"
      );
    });

    it("should set the hashtagFee", async function() {
      const result = await hashtagSimpleDeal.setHashtagFee(hashtagFee);
      gasUsedRegister.setHashtagFee = result.receipt.gasUsed;
      const hashtagFeeSet = result.logs.find(
        log => log.event == "HashtagFeeSet"
      );
      assert.ok(hashtagFeeSet, "HashtagFeeSet event not found");
      assert.equal(
        hashtagFeeSet.args.hashtagFee,
        hashtagFee,
        "HashtagFeeSet event argument should state the new hashtagFee"
      );
      assert.equal(
        await hashtagSimpleDeal.hashtagFee.call(),
        hashtagFee,
        "Hashtag fee not correct"
      );
    });

    it("should set the hashtagMetadataHash", async function() {
      const result = await hashtagSimpleDeal.setMetadataHash(
        hashtagMetadataHash
      );
      gasUsedRegister.setMetadataHash = result.receipt.gasUsed;
      const metadataHashSet = result.logs.find(
        log => log.event == "MetadataHashSet"
      );
      assert.ok(metadataHashSet, "MetadataHashSet event not found");
      assert.equal(
        metadataHashSet.args.hashtagMetadataHash,
        hashtagMetadataHash,
        "MetadataHashSet event argument should state the new mantainer"
      );
      assert.equal(
        await hashtagSimpleDeal.hashtagMetadataHash.call(),
        hashtagMetadataHash,
        "hashtagMetadataHash not correct"
      );
    });
  });

  describe("Normal item flow", function() {
    const itemValue = web3.utils.toWei("1");
    const amount = add(itemValue, div(hashtagFee, 2));
    const itemMetadataHash = web3.utils.sha3("item metadata" + Math.random());
    const replyMetadataHash = web3.utils.sha3("reply metadata" + Math.random());
    // Known in advance because the contract is empty
    const itemId = "0";
    let txBlockNumber;

    it("Seeker should create a new item", async function() {
      // Cache parameters before transaction
      const seekerBalBefor = await balanceOf(seekerAddress);
      const hashtagBalBefor = await balanceOf(hashtagSimpleDeal.address);

      const extraData = web3.eth.abi.encodeParameters(
        ["uint256", "bytes32"],
        ["1", itemMetadataHash]
      );
      const result = await erc677BridgeToken.transferAndCall(
        hashtagSimpleDeal.address,
        amount,
        extraData,
        { from: seekerAddress }
      );
      gasUsedRegister.newItem = result.receipt.gasUsed;
      txBlockNumber = result.receipt.blockNumber;

      // Check that the NewItem log happened. It needs to be fetched independently
      // since the result object only contains logs from the `to` address.
      const events = await hashtagSimpleDeal.getPastEvents(
        "NewItem",
        lastBlock(result)
      );
      assert.equal(events.length, 1, "There must be 1 NewItem event");
      assertObjProps(events[0].returnValues, {
        owner: seekerAddress,
        itemId,
        itemValue,
        itemMetadataHash
      });

      // The item count should go up by one
      const itemCount = await hashtagSimpleDeal.getItemCount();
      assert.equal(itemCount, 1, "Item count must be 1");

      // Check that the token balance of the hashtagList is correct
      const seekerBalAftr = await balanceOf(seekerAddress);
      const hashtagBalAftr = await balanceOf(hashtagSimpleDeal.address);

      const seekerBalDiff = sub(seekerBalAftr, seekerBalBefor);
      const hashtagBalDiff = sub(hashtagBalAftr, hashtagBalBefor);

      assert.equal(
        hashtagBalDiff,
        amount,
        "Hashtag balance diff must = amount"
      );
      assert.equal(
        seekerBalDiff,
        "-" + amount,
        "Seeker balance diff must = - amount"
      );
    });

    it("Should query the data of the newly created item", async function() {
      // Get the last item. assertObjProps auto converts BN instances to strings
      const item = await hashtagSimpleDeal.getItem(itemId);
      assertObjProps(item, {
        _status: "0",
        _replyCount: "0",
        _creationBlock: txBlockNumber,
        _hashtagFee: hashtagFee,
        _itemValue: itemValue,
        _seekerAddress: seekerAddress,
        _providerAddress: web3.utils.padLeft("0x0", 40),
        _itemMetadataHash: itemMetadataHash
      });
    });

    it("Replier should reply to the item", async function() {
      const result = await hashtagSimpleDeal.replyItem(
        itemId,
        replyMetadataHash,
        { from: providerAddress }
      );
      gasUsedRegister.replyItem = result.receipt.gasUsed;
      txBlockNumber = result.receipt.blockNumber;

      // Check that the NewItem log happened. It needs to be fetched independently
      // since the result object only contains logs from the `to` address.
      const events = await hashtagSimpleDeal.getPastEvents(
        "ReplyItem",
        lastBlock(result)
      );
      assert.equal(events.length, 1, "There must be 1 NewItem event");
      assertObjProps(events[0].returnValues, {
        replier: providerAddress,
        itemId,
        replyMetadataHash
      });

      // The reply count of this item should go up by 1
      const item = await hashtagSimpleDeal.getItem(itemId);
      assert.equal(item._replyCount, "1", "item.replyCount not correct");
    });

    it("Seeker should select the replier as provider", async function() {
      const result = await hashtagSimpleDeal.selectReplier(
        itemId,
        providerAddress,
        { from: seekerAddress }
      );
      gasUsedRegister.selectReplier = result.receipt.gasUsed;
      txBlockNumber = result.receipt.blockNumber;

      // Check that the NewItem log happened. It needs to be fetched independently
      // since the result object only contains logs from the `to` address.
      const events = await hashtagSimpleDeal.getPastEvents(
        "ItemChange",
        lastBlock(result)
      );
      assert.equal(events.length, 1, "There must be 1 ItemChange event");
      const changeItem = events[0].returnValues;
      assert.equal(
        changeItem.providerAddress,
        providerAddress,
        "changeItem.providerAddress must = providerAddress"
      );
      // The provider of this item should equal the provider address
      const item = await hashtagSimpleDeal.getItem(itemId);
      assert.equal(
        item._providerAddress,
        providerAddress,
        "item._providerAddress not correct"
      );
    });

    it("Provider should fund the item", async function() {
      // Cache parameters before transaction
      const providerBalBefor = await balanceOf(providerAddress);
      const hashtagBalBefor = await balanceOf(hashtagSimpleDeal.address);

      const extraData = web3.eth.abi.encodeParameters(
        ["uint256", "uint256"],
        ["2", itemId]
      );
      const result = await erc677BridgeToken.transferAndCall(
        hashtagSimpleDeal.address,
        amount,
        extraData,
        { from: providerAddress }
      );

      // Check that the token balance of the hashtagList, seeker and provider is correct
      const providerBalAftr = await balanceOf(providerAddress);
      const hashtagBalAftr = await balanceOf(hashtagSimpleDeal.address);

      const providerBalDiff = sub(providerBalAftr, providerBalBefor);
      const hashtagBalDiff = sub(hashtagBalAftr, hashtagBalBefor);

      assert.equal(
        hashtagBalDiff,
        amount,
        "Hashtag balance diff must = amount"
      );
      assert.equal(
        providerBalDiff,
        "-" + amount,
        "provider balance diff must = - amount"
      );

      gasUsedRegister.fundItem = result.receipt.gasUsed;
      txBlockNumber = result.receipt.blockNumber;
    });

    it("Seeker should payout the item", async function() {
      // Cache parameters before transaction
      const providerBalBefor = await balanceOf(providerAddress);
      const hashtagBalBefor = await balanceOf(hashtagSimpleDeal.address);

      const result = await hashtagSimpleDeal.payoutItem(itemId, {
        from: seekerAddress
      });
      gasUsedRegister.payoutItem = result.receipt.gasUsed;
      txBlockNumber = result.receipt.blockNumber;

      // Check that the token balance of the hashtagList, seeker and provider is correct
      const providerBalAftr = await balanceOf(providerAddress);
      const hashtagBalAftr = await balanceOf(hashtagSimpleDeal.address);

      const providerBalDiff = sub(providerBalAftr, providerBalBefor);
      const hashtagBalDiff = sub(hashtagBalAftr, hashtagBalBefor);
      const hashtagBalanceLoss = add(mul(itemValue, 2), hashtagFee);
      const providerGain = mul(itemValue, 2);

      assert.equal(
        providerBalDiff,
        providerGain,
        "provider balance diff must = amount * 2"
      );

      assert.equal(
        hashtagBalDiff,
        "-" + hashtagBalanceLoss,
        "Hashtag balance diff must = - itemValue * 2 + hashtagFee"
      );

      assert.equal(
        await hashtagSimpleDeal.seekerReputation(seekerAddress),
        5,
        "Seeker rep amount not correct"
      );

      assert.equal(
        await hashtagSimpleDeal.providerReputation(providerAddress),
        5,
        "Provider rep amount not correct"
      );
    });
  });

  describe("Dispute item flow", function() {
    const itemValue = web3.utils.toWei("1");
    const amount = add(itemValue, div(hashtagFee, 2));
    const itemMetadataHash = web3.utils.sha3("item metadata" + Math.random());
    const replyMetadataHash = web3.utils.sha3("reply metadata" + Math.random());
    // Known in advance because the contract is empty
    const itemId = "1";
    let txBlockNumber;

    it("Seeker should create a new item", async function() {
      const extraData = web3.eth.abi.encodeParameters(
        ["uint256", "bytes32"],
        ["1", itemMetadataHash]
      );
      const result = await erc677BridgeToken.transferAndCall(
        hashtagSimpleDeal.address,
        amount,
        extraData,
        { from: seekerAddress }
      );
      gasUsedRegister.newItem = result.receipt.gasUsed;
      txBlockNumber = result.receipt.blockNumber;

      // Check that the NewItem log happened. It needs to be fetched independently
      // since the result object only contains logs from the `to` address.
      const events = await hashtagSimpleDeal.getPastEvents(
        "NewItem",
        lastBlock(result)
      );
      assert.equal(events.length, 1, "There must be 1 NewItem event");
      assertObjProps(events[0].returnValues, {
        owner: seekerAddress,
        itemId,
        itemValue,
        itemMetadataHash
      });

      // The item count should go up by one
      const itemCount = await hashtagSimpleDeal.getItemCount();
      assert.equal(itemCount, 2, "Item count must be 2");
    });

    it("Should query the data of the newly created item", async function() {
      // Get the last item
      const item = await hashtagSimpleDeal.getItem(itemId);
      assertObjProps(item, {
        _status: "0",
        _replyCount: "0",
        _creationBlock: txBlockNumber,
        _hashtagFee: hashtagFee,
        _itemValue: itemValue,
        _seekerAddress: seekerAddress,
        _providerAddress: web3.utils.padLeft("0x0", 40),
        _itemMetadataHash: itemMetadataHash
      });
    });

    it("Replier should reply to the item", async function() {
      const result = await hashtagSimpleDeal.replyItem(
        itemId,
        replyMetadataHash,
        { from: providerAddress }
      );
      gasUsedRegister.replyItem = result.receipt.gasUsed;
      txBlockNumber = result.receipt.blockNumber;

      // Check that the NewItem log happened. It needs to be fetched independently
      // since the result object only contains logs from the `to` address.
      const events = await hashtagSimpleDeal.getPastEvents(
        "ReplyItem",
        lastBlock(result)
      );
      assert.equal(events.length, 1, "There must be 1 NewItem event");
      assertObjProps(events[0].returnValues, {
        replier: providerAddress,
        itemId,
        replyMetadataHash
      });

      // The reply count of this item should go up by 1
      const item = await hashtagSimpleDeal.getItem(itemId);
      assertObjProps(item, { _replyCount: "1" });
    });

    it("Seeker should select the replier as provider", async function() {
      const result = await hashtagSimpleDeal.selectReplier(
        itemId,
        providerAddress,
        { from: seekerAddress }
      );
      gasUsedRegister.selectReplier = result.receipt.gasUsed;
      txBlockNumber = result.receipt.blockNumber;

      // Check that the NewItem log happened. It needs to be fetched independently
      // since the result object only contains logs from the `to` address.
      const events = await hashtagSimpleDeal.getPastEvents(
        "ItemChange",
        lastBlock(result)
      );
      assert.equal(events.length, 1, "There must be 1 ItemChange event");
      const changeItem = events[0].returnValues;
      assert.equal(
        changeItem.providerAddress,
        providerAddress,
        "changeItem.providerAddress must = providerAddress"
      );
      // The provider of this item should equal the provider address
      const item = await hashtagSimpleDeal.getItem(itemId);
      assertObjProps(item, { _providerAddress: providerAddress });
    });

    it("Provider should fund the item", async function() {
      // Cache parameters before transaction
      const providerBalBefor = await balanceOf(providerAddress);
      const hashtagBalBefor = await balanceOf(hashtagSimpleDeal.address);

      const extraData = web3.eth.abi.encodeParameters(
        ["uint256", "uint256"],
        ["2", itemId]
      );

      const result = await erc677BridgeToken.transferAndCall(
        hashtagSimpleDeal.address,
        amount,
        extraData,
        { from: providerAddress }
      );

      // Check that the token balance of the hashtagList, seeker and provider is correct
      const providerBalAftr = await balanceOf(providerAddress);
      const hashtagBalAftr = await balanceOf(hashtagSimpleDeal.address);
      const providerBalDiff = sub(providerBalAftr, providerBalBefor);
      const hashtagBalDiff = sub(hashtagBalAftr, hashtagBalBefor);

      assert.equal(
        hashtagBalDiff,
        amount,
        "Hashtag balance diff must = amount"
      );
      assert.equal(
        providerBalDiff,
        "-" + amount,
        "provider balance diff must = - amount"
      );

      gasUsedRegister.fundItem = result.receipt.gasUsed;
      txBlockNumber = result.receipt.blockNumber;
    });

    it("Seeker should dispute the item", async function() {
      const result = await hashtagSimpleDeal.disputeItem(itemId, {
        from: seekerAddress
      });
      gasUsedRegister.disputeItem = result.receipt.gasUsed;
      txBlockNumber = result.receipt.blockNumber;

      // Check that the NewItem log happened. It needs to be fetched independently
      // since the result object only contains logs from the `to` address.
      const events = await hashtagSimpleDeal.getPastEvents(
        "ItemChange",
        lastBlock(result)
      );
      assert.equal(events.length, 1, "There must be 1 ItemChange event");
      const changeItem = events[0].returnValues;
      assert.equal(
        changeItem.providerAddress,
        providerAddress,
        "changeItem.providerAddress must = providerAddress"
      );
      // The provider of this item should equal the provider address
      const item = await hashtagSimpleDeal.getItem(itemId);
      assert.equal(
        item._providerAddress,
        providerAddress,
        "item._providerAddress not correct"
      );
      assert.equal(item._status, 3, "item._status not correct");
    });

    it("Maintainer should resolve the item", async function() {
      // Cache parameters before transaction
      const providerBalBefor = await balanceOf(providerAddress);
      const seekerBalBefor = await balanceOf(seekerAddress);
      const hashtagBalBefor = await balanceOf(hashtagSimpleDeal.address);

      const seekerFaction = web3.utils.toWei("0.5");

      const result = await hashtagSimpleDeal.resolveItem(
        itemId,
        seekerFaction,
        { from: maintainerAddress }
      );
      gasUsedRegister.resolveItem = result.receipt.gasUsed;
      txBlockNumber = result.receipt.blockNumber;

      // Check that the token balance of the hashtagList, seeker and provider is correct
      const providerBalAftr = await balanceOf(providerAddress);
      const seekerBalAftr = await balanceOf(seekerAddress);
      const hashtagBalAftr = await balanceOf(hashtagSimpleDeal.address);

      const providerBalDiff = sub(providerBalAftr, providerBalBefor);
      const seekerBalDiff = sub(seekerBalAftr, seekerBalBefor);
      const hashtagBalDiff = sub(hashtagBalAftr, hashtagBalBefor);

      const providerGain = sub(mul(itemValue, 2), seekerFaction);
      const seekerGain = web3.utils.toBN(seekerFaction).toString();
      const hashtagBalanceLoss = add(mul(itemValue, 2), hashtagFee);

      assert.equal(
        providerBalDiff,
        providerGain,
        "provider balance diff must = amount * 2 - seekerFaction"
      );

      assert.equal(
        seekerBalDiff,
        seekerGain,
        "seeker balance diff must = seekerFaction"
      );

      assert.equal(
        hashtagBalDiff,
        "-" + hashtagBalanceLoss,
        "Hashtag balance diff must = - itemValue * 2 + hashtagFee"
      );
    });
  });

  // Print gas used in console to know how expensive is each action
  after(function() {
    console.log("  Gas cost of each method");
    console.log("  =======================");
    console.log(gasUsedRegister);
  });
});
