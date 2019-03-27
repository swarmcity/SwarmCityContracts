const HashtagSimpleDeal = artifacts.require("HashtagSimpleDeal");
const ERC677BridgeToken = artifacts.require("ERC677BridgeToken");
const HashtagList = artifacts.require("HashtagList");
const randomItemGenerator = require("../utilities/randomItemGenerator");

const { toBN, toWei } = web3.utils;
const numOfItems = 10;

const balanceToMint = toWei("10000");

module.exports = function(deployer, network, accounts) {
  deployer.then(async () => {
    // Get contract instances
    let hashtagList = await HashtagList.deployed();
    let erc677BridgeToken = await ERC677BridgeToken.deployed();
    let hashtagSimpleDeal = await HashtagSimpleDeal.deployed();

    // List the current hashtag in the hashtag list
    await hashtagList.addHashtag(HashtagSimpleDeal.address);
    const hashtags = await hashtagList.getHashtags();
    console.log({ hashtags });

    // Mint tokens to the item creator
    await erc677BridgeToken.mint(accounts[0], balanceToMint);
    const balanceAfterMint = await erc677BridgeToken
      .balanceOf(accounts[0])
      .then(res => res.toString());
    console.log({ balanceAfterMint });

    // Create some items in the hashtag
    const hashtagFee = await hashtagSimpleDeal.hashtagFee();
    await Promise.all(
      linspace(numOfItems).map(async i => {
        const { itemValue, itemMetadataHash } = await randomItemGenerator();
        const extraData = web3.eth.abi.encodeParameters(
          ["uint256", "bytes32"],
          ["1", itemMetadataHash]
        );
        const amount = toWei(toBN(itemValue)).add(
          toBN(hashtagFee).div(toBN(2))
        );
        await erc677BridgeToken.transferAndCall(
          hashtagSimpleDeal.address,
          amount,
          extraData
        );
        console.log({ i, amount, itemMetadataHash });
      })
    );

    // Read item states
    const itemCount = await hashtagSimpleDeal.getItemCount();
    console.log(`Created ${itemCount.toString()} items`);

    // return Promise.all([
    //   PRInstance.init(
    //     DistributeToken.address,
    //     TokenRegistry.address,
    //     ReputationRegistry.address,
    //     PLCRVoting.address
    //   ),
    //   TRInstance.init(
    //     DistributeToken.address,
    //     ProjectRegistry.address,
    //     PLCRVoting.address
    //   ),
    //   RRInstance.init(
    //     DistributeToken.address,
    //     ProjectRegistry.address,
    //     PLCRVoting.address
    //   )
    // ]);
  });
};

function linspace(n) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr.push(i);
  }
  return arr;
}
