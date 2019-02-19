pragma solidity ^0.4.23;

/**
*  @title Simple Deal Hashtag Data Storage
*  @dev Created in Swarm City anno 2019,
*  for the world, with love.
*  description Symmetrical Escrow Deal Contract
*  description This is the hashtag contract for creating Swarm City marketplaces.
*  It's the first, most simple approach to making Swarm City work.
*  This contract creates "SimpleDeals".
*/

import "./SimpleDealProxy.sol";


contract SimpleDealData is Ownable {

    /// @param_deployBlock Set in the constructor. Used to log more efficiently
    uint public deployBlock;
    /// @param_itemsHash Array with all items hashes.
    bytes32[] public itemHashes;

    SimpleDealProxy public proxy;

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
        itemStatuses status;
        uint hashtagFee;
        uint itemValue;
        uint providerRep;
        uint seekerRep;
        address providerAddress;
        address seekerAddress;
        bytes32 itemMetadataHash;
        bytes32[] replies;
        address[] repliers;
        uint creationBlock;
    }

    mapping(bytes32=>itemStruct) public items;

    constructor(address _parent) public {
        /// Set creation block 
        deployBlock = block.number;
        proxy = SimpleDealProxy(_parent)
    }

    function setItem(bytes32 _itemHash, itemStruct _item) public {
        itemHashes.push(_itemHash);
        items[_itemHash] = item;
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