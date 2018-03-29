const { assertRevert } = require('./helpers/assertThrow')
const getContract = name => artifacts.require(name)


contract('HashtagProxy', (accounts) => {
    const TTL = 3600;
    const HASHTAGNAME = "HashtagName";
    const IPFSHASH = "QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn";
    const OTHERIPFSHASH = "Qm1X345qqfHbsf67hvA3NnUNLLsPACCz1vLxQVkXqqLX5R";
    
    const {
        0: oldOwner,
        1: newOwner
    } = accounts;

    let HashtagProxy

    before(async () => {
        HashtagProxy = await getContract('HashtagProxy').new()
    })

    it("Should have an owner assigned to msg.sender initially", async () => {
        assert.equal(await HashtagProxy.owner(), oldOwner);
    });

    it("Should not change owner to 0x0", async () => {
        return assertRevert(async () => {
            const result = await HashtagProxy.transferOwnership("0x0");
        })
    });

    it("Should change owner after changeOwnership call, and generate a log event", async () => {
        const result = await HashtagProxy.transferOwnership(newOwner);
        assert.isTrue(await HashtagProxy.owner() === newOwner);

        //Check log event
        assert.equal(result.logs.length, 1);
        assert.equal(result.logs[0].event, "OwnershipTransferred");
        assert.equal(result.logs[0].args.previousOwner, oldOwner);
        assert.equal(result.logs[0].args.newOwner, newOwner);
    });

    it('Should not change the TTL value if the call is not made by the owner', async () => {
        return assertRevert(async () => {
            await HashtagProxy.setTTL(TTL, { from: oldOwner })
        })
    })

    it('Should change the TTL value when it is call by the owner', async () => {
        await HashtagProxy.setTTL(TTL, { from: newOwner })
        assert.equal(await HashtagProxy.defaultTTL.call(), TTL)

    })

    it('Should not create a new Hastag if the call is not made by the owner', async () => {
        return assertRevert(async () => {
            await HashtagProxy.setHashtag(HASHTAGNAME, IPFSHASH, { from: oldOwner })
        })
    })

    it('Should not create a new Hastag without a name', async () => {
        return assertRevert(async () => {
            await HashtagProxy.setHashtag("", "", { from: newOwner })
        })
    })

    it('Should not create a new Hastag without a name even if it has an IPFS hash', async () => {
        return assertRevert(async () => {
            await HashtagProxy.setHashtag("", IPFSHASH, { from: newOwner })
        })
    })

    it('Should not unset a non existing Hastag', async () => {
        return assertRevert(async () => {
            await HashtagProxy.setHashtag(HASHTAGNAME, "", { from: newOwner })
        })
    })

    it('Should create a new Hastag', async () => {
        const result = await HashtagProxy.setHashtag(HASHTAGNAME, IPFSHASH, { from: newOwner })
        assert.equal(await HashtagProxy.getHashtagMetadata(HASHTAGNAME), IPFSHASH)

        //Check log events
        assert.equal(result.logs.length, 2, "It should create 2 events: HashAdded and HashtagSet");

        assert.equal(result.logs[0].event, "HashAdded");
        assert.equal(result.logs[0].args.pubKey, HashtagProxy.address);
        assert.equal(result.logs[0].args.hashAdded, IPFSHASH);

        assert.equal(result.logs[1].event, "HashtagSet");
        assert.equal(result.logs[1].args.hashtagName, HASHTAGNAME);
        assert.equal(result.logs[1].args.ipfsHash, IPFSHASH);

    })

    it('Should update a Hastag', async () => {
        const result = await HashtagProxy.setHashtag(HASHTAGNAME, OTHERIPFSHASH, { from: newOwner })
        assert.equal(await HashtagProxy.getHashtagMetadata(HASHTAGNAME), OTHERIPFSHASH)

        //Check log events
        assert.equal(result.logs.length, 3, "It should create 2 events: HashAdded and HashtagSet");

        assert.equal(result.logs[0].event, "HashRemoved");
        assert.equal(result.logs[0].args.pubKey, HashtagProxy.address);
        assert.equal(result.logs[0].args.hashRemoved, IPFSHASH);

        assert.equal(result.logs[1].event, "HashAdded");
        assert.equal(result.logs[1].args.pubKey, HashtagProxy.address);
        assert.equal(result.logs[1].args.hashAdded, OTHERIPFSHASH);

        assert.equal(result.logs[2].event, "HashtagSet");
        assert.equal(result.logs[2].args.hashtagName, HASHTAGNAME);
        assert.equal(result.logs[2].args.ipfsHash, OTHERIPFSHASH);

    })

    it('Should unset a Hastag', async () => {
        const previousHash = await HashtagProxy.getHashtagMetadata(HASHTAGNAME)
        const result = await HashtagProxy.setHashtag(HASHTAGNAME, "", { from: newOwner })
        assert.equal(await HashtagProxy.getHashtagMetadata(HASHTAGNAME), "")

        //Check log events
        assert.equal(result.logs.length, 2, "It should create 2 events: HashAdded and HashtagSet");

        assert.equal(result.logs[0].event, "HashRemoved");
        assert.equal(result.logs[0].args.pubKey, HashtagProxy.address);
        assert.equal(result.logs[0].args.hashRemoved, previousHash);

        assert.equal(result.logs[1].event, "HashtagSet");
        assert.equal(result.logs[1].args.hashtagName, HASHTAGNAME);
        assert.equal(result.logs[1].args.ipfsHash, "");
    })
})