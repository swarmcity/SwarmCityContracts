// HashtagList
const HashtagList = artifacts.require("HashtagList");
const HashtagSimpleDeal = artifacts.require("HashtagSimpleDeal");

const HashtagStatus = ["NonExistent", "Enabled", "Disabled"];

contract("HashtagList", accounts => {
  // Deployed instances
  let hashtagList;
  let hashtagSimpleDeal;
  let hashtagAddress;

  before(async function() {
    hashtagList = await HashtagList.deployed();
    hashtagSimpleDeal = await HashtagSimpleDeal.deployed();
    hashtagAddress = hashtagSimpleDeal.address;
  });

  describe("Add a hashtag on edit it's status", function() {
    it(`Should add the hashtagSimpleDeal to the hashtagList`, async () => {
      const result = await hashtagList.addHashtag(hashtagAddress);
      const hashtagAdded = result.logs[0];
      assert.equal(hashtagAdded.event, "HashtagAdded");
      assert.equal(hashtagAdded.args.hashtagAddress, hashtagAddress);
    });

    it(`Should disable the hashtag and retrieve it`, async () => {
      const statusBefore = await hashtagList.hashtagsStatus(hashtagAddress);
      await hashtagList.disableHashtag(hashtagAddress);
      const statusAfter = await hashtagList.hashtagsStatus(hashtagAddress);
      assert.equal(HashtagStatus[statusBefore], "Enabled");
      assert.equal(HashtagStatus[statusAfter], "Disabled");
    });

    it(`Should enable the hashtag and retrieve it`, async () => {
      const statusBefore = await hashtagList.hashtagsStatus(hashtagAddress);
      await hashtagList.enableHashtag(hashtagAddress);
      const statusAfter = await hashtagList.hashtagsStatus(hashtagAddress);
      assert.equal(HashtagStatus[statusBefore], "Disabled");
      assert.equal(HashtagStatus[statusAfter], "Enabled");
    });

    it(`Should retrieve the hashtags using the array and mapping`, async () => {
      const hashtags = await hashtagList.getHashtags();
      const enabled = await hashtagList.hashtagsStatus(hashtags[0]);
      assert.equal(Array.isArray(hashtags), true);
      assert.equal(hashtags.length, 1);
      assert.equal(enabled, 1);
    });
  });
});
