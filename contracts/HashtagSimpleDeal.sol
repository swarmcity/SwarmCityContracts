pragma solidity >=0.4.22 <0.6.0;

/**
*  @title Simple Deal Hashtag
*  @dev Created in Swarm City anno 2017,
*  for the world, with love.
*  description Symmetrical Escrow Deal Contract
*  description This is the hashtag contract for creating Swarm City marketplaces.
*  It's the first, most simple approach to making Swarm City work.
*  This contract creates "SimpleDeals".
*/

import "./Ownable.sol";
import "./SafeMath.sol";

contract Erc20Token {
    function transfer(address _to, uint256 _value) public returns (bool);
}

contract HashtagSimpleDeal is Ownable {
    using SafeMath256 for uint256;
    using SafeMath128 for uint128;

    Erc20Token public token;
    address public payoutAddress;
    string public hashtagName;
    uint public hashtagFee;
    /// @dev using bytes32 instead of string, * ref https://ethereum.stackexchange.com/questions/17094/how-to-store-ipfs-hash-using-bytes
    bytes32 public hashtagMetadataHash;
    uint public deployBlock;

    /// @notice itemStatuses enum
    enum itemStatuses {
		Open,
        Funded,
		Done,
		Disputed,
		Resolved,
		Cancelled
    }

    /// @notice Defines the item data
    /// @param status enum / uint64 defining the item stage
    /// @param replyCount Helps the user experience to communicate the success interest of an item on the front-end
    /// @param creationBlock Indicates the creation time + the client can query this item's events from creationBlock to latest
    /// @param hashtagFee Locks the hashtagFee on creation time. Prevents to hashtag owner alter its reward during an item's activity
    /// @param itemValue Item value. Uses uint128 for packing, max itemValue = 3.4e20 < SWT total supply
    /// @param seekerAddress Owner, creator of the item.
    /// @param providerAddress Buyer, consumer of the item. Must be selected by the seeker and fund the deal afterwards
    /// @param itemMetadataHash Bytes32 of the IPFS hash describing the item's metadata
    struct itemStruct {
        uint64 status;
        uint64 replyCount;
        uint128 creationBlock;
        uint128 hashtagFee;
        uint128 itemValue;
        address seekerAddress;
        address providerAddress;
        bytes32 itemMetadataHash;
    }

    /// @notice An item is identified by `itemId` which is its position on the items array
    itemStruct[] public items;

    /// @notice As the reputation is linked to each contract it does not make sense to store it in a separate ERC20 contract
    mapping(address => uint256) public seekerReputation;
    mapping(address => uint256) public providerReputation;

    /// @notice Indicates a new item was created. Index by owner = user to get items created by the user
    event NewItem(address indexed owner, uint itemId, uint itemValue, bytes32 itemMetadataHash);
    /// @notice Indicates a new reply was logged. Index by replier = user to get items with participation
    event ReplyItem(address indexed replier, uint indexed itemId, bytes32 replyMetadataHash);
    /// @notice Indicates an item state change. Index by itemId to get the full history of an item's state
    event ItemChange(uint indexed itemId, itemStatuses status, address providerAddress);

    /// @notice Indicates the new `payoutAddress`.
    event PayoutAddressSet(address payoutAddress);
    /// @notice Indicates the new `newHashtagFee`.
    event HashtagFeeSet(uint newHashtagFee);
    /// @notice Indicates the new `hashtagMetadataHash`.
    event MetadataHashSet(bytes32 hashtagMetadataHash);

    /// @notice Initializes the basic hashtag parameters
    /// @param _token Address of the token contract. Only token transfers from this address will be authorized at onTokenTransfer
    /// @param _hashtagName String name of the hashtag, it is recommended to be short.
    /// @param _hashtagFee Uint token amount. All seekers and providers must pay this fee on newItem and fundItem respectively
    /// @param _hashtagMetadataHash Bytes32 of the IPFS hash describing the hashtag's metadata
    constructor(address _token, string memory _hashtagName, uint _hashtagFee, bytes32 _hashtagMetadataHash) public {
        hashtagName = _hashtagName;
        hashtagFee = _hashtagFee;
        hashtagMetadataHash = _hashtagMetadataHash;
        token = Erc20Token(_token);
        payoutAddress = msg.sender;
        /// @dev Set creation block so the client can query events from deployBlock to latest
        deployBlock = block.number;
    }

    /// @notice Sets the hashtag mantainer address. 
    /// This address will be responsible to resolve all items disputes
    /// All hashtagFees will be payed immidiately to this address
    /// @param _payoutAddress Address of the new hashtag mantainer
    function setPayoutAddress(address _payoutAddress) external onlyOwner {
        require(_payoutAddress != address(0), "Address must not be 0");
        payoutAddress = _payoutAddress;
        emit PayoutAddressSet(_payoutAddress);
    }

    /// @notice Sets the hashtag fee. It will only affect items created after this transaction 
    /// @param _newHashtagFee Uint token amount.
    function setHashtagFee(uint _newHashtagFee) external onlyOwner {
        hashtagFee = _newHashtagFee;
        emit HashtagFeeSet(_newHashtagFee);
    }

    /// @notice Sets the hashtag metadata hash. 
    /// @param _hashtagMetadataHash Bytes32 of the IPFS hash describing the hashtag's metadata
    function setMetadataHash(bytes32 _hashtagMetadataHash) external onlyOwner  {
        require(_hashtagMetadataHash != 0, "Hash must not be 0");
        hashtagMetadataHash = _hashtagMetadataHash;
        emit MetadataHashSet(_hashtagMetadataHash);
    }

    /// @notice Token receiver function compatible with ERC677. 
    /// Can only be called by the token contract, as a result of a token transfer
    /// It is must trigger an internal call to either newItem or fundItem
    /// @param _msgsender `msg.sender` of the token transfer to the token contract
    /// @param _amount Token amount transfered
    /// @param _extraData Extra data attached to the token transfer
    /// Acts as a switch to select the internal function and contains the necessary data
    /// Since both internal methods only have one parameter of static length 32 bytes _extraData must be:
    /// _extraData = (bytes32 functionSelector, bytes32 itemIdOrMetadata)
    /// functionSelector must be:
    /// - 0x0000000000000000000000000000000000000000000000000000000000000001: newItem
    /// - 0x0000000000000000000000000000000000000000000000000000000000000002: fundItem
    function onTokenTransfer(address _msgsender, uint256 _amount, bytes memory _extraData) public {
        require(msg.sender == address(token));
        (bytes32 functionSelector, bytes32 itemIdOrMetadata) = abi.decode(_extraData, (bytes32, bytes32));
        if (functionSelector == 0x0000000000000000000000000000000000000000000000000000000000000001) {        
            newItem(_msgsender, _amount, itemIdOrMetadata);
        } else if (functionSelector == 0x0000000000000000000000000000000000000000000000000000000000000002) {
            fundItem(_msgsender, _amount, uint(itemIdOrMetadata));
        } else {
            revert("Unknown functionSelector");
        }    
    }

    /// @notice Creates a new item, given a token amount and a metadata hash
    /// @dev Internal function called by onTokenTransfer
    /// @param _seekerAddress Address that will own this item
    /// @param _amount Uint amount of tokens transfered = itemValue + hashtagFee / 2
    /// @param _itemMetadataHash Bytes32 of the IPFS hash describing the item's metadata
    function newItem(address _seekerAddress, uint _amount, bytes32 _itemMetadataHash) internal {
        uint itemValue = _amount.sub(hashtagFee / 2);

        /// @dev Initialize item struct. 
        /// @dev Properties: status, replyCount and providerAddress are zero therefore not initialized
        itemStruct memory item;
        item.creationBlock = uint128(block.number);
        item.hashtagFee = uint128(hashtagFee);
        item.itemValue = uint128(itemValue);
        item.seekerAddress = _seekerAddress;
        item.itemMetadataHash = _itemMetadataHash;
        
        uint itemId = items.push(item);

        emit NewItem(_seekerAddress, itemId, itemValue, _itemMetadataHash);
    }

    /// @notice Pre-authorized selectee funds the deal by transfering itemValue + hashtagFee / 2
    /// @dev Internal function called by onTokenTransfer
    /// @param _providerAddress Address that will fund the item
    /// @param _amount Uint amount of tokens transfered = itemValue + hashtagFee / 2
    /// @param _itemId Uint identifying the item.
    function fundItem(address _providerAddress, uint _amount, uint _itemId) internal {
        itemStruct storage item = items[_itemId];
        require(item.status == uint64(itemStatuses.Open), "Status must = open");
        require(item.providerAddress == _providerAddress, "Sender must = selectee");
        require(item.itemValue.add(item.hashtagFee / 2) == _amount, "Amount must = iVal+hFee/2");

        item.status = uint64(itemStatuses.Funded);     

        emit ItemChange(_itemId, itemStatuses.Funded, _providerAddress);
    }

    /// @notice Logs a reply as an event and increase the reply count of this item.
    /// @param _itemId Uint identifying the item.
    /// @param _replyMetadataHash Bytes 32 of the UPFS hash describing the reply's metadata
    function replyItem(uint _itemId, bytes32 _replyMetadataHash) external {
        items[_itemId].replyCount++;

        emit ReplyItem(msg.sender, _itemId, _replyMetadataHash);
    }

    /// @notice Item's owner authorizes one address to fund the deal latter
    /// @notice To unselect, call this method with the zero address: selectReplier(itemId, address(0))
    /// @param _itemId Uint identifying the item.
    /// @param _selectedReplier Address of the authorized potential fund-ee
    function selectReplier(uint _itemId, address _selectedReplier) external {
        itemStruct storage item = items[_itemId];
        require(item.status == uint64(itemStatuses.Open), "Status must = open");
        require(item.seekerAddress == msg.sender, "Sender must = seeker");
        
        item.providerAddress = _selectedReplier;

        emit ItemChange(_itemId, itemStatuses.Open, _selectedReplier);
    }

    /// @notice The seeker or the provider dispute the item as a result of a problem states that the item was completed successfully.
    /// Transfers itemValue * 2 (provider's deposit + seeker pay) to the provider
    /// Transfers hashtagFee to the hashtag mantainer
    /// Mints reputation for the seeker and the provider
    /// @param _itemId Uint identifying the item.
    function payoutItem(uint _itemId) external {
        itemStruct storage item = items[_itemId];
        require(item.status == uint64(itemStatuses.Funded), "Status must = funded");
        require(item.seekerAddress == msg.sender, "Sender must = seeker");

        /// @dev Cache the providerAddress in memory to save gas on SLOADs
        address providerAddress = item.providerAddress;
        
        /// @dev Update item state before token transfers
        item.status = uint64(itemStatuses.Done);

        require(token.transfer(payoutAddress, item.hashtagFee), "Transf err - payoutAddr");
        require(token.transfer(providerAddress, item.itemValue * 2), "Transf err - providerAddr");

        /// @dev mint reputation for the seeker and the provider
        seekerReputation[msg.sender] = seekerReputation[msg.sender].add(5);
        providerReputation[providerAddress] = providerReputation[providerAddress].add(5);

        emit ItemChange(_itemId, itemStatuses.Done, providerAddress);
    }

    /// @notice The seeker or the provider dispute the item as a result of a problem cancels the item before it getting funded. 
    /// Transfers itemValue (seeker's pay) to the seeker.
    /// Transfers hashtagFee / 2 to the hashtag mantainer.
    /// @param _itemId Uint identifying the item.
    function cancelItem(uint _itemId) external {
        itemStruct storage item = items[_itemId];
        require(item.status == uint64(itemStatuses.Open), "Status must = open");
        require(item.seekerAddress == msg.sender, "Sender must = seeker");

        /// @dev Update item state before token transfer
        item.status = uint64(itemStatuses.Cancelled);

        require(token.transfer(payoutAddress, item.hashtagFee / 2), "Transf err - payoutAddr");
        require(token.transfer(msg.sender, item.itemValue), "Transf err - seekerAddr");

        emit ItemChange(_itemId, itemStatuses.Cancelled, item.providerAddress);
    }
    
    /// @notice The seeker or the provider dispute the item as a result of a problem. 
    /// The item will remain frozen until the hashtag mantainer resolves the dispute.
    /// The resolution criteria should be based on off-chain communications with both parties.
    /// @param _itemId Uint identifying the item.
    function disputeItem(uint _itemId) external {
        itemStruct storage item = items[_itemId];
        require(item.status == uint64(itemStatuses.Funded), "Status must = funded");
        require(msg.sender == item.seekerAddress || msg.sender == item.providerAddress, "Sender must = seekr or providr");

        item.status = uint64(itemStatuses.Disputed);

        emit ItemChange(_itemId, itemStatuses.Disputed, item.providerAddress);
    } 

    /// @notice The hashtag mantainer resolves a disputed item. 
    /// The resolution includes how many funds go to the seeker and to the provider
    /// The resolution criteria should be based on off-chain communications with both parties.
    /// @param _itemId Uint identifying the item.
    /// @param _seekerFraction Uint token amount to be transfered to the seeker, must _seekerFraction <= itemValue * 2
    function resolveItem(uint _itemId, uint _seekerFraction) external {
        itemStruct storage item = items[_itemId];
        require(msg.sender == payoutAddress, "Sender must = mantainer");
        require(item.status == uint64(itemStatuses.Disputed), "Status must = disputed");
        require(_seekerFraction <= item.itemValue * 2, "seekrfrac must <= iVal*2");

        /// @dev Update item state before token transfer
        item.status = uint64(itemStatuses.Resolved);

        require(token.transfer(item.seekerAddress, _seekerFraction), "Transf err - seekerAddr");
        /// @dev No need to use SafeMath below because _seekerFraction <= item.itemValue * 2 is enforced above
        require(token.transfer(item.providerAddress, item.itemValue * 2 - _seekerFraction), "Transf err - providerAddr");

        emit ItemChange(_itemId, itemStatuses.Resolved, item.providerAddress);
    }

    /// @notice Client data fetching process
    /// Hashtag display: List all items basic metadata + know which items is the user involved
    /// Hashtag: payoutAddress, hashtagName, hashtagMetadataHash, deployBlock, (hashtagFee)
    /// Per item: status, replyCount, creationBlock, itemValue, seekerAddress, providerAddress, (hashtagFee), itemMetadataHash + Am I a replier?
    /// Step 1: Query all hashtag data + getItemsCount()
    /// Step 2A: Get n items: batch request to items(i) from i=itemsCount-n to i=itemsCount
    /// Step 2B: Get all past ReplyItem events indexed with replier = user, to know which items contain a reply by the user
    /// Step 3: Resolve all metadata hashes 

    /// @notice Get the items count
    /// @return Items array length
    function getItemCount() public view returns(uint) {
        return items.length;
    }

    /// @notice Query a single item 
    /// @param _itemId Uint identifying the item.
    /// @return item struct as a tuple
    function getItem(uint _itemId) public view returns(
        uint64 _status,
        uint64 _replyCount,
        uint128 _creationBlock,
        uint128 _hashtagFee,
        uint128 _itemValue,
        address _seekerAddress,
        address _providerAddress,
        bytes32 _itemMetadataHash
    ) {
        itemStruct storage item = items[_itemId];
        return (item.status, item.replyCount, item.creationBlock, item.hashtagFee, item.itemValue, item.seekerAddress, item.providerAddress, item.itemMetadataHash);
    }
}
