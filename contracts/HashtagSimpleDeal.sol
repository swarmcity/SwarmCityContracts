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
    function transfer(address _to, uint256 _value) public;
}


contract HashtagSimpleDeal is Ownable {
    using SafeMath for uint;
c
    /// @param_hashtagName The human readable name of the hashtag
    string public hashtagName;
    /// @param_hashtagFee The fixed hashtag fee in SWT
    uint public hashtagFee;
    /// @param_token The SWT token
    IMiniMeToken public token;
    /// @param_payoutaddress The address where the hashtag fee is sent.
    address public payoutAddress;
    /// @param_hashtagMetadataHash The IPFS hash metadata for this hashtag
    /// @dev using bytes32 instead of string, * ref https://ethereum.stackexchange.com/questions/17094/how-to-store-ipfs-hash-using-bytes
    bytes32 public hashtagMetadataHash;
    /// @param_deployBlock Set in the constructor. Used to log more efficiently
    uint public deployBlock;
    /// @param_itemsHash Array with all items hashes.
    bytes32[] public itemHashes;

    /// @notice itemStatuses enum
    enum itemStatuses {
		Open,
        Funded,
		Done,
		Disputed,
		Resolved,
		Cancelled
    }

    /// @param_dealStruct The deal object.
    /// @param_status Coming from itemStatuses enum.
    /// Statuses: Open, Done, Disputed, Resolved, Cancelled
    /// @param_hashtagFee The value of the hashtag fee is stored in the deal. This prevents the hashtagmaintainer to influence an existing deal when changing the hashtag fee.
    /// @param_dealValue The value of the deal (SWT)
    /// @param_provider The address of the provider
	/// @param_deals Array of deals made by this hashtag

    struct itemStruct {
        uint64 status;
        uint64 replyCount;
        uint128 creationBlock;
        uint128 hashtagFee;
        uint128 itemValue;
        address providerAddress;
        address seekerAddress;
        bytes32 itemMetadataHash;
    }

    itemStruct[] public items;

    mapping(address => uint256) public seekerReputation;
    mapping(address => uint256) public providerReputation;

    /// @dev Event Seeker reputat[ion token is minted and sent
    event SeekerRepAdded(address to, uint amount);

    /// @dev Event Provider reputation token is minted and sent
    event ProviderRepAdded(address to, uint amount);

    /// @dev Event NewItem - This event is fired when a new item is created
    event NewItem(address indexed owner, uint itemId, uint itemValue, bytes32 itemMetadataHash);

    /// @dev Event ReplyItem - This event is fired when a new reply is added
    event ReplyItem(address indexed replier, uint indexed itemId, bytes32 replyMetadataHash);

    /// @dev ItemStatusChange - This event is fired when an item status is updated
    event ItemChange(uint indexed itemId, uint status, address providerAddress);

    /// @dev ReceivedApproval - This event is fired when minime sends approval
    event ReceivedApproval(address sender, uint amount, address fromcontract, bytes extraData);
    event OnTokenTransfer(address sender, uint256 amount, bytes extraData);

    /// @dev hashtagChanged - This event is fired when any of the metadata is changed
    event HashtagChanged(string _change);

    /// @notice The function that creates the hashtag
    constructor(address _token, string _hashtagName, uint _hashtagFee, bytes32 _hashtagMetadataHash) public {

        /// @notice The name of the hashtag is set
        hashtagName = _hashtagName;

        /// @notice The seeker reputation token is created
        SeekerRep = new DetailedERC20("SeekerRep", "SWRS", 0);

        /// @notice The provider reputation token is created
        ProviderRep = new DetailedERC20("ProviderRep", "SWRP", 0);

        /// @notice SWT token is added
        token = IMiniMeToken(_token);

        /// Metadata added
        hashtagMetadataHash = _hashtagMetadataHash;

        /// hashtag fee is set to ...
        hashtagFee = _hashtagFee;

        /// Hashtag fee payout address is set
        /// First time we set it to msg.sender
        payoutAddress = msg.sender;

        /// Set creation block 
        deployBlock = block.number;
    }

    function receiveApproval(address _msgsender, uint _amount, address _fromcontract, bytes _extraData) public {
        require(address(this).call(_extraData), "Error calling extraData");
        emit ReceivedApproval(_msgsender, _amount, _fromcontract, _extraData);
    }

    function onTokenTransfer(address _msgsender, uint256 _amount, bytes _extraData) public {
        // Make sure that the msg.sender is the token contract
        require(msg.sender == address(token))

        // Crazy switch aseembly whatever to know what function to call
        bytes32 _itemMetadataHash = someFunctionWHATEVER(_extraData)
        uint _itemId = someFunctionWHATEVER(_extraData)

        // If calling newItem
        newItem(_msgsender, _amount, _itemMetadataHash);
        fundItem(_msgsender, _amount, _itemId);
    }

    /// @notice The Hashtag owner can always update the payout address.
    function setPayoutAddress(address _payoutAddress) public onlyOwner {
        payoutAddress = _payoutAddress;
        emit HashtagChanged("payoutAddress changed");
    }

    /// @notice The Hashtag owner can always update the metadata for the hashtag.
    function setMetadataHash(bytes32 _hashtagMetadataHash ) public onlyOwner  {
        hashtagMetadataHash = _hashtagMetadataHash;
        emit HashtagChanged("metaDataHash changed");
    }

    /// @notice The Hashtag owner can always change the hashtag fee amount
    function setHashtagFee(uint _newHashtagFee) public onlyOwner {
        hashtagFee = _newHashtagFee;
        emit HashtagChanged("hashtagFee changed");
    }

    /// @notice The item making stuff

    /// @notice The create item function
    function newItem(address seekerAddress, uint _amount, bytes32 _itemMetadataHash) internal {
        /// @dev It is assumed that the user sends an amount = itemValue + hashtagFee / 2
        uint itemValue = _amount.sub(hashtagFee / 2);

        /// @dev Initialize item struct
        itemStruct memory item;
        // item.status > Initialized latter
        // item.replyCount > Initialized latter
        item.creationBlock = block.number;
        item.hashtagFee = hashtagFee;
        item.itemValue = itemValue;
        // item.providerAddress; > Initialized latter
        item.seekerAddress = seekerAddress;
        item.itemMetadataHash = _itemMetadataHash;
        
        /// @dev Append itemHash to the itemHashes record
        uint itemId = items.push(item);

        emit NewItem(seekerAddress, itemId, itemValue, _itemMetadataHash);
    }

    /// @notice The reply function
    function replyItem(uint _itemId, bytes32 _replyMetadataHash) external {
        items[_itemId].replyCount++;
        emit ReplyItem(msg.sender, _itemId, _replyMetadataHash);
    }

    /// @notice The select function
    function selectReplier(uint _itemId, address _selectedReplier) external {
        require (items[_itemId].seekerAddress == msg.sender, "Sender must be the seeker");
        items[_itemId].providerAddress = _selectedReplier;
        emit ItemChange(_itemId, 0, _selectedReplier);
    }
    /// @dev To deselect, send 0x0 as _selectedReplier

    /// @notice Provider has to fund the deal
    function fundItem(address providerAddress, uint _amount, uint _itemId) internal {
        itemStruct storage item = items[_itemId];

        /// @dev only allow open deals to be funded
        require (item.status == itemStatuses.Open, "Item must be in Open status");
        /// @dev Update the item state
        item.status = itemStatuses.Funded;

        /// @dev if the provider is filled in - the deal was already funded
        require (item.providerAddress == providerAddress, "The selected provider must be the sender");

        /// @dev put the tokens from the provider on the deal
        require (item.itemValue.add(item.hashtagFee / 2) == _amount, "Transfered amount must be itemValue + hashtagFee");

        /// @dev you can only fund open deals
        
        
        emit ItemChange(_itemId, itemStatuses.Funded, providerAddress);
    }

    /// @notice The payout function can only be called by the deal owner.
    function payoutItem(uint _itemId) external {

        itemStruct storage item = items[_itemId];
        address providerAddress = item.providerAddress

        /// @dev Only Seeker can payout
        require (item.seekerAddress == msg.sender, "Sender must be the seeker");

        /// @dev you can only payout funded deals
        require (item.status == itemStatuses.Funded, "Item must be in Funded status");
        /// @dev Update the item state before the token transfers
        item.status = itemStatuses.Done;

        /// @dev The Seeker pays half of the hashtagFee to the Maintainer
        require(token.transfer(payoutAddress, item.hashtagFee), "Error transfering hashtagFee to the payout address");
        /// @dev pay out the provider
        require (token.transfer(providerAddress, item.itemValue * 2), "Error transfering funds to the provider");

        /// @dev mint reputation for the seeker and the provider
        seekerReputation[msg.sender] = seekerReputation[msg.sender].add(5);
        providerReputation[providerAddress] = providerReputation[providerAddress].add(5);

        /// @dev Emit state change
        emit ItemChange(_itemHash, itemStatuses.Done, providerAddress);
    }

    /// @notice The Cancel Item Function
    /// @notice Half of the HashtagFee is sent to PayoutAddress
    function cancelItem(uint _itemId) public {
        itemStruct storage c = items[_itemHash];
        if(c.itemValue > 0 && c.providerAddress == 0x0 && c.status == itemStatuses.Open) {
            /// @dev The Seeker gets the remaining value
            require(token.transfer(c.seekerAddress, c.itemValue), "Error transfering fund to the seeker");

            delete items[_itemHash];
            
            emit ItemChange(_itemHash, c.status, c.providerAddress);
        }
    }

    /// @notice The Dispute Item Function
    /// @notice The Seeker or Provider can dispute an item, only the Maintainer can resolve it.
    function disputeItem(bytes32 _itemHash) public {
        itemStruct storage c = items[_itemHash];
        require (c.status == itemStatuses.Funded, "Item must be in Funded status");

        if (msg.sender == c.seekerAddress) {
            /// @dev Seeker starts the dispute
            /// @dev Only items with Provider set can be disputed
            require (c.providerAddress != 0x0, "provider not 0 not open");
        } else {
            /// @dev Provider starts dispute
            require (c.providerAddress == msg.sender, "sender is provider");
        }
        /// @dev Set itemStatus to Disputed
        items[_itemHash].status = itemStatuses.Disputed;
        
        emit ItemChange(_itemHash, c.status, c.providerAddress);

    } 

    /// @notice The Resolve Item Function ♡
    /// @notice The Maintainer resolves the disputed item.
    function resolveItem(bytes32 _itemHash, uint _seekerFraction) public {
        itemStruct storage c = items[_itemHash];
        require (msg.sender == payoutAddress, "Sender must be the hashtag owner");
        require (c.status == itemStatuses.Disputed, "Item must be in Disputed status");
        require (token.transfer(c.seekerAddress, _seekerFraction), "Error transfering funds to the seeker");
        require (c.itemValue * 2 - _seekerFraction <= c.itemValue * 2, "Overflow protection");
        require (token.transfer(c.providerAddress, c.itemValue * 2 - _seekerFraction), "Error transfering funds to the provider");
        items[_itemHash].status = itemStatuses.Resolved;

        emit ItemChange(_itemHash, c.status, c.providerAddress);
    }

    /// @notice Read the data details of a deal
    function readItemData(bytes32 _itemHash) public view returns (
            itemStatuses status, 
            address providerAddress,
            uint providerRep,
            uint numberOfReplies)
        {
        return (
            items[_itemHash].status,
            items[_itemHash].providerAddress,
            items[_itemHash].providerRep,
            items[_itemHash].replies.length);
    }

    /// @notice Read the data details of a deal
    function readItemState(bytes32 _itemHash) public view returns (
            uint _itemValue,
            uint _seekerRep,
            address _seekerAddress,
            bytes32 _itemMetadataHash,
            uint _creationBlock
            )
        {
        return (
            items[_itemHash].itemValue,
            items[_itemHash].seekerRep,
            items[_itemHash].seekerAddress,
            items[_itemHash].itemMetadataHash,
            items[_itemHash].creationBlock
        );
    }

    /// @notice Read the details of a deal
    function readItemMetadataHash(bytes32 _itemHash) public view returns (bytes32 itemMetadataHash) {
        return (items[_itemHash].itemMetadataHash);
    }

    /// @notice Returns an array of all items' hash in the hashtag
    /// This array can potentially by really large. This can cause trouble if the array length is > 60.000
    /// In that case the gas on the eth_call should be increased to a huge number like 2**50
    /// * ref https://github.com/paritytech/parity-ethereum/issues/6293
    /// * ref https://ethereum.stackexchange.com/questions/23918/what-is-the-array-size-limit-of-a-returned-array-from-a-contract-function-call-i
    function getitemHashes() public view returns(bytes32[]) {
        return itemHashes;
    }

    function getItemsCount() public view returns(uint) {
        return itemHashes.length;
    }

    function getItemRepliesCount(bytes32 _itemHash) public view returns(uint) {
        return items[_itemHash].replies.length;
    }

    function getItemReply(bytes32 _itemHash, uint _index) public view returns(bytes32) {
        return items[_itemHash].replies[_index];
    }

    function getItemReplies(bytes32 _itemHash) public view returns(bytes32[]) {
        return items[_itemHash].replies;
    }

    function getItemRepliers(bytes32 _itemHash) public view returns(address[]) {
        return items[_itemHash].repliers;
    }
    
}
