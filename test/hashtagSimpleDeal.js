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

  before(async function () {
    erc677BridgeToken = await ERC677BridgeToken.deployed();
    hashtagSimpleDeal = await HashtagSimpleDeal.deployed();
  });

  describe("Fund user's accounts by minting", function () {
    it(`Should mint ${balance} to ${accountsToMint.join(", ")}`, async () => {
      for (const address of accountsToMint) {
        await erc677BridgeToken.mint(address, balance);
        assert.equal(
          await erc677BridgeToken.balanceOf(address),
          balance,
          "Balance is not correct after minting"
        );
      }
    });
  });

  describe("Set contract global variables", function () {
    it("should set the payoutAddress", async function () {
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

    it("should set the hashtagFee", async function () {
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

    it("should set the hashtagMetadataHash", async function () {
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

  describe("Normal item flow", function () {
    const itemValue = web3.utils.toWei("1");
    const amount = web3.utils
      .toBN(itemValue)
      .add(web3.utils.toBN(hashtagFee).div(web3.utils.toBN(2)))
      .toString();
    const itemMetadataHash = web3.utils.sha3("item metadata" + Math.random());
    const replyMetadataHash = web3.utils.sha3("reply metadata" + Math.random());
    let txBlockNumber;
    let itemId;

    it("Seeker should create a new item", async function () {
      // Cache parameters before transaction
      const seekerBalanceBefore = await erc677BridgeToken
        .balanceOf(seekerAddress)
        .then(toString);
      const hashtagBalanceBefore = await erc677BridgeToken
        .balanceOf(hashtagSimpleDeal.address)
        .then(toString);

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
      const newItem = events[0].returnValues;
      itemId = newItem.itemId;
      assert.equal(
        newItem.owner,
        seekerAddress,
        "NewItem.owner must = seekerAddress"
      );
      assert.equal(newItem.itemId, "0", "NewItem.itemId not correct");
      assert.equal(
        newItem.itemValue,
        itemValue,
        "NewItem.itemValue not correct"
      );
      assert.equal(
        newItem.itemMetadataHash,
        itemMetadataHash,
        "NewItem.itemMetadataHash not correct"
      );

      // The item count should go up by one
      const itemCount = await hashtagSimpleDeal.getItemCount();
      assert.equal(itemCount, 1, "Item count must be 1");

      // Check that the token balance of the hashtagList is correct
      const seekerBalanceAfter = await erc677BridgeToken
        .balanceOf(seekerAddress)
        .then(toString);
      const hashtagBalanceAfter = await erc677BridgeToken
        .balanceOf(hashtagSimpleDeal.address)
        .then(toString);

      const seekerBalanceDiff = web3.utils
        .toBN(seekerBalanceAfter)
        .sub(web3.utils.toBN(seekerBalanceBefore))
        .toString();

      const hashtagBalanceDiff = web3.utils
        .toBN(hashtagBalanceAfter)
        .sub(web3.utils.toBN(hashtagBalanceBefore))
        .toString();

      assert.equal(
        hashtagBalanceDiff,
        amount,
        "Hashtag balance diff must = amount"
      );
      assert.equal(
        seekerBalanceDiff,
        "-" + amount,
        "Seeker balance diff must = - amount"
      );
    });

    it("Should query the data of the newly created item", async function () {
      // Get the last item
      const item = await hashtagSimpleDeal.getItem(itemId);
      assert.equal(item._status.toString(), "0", "item.status not correct");
      assert.equal(
        item._replyCount.toString(),
        "0",
        "item.replyCount not correct"
      );
      assert.equal(
        item._creationBlock.toString(),
        txBlockNumber,
        "item.creationBlock not correct"
      );
      assert.equal(
        item._hashtagFee.toString(),
        hashtagFee,
        "item.hashtagFee not correct"
      );
      assert.equal(
        item._itemValue.toString(),
        itemValue,
        "item.itemValue not correct"
      );
      assert.equal(
        item._seekerAddress,
        seekerAddress,
        "item.seekerAddress not correct"
      );
      assert.equal(
        item._providerAddress,
        web3.utils.padLeft("0x0", 40),
        "item.providerAddress not correct"
      );
      assert.equal(
        item._itemMetadataHash,
        itemMetadataHash,
        "item.itemMetadataHash not correct"
      );
    });

    it("Replier should reply to the item", async function () {
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
      const replyItem = events[0].returnValues;
      assert.equal(
        replyItem.replier,
        providerAddress,
        "ReplyItem.replier must = providerAddress"
      );
      assert.equal(replyItem.itemId, itemId, "ReplyItem.itemId not correct");
      assert.equal(
        replyItem.replyMetadataHash,
        replyMetadataHash,
        "ReplyItem.replyMetadataHash not correct"
      );

      // The reply count of this item should go up by 1
      const item = await hashtagSimpleDeal.getItem(itemId);
      assert.equal(
        item._replyCount.toString(),
        "1",
        "item.replyCount not correct"
      );
    });

    it("Seeker should select the replier as provider", async function () {
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

    it("Provider should fund the item", async function () {
      // Cache parameters before transaction
      const providerBalanceBefore = await erc677BridgeToken
        .balanceOf(providerAddress)
        .then(toString);
      const hashtagBalanceBefore = await erc677BridgeToken
        .balanceOf(hashtagSimpleDeal.address)
        .then(toString);
      const extraData = web3.eth.abi.encodeParameters(
        ["uint256", "uint256"],
        ["2", itemId]
      );
      const abiData = erc677BridgeToken.contract.methods.transferAndCall(
        hashtagSimpleDeal.address,
        amount,
        extraData
      ).encodeABI()
      const result = await erc677BridgeToken.transferAndCall(
        hashtagSimpleDeal.address,
        amount,
        extraData,
        { from: providerAddress }
      )

      // Check that the token balance of the hashtagList, seeker and provider is correct
      const providerBalanceAfter = await erc677BridgeToken
        .balanceOf(providerAddress)
        .then(toString);

      const hashtagBalanceAfter = await erc677BridgeToken
        .balanceOf(hashtagSimpleDeal.address)
        .then(toString);

      const providerBalanceDiff = web3.utils
        .toBN(providerBalanceAfter)
        .sub(web3.utils.toBN(providerBalanceBefore))
        .toString();

      const hashtagBalanceDiff = web3.utils
        .toBN(hashtagBalanceAfter)
        .sub(web3.utils.toBN(hashtagBalanceBefore))
        .toString();

      assert.equal(
        hashtagBalanceDiff,
        amount,
        "Hashtag balance diff must = amount"
      );
      assert.equal(
        providerBalanceDiff,
        "-" + amount,
        "provider balance diff must = - amount"
      );

      gasUsedRegister.fundItem = result.receipt.gasUsed;
      txBlockNumber = result.receipt.blockNumber;
    });

    it("Seeker should payout the item", async function () {
      // Cache parameters before transaction
      const providerBalanceBefore = await erc677BridgeToken
        .balanceOf(providerAddress)
        .then(toString);

      const hashtagBalanceBefore = await erc677BridgeToken
        .balanceOf(hashtagSimpleDeal.address)
        .then(toString);

      const result = await hashtagSimpleDeal.payoutItem(
        itemId,
        { from: seekerAddress }
      );
      gasUsedRegister.payoutItem = result.receipt.gasUsed;
      txBlockNumber = result.receipt.blockNumber;

      // Check that the token balance of the hashtagList, seeker and provider is correct
      const providerBalanceAfter = await erc677BridgeToken
        .balanceOf(providerAddress)
        .then(toString);

      const hashtagBalanceAfter = await erc677BridgeToken
        .balanceOf(hashtagSimpleDeal.address)
        .then(toString);

      const providerBalanceDiff = web3.utils
        .toBN(providerBalanceAfter)
        .sub(web3.utils.toBN(providerBalanceBefore))
        .toString();

      const hashtagBalanceDiff = web3.utils
        .toBN(hashtagBalanceAfter)
        .sub(web3.utils.toBN(hashtagBalanceBefore))
        .toString();

      const hashtagBalanceLoss = web3.utils
        .toBN(itemValue).mul(web3.utils.toBN(2))
        .add(web3.utils.toBN(hashtagFee))
        .toString();

      const providerGain = web3.utils
        .toBN(itemValue).mul(web3.utils.toBN(2))
        .toString();

      assert.equal(
        providerBalanceDiff,
        providerGain,
        "provider balance diff must = amount * 2"
      );

      assert.equal(
        hashtagBalanceDiff,
        "-" + hashtagBalanceLoss,
        "Hashtag balance diff must = - itemValue * 2 + hashtagFee"
      );

      assert.equal(
        await hashtagSimpleDeal.seekerReputation(seekerAddress).then(toString),
        5,
        "Seeker rep amount not correct"
      );

      assert.equal(
        await hashtagSimpleDeal.providerReputation(providerAddress).then(toString),
        5,
        "Provider rep amount not correct"
      );
    });
  });

  describe("Dispute item flow", function () {
    const itemValue = web3.utils.toWei("1");
    const amount = web3.utils
      .toBN(itemValue)
      .add(web3.utils.toBN(hashtagFee).div(web3.utils.toBN(2)))
      .toString();
    const itemMetadataHash = web3.utils.sha3("item metadata" + Math.random());
    const replyMetadataHash = web3.utils.sha3("reply metadata" + Math.random());
    let txBlockNumber;
    let itemId;

    it("Seeker should create a new item", async function () {
      // Cache parameters before transaction
      const seekerBalanceBefore = await erc677BridgeToken
        .balanceOf(seekerAddress)
        .then(toString);
      const hashtagBalanceBefore = await erc677BridgeToken
        .balanceOf(hashtagSimpleDeal.address)
        .then(toString);

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
      const newItem = events[0].returnValues;
      itemId = newItem.itemId;
      assert.equal(
        newItem.owner,
        seekerAddress,
        "NewItem.owner must = seekerAddress"
      );
      assert.equal(newItem.itemId, "1", "NewItem.itemId not correct");
      assert.equal(
        newItem.itemValue,
        itemValue,
        "NewItem.itemValue not correct"
      );
      assert.equal(
        newItem.itemMetadataHash,
        itemMetadataHash,
        "NewItem.itemMetadataHash not correct"
      );

      // The item count should go up by one
      const itemCount = await hashtagSimpleDeal.getItemCount();
      assert.equal(itemCount, 2, "Item count must be 2");

      // Check that the token balance of the hashtagList is correct
      const seekerBalanceAfter = await erc677BridgeToken
        .balanceOf(seekerAddress)
        .then(toString);
      const hashtagBalanceAfter = await erc677BridgeToken
        .balanceOf(hashtagSimpleDeal.address)
        .then(toString);

      const seekerBalanceDiff = web3.utils
        .toBN(seekerBalanceAfter)
        .sub(web3.utils.toBN(seekerBalanceBefore))
        .toString();

      const hashtagBalanceDiff = web3.utils
        .toBN(hashtagBalanceAfter)
        .sub(web3.utils.toBN(hashtagBalanceBefore))
        .toString();

      assert.equal(
        hashtagBalanceDiff,
        amount,
        "Hashtag balance diff must = amount"
      );
      assert.equal(
        seekerBalanceDiff,
        "-" + amount,
        "Seeker balance diff must = - amount"
      );
    });

    it("Should query the data of the newly created item", async function () {
      // Get the last item
      const item = await hashtagSimpleDeal.getItem(itemId);
      assert.equal(item._status.toString(), "0", "item.status not correct");
      assert.equal(
        item._replyCount.toString(),
        "0",
        "item.replyCount not correct"
      );
      assert.equal(
        item._creationBlock.toString(),
        txBlockNumber,
        "item.creationBlock not correct"
      );
      assert.equal(
        item._hashtagFee.toString(),
        hashtagFee,
        "item.hashtagFee not correct"
      );
      assert.equal(
        item._itemValue.toString(),
        itemValue,
        "item.itemValue not correct"
      );
      assert.equal(
        item._seekerAddress,
        seekerAddress,
        "item.seekerAddress not correct"
      );
      assert.equal(
        item._providerAddress,
        web3.utils.padLeft("0x0", 40),
        "item.providerAddress not correct"
      );
      assert.equal(
        item._itemMetadataHash,
        itemMetadataHash,
        "item.itemMetadataHash not correct"
      );
    });

    it("Replier should reply to the item", async function () {
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
      const replyItem = events[0].returnValues;
      assert.equal(
        replyItem.replier,
        providerAddress,
        "ReplyItem.replier must = providerAddress"
      );
      assert.equal(replyItem.itemId, itemId, "ReplyItem.itemId not correct");
      assert.equal(
        replyItem.replyMetadataHash,
        replyMetadataHash,
        "ReplyItem.replyMetadataHash not correct"
      );

      // The reply count of this item should go up by 1
      const item = await hashtagSimpleDeal.getItem(itemId);
      assert.equal(
        item._replyCount.toString(),
        "1",
        "item.replyCount not correct"
      );
    });

    it("Seeker should select the replier as provider", async function () {
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

    it("Provider should fund the item", async function () {
      // Cache parameters before transaction
      const providerBalanceBefore = await erc677BridgeToken
        .balanceOf(providerAddress)
        .then(toString);
      const hashtagBalanceBefore = await erc677BridgeToken
        .balanceOf(hashtagSimpleDeal.address)
        .then(toString);
      const extraData = web3.eth.abi.encodeParameters(
        ["uint256", "uint256"],
        ["2", itemId]
      );
      const abiData = erc677BridgeToken.contract.methods.transferAndCall(
        hashtagSimpleDeal.address,
        amount,
        extraData
      ).encodeABI()
      const result = await erc677BridgeToken.transferAndCall(
        hashtagSimpleDeal.address,
        amount,
        extraData,
        { from: providerAddress }
      )

      // Check that the token balance of the hashtagList, seeker and provider is correct
      const providerBalanceAfter = await erc677BridgeToken
        .balanceOf(providerAddress)
        .then(toString);

      const hashtagBalanceAfter = await erc677BridgeToken
        .balanceOf(hashtagSimpleDeal.address)
        .then(toString);

      const providerBalanceDiff = web3.utils
        .toBN(providerBalanceAfter)
        .sub(web3.utils.toBN(providerBalanceBefore))
        .toString();

      const hashtagBalanceDiff = web3.utils
        .toBN(hashtagBalanceAfter)
        .sub(web3.utils.toBN(hashtagBalanceBefore))
        .toString();

      assert.equal(
        hashtagBalanceDiff,
        amount,
        "Hashtag balance diff must = amount"
      );
      assert.equal(
        providerBalanceDiff,
        "-" + amount,
        "provider balance diff must = - amount"
      );

      gasUsedRegister.fundItem = result.receipt.gasUsed;
      txBlockNumber = result.receipt.blockNumber;
    });

    it("Seeker should dispute the item", async function () {
      const result = await hashtagSimpleDeal.disputeItem(
        itemId,
        { from: seekerAddress }
      );
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
      assert.equal(
        item._status,
        3,
        "item._status not correct"
      );
    });

    it("Maintainer should resolve the item", async function () {
      // Cache parameters before transaction
      const providerBalanceBefore = await erc677BridgeToken
        .balanceOf(providerAddress)
        .then(toString);

      const seekerBalanceBefore = await erc677BridgeToken
        .balanceOf(seekerAddress)
        .then(toString);

      const hashtagBalanceBefore = await erc677BridgeToken
        .balanceOf(hashtagSimpleDeal.address)
        .then(toString);

      const seekerFaction = web3.utils.toWei("0.5");

      const result = await hashtagSimpleDeal.resolveItem(
        itemId,
        seekerFaction,
        { from: maintainerAddress }
      );
      gasUsedRegister.resolveItem = result.receipt.gasUsed;
      txBlockNumber = result.receipt.blockNumber;

      // Check that the token balance of the hashtagList, seeker and provider is correct
      const providerBalanceAfter = await erc677BridgeToken
        .balanceOf(providerAddress)
        .then(toString);

      const seekerBalanceAfter = await erc677BridgeToken
        .balanceOf(seekerAddress)
        .then(toString);

      const hashtagBalanceAfter = await erc677BridgeToken
        .balanceOf(hashtagSimpleDeal.address)
        .then(toString);

      const providerBalanceDiff = web3.utils
        .toBN(providerBalanceAfter)
        .sub(web3.utils.toBN(providerBalanceBefore))
        .toString();

      const seekerBalanceDiff = web3.utils
        .toBN(seekerBalanceAfter)
        .sub(web3.utils.toBN(seekerBalanceBefore))
        .toString();

      const hashtagBalanceDiff = web3.utils
        .toBN(hashtagBalanceAfter)
        .sub(web3.utils.toBN(hashtagBalanceBefore))
        .toString();

      const providerGain = web3.utils
        .toBN(itemValue)
        .mul(web3.utils.toBN("2"))
        .sub(web3.utils.toBN(seekerFaction))
        .toString();

      const seekerGain = web3.utils
        .toBN(seekerFaction)
        .toString();

      const hashtagBalanceLoss = web3.utils
        .toBN(itemValue)
        .mul(web3.utils.toBN("2"))
        .add(web3.utils.toBN(hashtagFee))
        .toString();

      assert.equal(
        providerBalanceDiff,
        providerGain,
        "provider balance diff must = amount * 2 - seekerFaction"
      );

      assert.equal(
        seekerBalanceDiff,
        seekerGain,
        "seeker balance diff must = seekerFaction"
      );

      assert.equal(
        hashtagBalanceDiff,
        "-" + hashtagBalanceLoss,
        "Hashtag balance diff must = - itemValue * 2 + hashtagFee"
      );

      assert.equal(
        await hashtagSimpleDeal.seekerReputation(seekerAddress).then(toString),
        5,
        "Seeker rep amount not correct"
      );

      assert.equal(
        await hashtagSimpleDeal.providerReputation(providerAddress).then(toString),
        5,
        "Provider rep amount not correct"
      );
    });
  });

  // Print gas used in console to know how expensive is each action
  after(function () {
    console.log("  Gas cost of each method");
    console.log("  =======================");
    console.log(gasUsedRegister);
  });
});