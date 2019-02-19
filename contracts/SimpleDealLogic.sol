pragma solidity ^0.4.23;

/**
*  @title Simple Deal Hashtag Logic
*  @dev Created in Swarm City anno 2019,
*  for the world, with love.
*  description Symmetrical Escrow Deal Contract
*  description This is the hashtag contract for creating Swarm City marketplaces.
*  It's the first, most simple approach to making Swarm City work.
*  This contract creates "SimpleDeals".
*/

import "./SimpleDealProxy.sol";
import "./SimpleDealData.sol";


contract SimpleDealLogic is Ownable () {
    uint public deployBlock;
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


    constructor(address _parent) public {
        /// Set creation block 
        deployBlock = block.number;
        proxy = SimpleDealProxy(_parent)
    }

    function setSimpleDealProxy(address _proxycontract) public onlyOwner {
        proxy = SimpleDealProxy(_proxycontract);
    }

    /// @notice The item making stuff

    /// @notice The create item function
    function newItem(
        bytes32 _itemHash, 
        uint _itemValue, 
        bytes32 _itemMetadataHash
    ) public {
        /// @dev make sure there is enough to pay the hashtag fee later on
        require (proxy.hashtagFee() / 2 <= _itemValue, "Overflow protection: item value");
        require (_itemValue + proxy.hashtagFee() / 2 >= _itemValue, "Overflow protection: total value");

        /// @dev if deal already exists don't allow to overwrite it
        require (Data.items(_itemHash).hashtagFee == 0 && Data.items(_itemHash).itemValue == 0, "hashtagFee and itemValue must be 0");

        /// @dev The Seeker pays half of the hashtagFee to the Maintainer
        require(token.transfer(payoutAddress, proxy.hashtagFee / 2), "");

        /// @dev Initialize item struct
        itemStruct memory item;
        item.status = itemStatuses.Open;
        item.hashtagFee = proxy.hashtagFee;
        item.itemValue = _itemValue;
        item.seekerRep = proxy.SeekerRep.balanceOf(tx.origin);
        item.seekerAddress = tx.origin;
        item.itemMetadataHash = _itemMetadataHash;
        item.creationBlock = block.number;
        //items[_itemHash] = item;

        Data.setItem(_itemHash, item);

        /// @dev Append itemHash to the itemHashes record
        //itemHashes.push(_itemHash);

        emit NewItem(
            tx.origin,
            _itemHash,
            _itemMetadataHash,
            _itemValue,
            proxy.hashtagFee, 
            proxy.SeekerRep.balanceOf(tx.origin)
        );
    }

    /// @notice The reply function
    function replyItem(bytes32 _itemHash, bytes32 _replyMetadataHash) public {
        items[_itemHash].replies.push(_replyMetadataHash);
        items[_itemHash].repliers.push(msg.sender);
        emit ReplyItem(_itemHash, _replyMetadataHash, msg.sender);
    }

    /// @notice The select function
    function selectReplier(bytes32 _itemHash, address _selectedReplier) public {
        itemStruct storage c = items[_itemHash];
        require (c.seekerAddress == msg.sender, "Sender must be the seeker");
        c.providerAddress = _selectedReplier;
        emit ItemChange(_itemHash, c.status, _selectedReplier);
    }
    /// @dev To deselect, send 0x0 as _selectedReplier

    /// @notice Provider has to fund the deal
    function fundItem(bytes32 _itemHash) public {
        itemStruct storage c = items[_itemHash];

        /// @dev only allow open deals to be funded
        require (c.status == itemStatuses.Open, "Item must be in Open status");

        /// @dev if the provider is filled in - the deal was already funded
        require (c.providerAddress == tx.origin, "The selected provider must be the sender");

        /// @dev put the tokens from the provider on the deal
        require (c.itemValue + c.hashtagFee / 2 >= c.itemValue, "Overflow protection: total item value");

        /// @dev The fundItem method is called through a MiniMeToken ApproveAndCall method. 
        /// The msg.sender approves this contract to spend x amount and the the token transferFrom is called
        /// If someone exploits tx.origin through another contract the transferFrom would reject because it hasn't been previously authorized
        // // COMMENTED: no longer needed as the transferAndCall function already executed this
        // require (token.transferFrom(tx.origin, this, c.itemValue + c.hashtagFee / 2), "Error transfering tokens to the hashtag");

        /// @dev The Seeker pays half of the hashtagFee to the Maintainer
        require(token.transfer(payoutAddress, c.hashtagFee / 2), "Error transfering funds");

        /// @dev fill in the address of the provider ( to payout the deal later on )
        items[_itemHash].providerRep = ProviderRep.balanceOf(tx.origin);

        /// @dev you can only fund open deals
        items[_itemHash].status = itemStatuses.Funded;
        
        emit ItemChange(_itemHash, c.status, tx.origin);
    }

    /// @notice The payout function can only be called by the deal owner.
    function payoutItem(bytes32 _itemHash) public {

        itemStruct storage c = items[_itemHash];

        /// @dev Only Seeker can payout
        require (c.seekerAddress == msg.sender, "Sender must be the seeker");

        /// @dev you can only payout funded deals
        require (c.status == itemStatuses.Funded, "Item must be in Funded status");

        /// @dev pay out the provider
        require (token.transfer(c.providerAddress,c.itemValue * 2), "Error transfering funds to the provider");

        /// @dev mint REP for Provider
        ProviderRep.mint(c.providerAddress, 5);
        emit ProviderRepAdded(c.providerAddress, 5);

        /// @dev mint REP for Seeker
        SeekerRep.mint(c.seekerAddress, 5);
        emit SeekerRepAdded(c.seekerAddress, 5);

        /// @dev mark the deal as done
        items[_itemHash].status = itemStatuses.Done;
        emit ItemChange(_itemHash, c.status, c.providerAddress);

    }

    /// @notice The Cancel Item Function
    /// @notice Half of the HashtagFee is sent to PayoutAddress
    function cancelItem(bytes32 _itemHash) public {
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
}