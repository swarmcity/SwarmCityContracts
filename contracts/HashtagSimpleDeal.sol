pragma solidity ^0.4.23;

/**
*  @title Simple Deal Hashtag
*  @dev Created in Swarm City anno 2017,
*  for the world, with love.
*  description Symmetrical Escrow Deal Contract
*  description This is the hashtag contract for creating Swarm City marketplaces.
*  It's the first, most simple approach to making Swarm City work.
*  This contract creates "SimpleDeals".
*/

import "./IMiniMeToken.sol";
import "./RepToken/DetailedERC20.sol";
import "./HashtagList/HashtagList.sol";

contract HashtagSimpleDeal is Ownable {
    /// @param_name The human readable name of the hashtag
    /// @param_hashtagFee The fixed hashtag fee in SWT
    /// @param_token The SWT token
    /// @param_ProviderRep The rep token that is minted for the Provider
    /// @param_SeekerRep The rep token that is minted for the Seeker
    /// @param_payoutaddress The address where the hashtag fee is sent.
    /// @param_metadataHash The IPFS hash metadata for this hashtag
    string public hashtagName;
    uint public hashtagFee;
    IMiniMeToken public token;
    DetailedERC20 public ProviderRep;
    DetailedERC20 public SeekerRep;
    address public payoutAddress;
    string public metadataHash;
    HashtagList public hashtagList;

    // @notice itemStatuses enum
    enum itemStatuses {
		Open,
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
        string ipfsMetadata;
    }

    mapping(bytes32=>itemStruct) items;

    /// @dev Event Seeker reputation token is minted and sent
    event SeekerRepAdded(address to, uint amount);

    /// @dev Event Provider reputation token is minted and sent
    event ProviderRepAdded(address to, uint amount);

    /// @dev Event NewDealForTwo - This event is fired when a new deal for two is created.
    event NewItemForTwo(address owner, bytes32 itemHash, string ipfsMetadata, uint itemValue, uint hashtagFee, uint totalValue, uint seekerRep);

    /// @dev Event FundDeal - This event is fired when a deal is been funded by a party.
    event FundItem(address seeker, address provider, bytes32 itemHash);

    /// @dev DealStatusChange - This event is fired when a deal status is updated.
    event ItemStatusChange(address owner, bytes32 itemHash, itemStatuses newstatus, string ipfsMetadata);

    /// @dev ReceivedApproval - This event is fired when minime sends approval.
    event ReceivedApproval(address sender, uint amount, address fromcontract, bytes extraData);

    /// @dev hashtagChanged - This event is fired when any of the metadata is changed.
    event HashtagChanged(string _change);

    /// @notice The function that creates the hashtag
    constructor(address _hashtagList, address _token, string _hashtagName, uint _hashtagFee, string _ipfsMetadataHash) public {

        /// @notice the HashtagList address is set
        hashtagList = HashtagList(_hashtagList);
        /// @notice The name of the hashtag is set
        hashtagName = _hashtagName;

        /// @notice The seeker reputation token is created
        SeekerRep = new DetailedERC20("SeekerRep", "SWRS", 0);

        /// @notice The provider reputation token is created
        ProviderRep = new DetailedERC20("ProviderRep", "SWRP", 0);

        /// @notice SWT token is added
        token = IMiniMeToken(_token);

        /// Metadata added
        metadataHash = _ipfsMetadataHash;

        /// hashtag fee is set to ...
        hashtagFee = _hashtagFee;

        /// Hashtag fee payout address is set
        /// First time we set it to msg.sender
        payoutAddress = msg.sender;

        // Add the newly created hashtag to the HashtagLIst
        hashtagList.addHashtag(_hashtagName, _ipfsMetadataHash, this);
    }

    function receiveApproval(address _msgsender, uint _amount, address _fromcontract, bytes _extraData) public {
        require(address(this).call(_extraData));
        emit ReceivedApproval( _msgsender,  _amount,  _fromcontract, _extraData);
    }

    /// @notice The Hashtag owner can always update the payout address.
    function setPayoutAddress(address _payoutaddress) public onlyOwner {
        payoutAddress = _payoutaddress;
        emit HashtagChanged("Payout address changed");
    }

    /// @notice The Hashtag owner can always update the metadata for the hashtag.
    function setMetadataHash(string _ipfsMetadataHash ) public onlyOwner  {
        metadataHash = _ipfsMetadataHash;
        emit HashtagChanged("MetaData hash changed");
    }

    /// @notice The Hashtag owner can always change the hashtag fee amount
    function setHashtagFee(uint _newHashtagFee) public onlyOwner {
        hashtagFee = _newHashtagFee;
        emit HashtagChanged("Hashtag fee amount changed");
    }

    /// @notice The item making stuff

    /// @notice The create item function
    function newItem(
        bytes32 _itemHash, 
        uint _itemValue, 
        string _ipfsMetadata
    ) public {
        // make sure there is enough to pay the hashtag fee later on
        require (hashtagFee / 2 <= _itemValue); // Overflow protection

        // fund this deal
        uint totalValue = _itemValue + hashtagFee / 2;

        require ( _itemValue + hashtagFee / 2 >= _itemValue); //overflow protection

        // if deal already exists don't allow to overwrite it
        require (items[_itemHash].hashtagFee == 0 && items[_itemHash].itemValue == 0);

        // @dev The Seeker transfers SWT to the hashtagcontract
        require (token.transferFrom(tx.origin,this, _itemValue + hashtagFee / 2));

        // @dev The Seeker pays half of the hashtagFee to the Maintainer
        require(token.transfer(payoutAddress, hashtagFee / 2));

        // if it's funded - fill in the details
        items[_itemHash] = itemStruct(itemStatuses.Open,
        hashtagFee,
        _itemValue,
        0,
        SeekerRep.balanceOf(tx.origin),
        0x0,
        tx.origin,
        _ipfsMetadata);

        emit NewItemForTwo(tx.origin,_itemHash,_ipfsMetadata, _itemValue, hashtagFee, totalValue, SeekerRep.balanceOf(tx.origin));

    }

    /// @notice Provider has to fund the deal
    function fundItem(string _itemId) public {

        bytes32 itemHash = keccak256(_itemId);

        itemStruct storage c = items[itemHash];

        /// @dev only allow open deals to be funded
        require (c.status == itemStatuses.Open);

        /// @dev if the provider is filled in - the deal was already funded
        require (c.providerAddress == 0x0);

        /// @dev put the tokens from the provider on the deal
        require (c.itemValue + c.hashtagFee / 2 >= c.itemValue);
        require (token.transferFrom(tx.origin,this,c.itemValue + c.hashtagFee / 2));

        // @dev The Seeker pays half of the hashtagFee to the Maintainer
        require(token.transfer(payoutAddress, c.hashtagFee / 2));

        /// @dev fill in the address of the provider ( to payout the deal later on )
        items[itemHash].providerAddress = tx.origin;
        items[itemHash].providerRep = ProviderRep.balanceOf(tx.origin);

        emit FundItem(items[itemHash].seekerAddress, items[itemHash].providerAddress, itemHash);
        }

    /// @notice The payout function can only be called by the deal owner.
    function payoutItem(bytes32 _itemHash) public {

        itemStruct storage c = items[_itemHash];

        /// @dev Only Seeker can payout
        require(c.seekerAddress == msg.sender);

        /// @dev you can only payout open deals
        require (c.status == itemStatuses.Open);

        /// @dev pay out the provider
        require (token.transfer(c.providerAddress,c.itemValue * 2));

        /// @dev mint REP for Provider
        ProviderRep.mint(c.providerAddress, 5);
        emit ProviderRepAdded(c.providerAddress, 5);

        /// @dev mint REP for Seeker
        SeekerRep.mint(c.seekerAddress, 5);
        emit SeekerRepAdded(c.seekerAddress, 5);

        /// @dev mark the deal as done
        items[_itemHash].status = itemStatuses.Done;
        emit ItemStatusChange(c.seekerAddress,_itemHash,itemStatuses.Done,c.ipfsMetadata);

    }

    /// @notice The Cancel Item Function
    /// @notice Half of the HashtagFee is sent to PayoutAddress
    function cancelItem(bytes32 _itemHash) public {
        itemStruct storage c = items[_itemHash];
        if(c.itemValue > 0 && c.providerAddress == 0x0 && c.status == itemStatuses.Open)
        {

            // @dev The Seeker gets the remaining value
            require(token.transfer(c.seekerAddress, c.itemValue));

            items[_itemHash].status = itemStatuses.Cancelled;

            emit ItemStatusChange(msg.sender, _itemHash, itemStatuses.Cancelled, c.ipfsMetadata);
        }
    }

    /// @notice The Dispute Item Function
    /// @notice The Seeker or Provider can dispute an item, only the Maintainer can resolve it.
    function disputeItem(bytes32 _itemHash) public {
        itemStruct storage c = items[_itemHash];
        require (c.status == itemStatuses.Open, 'item not open');

        if (msg.sender == c.seekerAddress) {
            /// @dev Seeker starts the dispute
            /// @dev Only items with Provider set can be disputed
            require (c.providerAddress != 0x0, 'provider not 0 not open');
        } else {
            /// @dev Provider starts dispute
            require (c.providerAddress == msg.sender, 'sender is provider');
        }
        /// @dev Set itemStatus to Disputed
        items[_itemHash].status = itemStatuses.Disputed;
        emit ItemStatusChange(msg.sender, _itemHash, itemStatuses.Disputed, c.ipfsMetadata);
    } 

    /// @notice The Resolve Item Function ♡
    /// @notice The Maintainer resolves the disputed item.
    function resolveItem(bytes32 _itemHash, uint _seekerFraction) public {
        itemStruct storage c = items[_itemHash];
        require (msg.sender == payoutAddress);
        require (c.status == itemStatuses.Disputed);
        require (token.transfer(c.seekerAddress, _seekerFraction));
        require (c.itemValue * 2 - _seekerFraction <= c.itemValue * 2);
        require (token.transfer(c.providerAddress, c.itemValue * 2 - _seekerFraction));
        items[_itemHash].status = itemStatuses.Resolved;
        emit ItemStatusChange(c.seekerAddress, _itemHash, itemStatuses.Resolved, c.ipfsMetadata);
    }

    /// @notice Read the details of a deal
    function readItem(bytes32 _itemHash)
        constant public returns(
            itemStatuses status, 
            uint hashtagFee,
            uint itemValue,
            uint providerRep,
            uint seekerRep,
            address providerAddress,
            string ipfsMetadata)
        {
        return (
            items[_itemHash].status,
            items[_itemHash].hashtagFee,
            items[_itemHash].itemValue,
            items[_itemHash].providerRep,
            items[_itemHash].seekerRep,
            items[_itemHash].providerAddress,
            items[_itemHash].ipfsMetadata);
    }
}
