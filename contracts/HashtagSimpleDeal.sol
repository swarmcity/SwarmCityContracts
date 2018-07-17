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

import './IMiniMeToken.sol';
import './RepToken/DetailedERC20.sol';

contract HashtagSimpleDeal is Ownable {
	/// @param_name The human readable name of the hashtag
	/// @param_hashtagFee The fixed hashtag fee in SWT
	/// @param_token The SWT token
	/// @param_ProviderRep The rep token that is minted for the Provider
	/// @param_SeekerRep The rep token that is minted for the Seeker
	/// @param_payoutaddress The address where the hashtag fee is sent.
	/// @param_metadataHash The IPFS hash metadata for this hashtag
	string public name;
	uint public hashtagFee;
	IMiniMeToken public token;
	DetailedERC20 public ProviderRep;
	DetailedERC20 public SeekerRep;
	address public payoutAddress;
	string public metadataHash;

	// @notice DealStatuses enum
	enum DealStatuses {
		Open,
		Done,
		Disputed,
		Resolved,
		Cancelled
	}

	/// @param_dealStruct The deal object.
	/// @param_status Coming from DealStatuses enum.
	/// Statuses: Open, Done, Disputed, Resolved, Cancelled
	/// @param_hashtagFee The value of the hashtag fee is stored in the deal. This prevents the hashtagmaintainer to influence an existing deal when changing the hashtag fee.
	/// @param_dealValue The value of the deal (SWT)
	/// @param_provider The address of the provider
	/// @param_deals Array of deals made by this hashtag

	struct dealStruct {
		DealStatuses status;
		uint hashtagFee;
		uint dealValue;
		uint providerRep;
		uint seekerRep;
		address provider;
		address seeker;
		string ipfsMetadata;
	}

	mapping(bytes32=>dealStruct) deals;

	/// Reputation token for provider is minted and sent
	event ProviderRepAdded(address to, uint amount);

	/// Reputation token for seeker is minted and sent
	event SeekerRepAdded(address to, uint amount);

	/// @dev Event NewDealForTwo - This event is fired when a new deal for two is created.
	event NewDealForTwo(address owner,bytes32 dealhash, string ipfsMetadata, uint offerValue, uint hashtagFee, uint totalValue, uint seekerRep);

	/// @dev Event FundDeal - This event is fired when a deal is been funded by a party.
	event FundDeal(address provider,address owner, bytes32 dealhash,string ipfsMetadata);

	/// @dev DealStatusChange - This event is fired when a deal status is updated.
	event DealStatusChange(address owner,bytes32 dealhash,DealStatuses newstatus,string ipfsMetadata);

	/// @dev ReceivedApproval - This event is fired when minime sends approval.
	event ReceivedApproval(address sender, uint amount, address fromcontract, bytes extraData);

	/// @dev hashtagChanged - This event is fired when any of the metadata is changed.
	event HashtagChanged(string _change);

	/// @notice The function that creates the hashtag
	constructor(address _token, string _name, uint _hashtagFee, string _ipfsMetadataHash) public {

		/// @notice The name of the hashtag is set
		name = _name;

		/// @notice The seeker reputation token is created
		SeekerRep = new DetailedERC20("SeekerRep","SWRS", 0);
		
		/// @notice The provider reputation token is created
		ProviderRep = new DetailedERC20("ProviderRep","SWRP", 0);

		/// @notice SWT token is added
		token = IMiniMeToken(_token);

		/// Metadata added
		metadataHash = _ipfsMetadataHash;

		/// hashtag fee is set to ...
		hashtagFee = _hashtagFee;

		/// Hashtag fee payout address is set
		/// First time we set it to msg.sender
		payoutAddress = msg.sender;
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

	/// @notice The Deal making stuff

	/// @notice The create Deal function
	function makeDealForTwo(
		bytes32 _dealhash, 
		uint _offerValue, 
		string _ipfsMetadata,
		uint8 _v,
		bytes32 _r,
		bytes32 _s
    ) public {
		// make sure there is enough to pay the hashtag fee later on
		require (hashtagFee / 2 <= _offerValue);
		
		address dealowner = ecrecover(_dealhash, _v, _r, _s);
		// fund this deal
		uint totalValue = _offerValue + hashtagFee / 2;
		
        require ( _offerValue + hashtagFee / 2 >= _offerValue); // overflow protection

		// if deal already exists don't allow to overwrite it
		require (deals[_dealhash].hashtagFee == 0 && deals[_dealhash].dealValue == 0);

		require (token.transferFrom(dealowner,this, _offerValue + hashtagFee / 2));

		// if it's funded - fill in the details
		deals[_dealhash] = dealStruct(DealStatuses.Open,
    		hashtagFee,
    		_offerValue,
    		0,
    		SeekerRep.balanceOf(dealowner),
    		0x0,
    		dealowner,
    		_ipfsMetadata);
    
        emit NewDealForTwo(dealowner,_dealhash,_ipfsMetadata, _offerValue, hashtagFee, totalValue, SeekerRep.balanceOf(dealowner));

	}

	/// @notice The Cancel deal function
	/// @notice Half of the hashtagfee is sent to payoutAddress
	function cancelDeal(bytes32 _dealhash) public {
		dealStruct storage d = deals[_dealhash];
		if (d.dealValue > 0 && d.provider == 0x0 && d.status == DealStatuses.Open)
		{
			// @dev if you cancel the deal you pay the hashtagfee / 2
			require (token.transfer(payoutAddress,d.hashtagFee / 2));

			// @dev cancel this Deal
			require (token.transfer(d.seeker,d.dealValue));

			deals[_dealhash].status = DealStatuses.Cancelled;

			emit DealStatusChange(msg.sender,_dealhash,DealStatuses.Cancelled,deals[_dealhash].ipfsMetadata);
		}
	}

	/// @notice seeker or provider can choose to dispute an ongoing deal
	function dispute(bytes32 _dealhash) public {
		dealStruct storage d = deals[_dealhash];
		require (d.status == DealStatuses.Open);

		if (msg.sender == d.seeker){
			/// @dev seeker goes in conflict

			/// @dev can only be only when there is a provider
			require (d.provider != 0x0 );

		} else {
			/// @dev if not the seeker, only the provider can go in conflict
			require (d.provider == msg.sender);
		}
		/// @dev mark the deal as Disputed
		deals[_dealhash].status = DealStatuses.Disputed;

		emit DealStatusChange(d.seeker,_dealhash,DealStatuses.Disputed,deals[_dealhash].ipfsMetadata);
	}

	/// @notice conflict resolver can resolve a disputed deal
	function resolve(bytes32 _dealhash, uint _seekerFraction) public {
		dealStruct storage d = deals[_dealhash];

		/// @dev this function can only be called by the current payoutAddress of the hastag
		/// @dev Which is owner for now
		require (msg.sender == payoutAddress);

		/// @dev only disputed deals can be resolved
		require (d.status == DealStatuses.Disputed) ;

		/// @dev pay out hashtagFee
		require (token.transfer(payoutAddress,d.hashtagFee));

		/// @dev send the seeker fraction back to the dealowner
		require (token.transfer(d.seeker,_seekerFraction));
		//seekerfraction = 4

		/// @dev what the seeker is asking for cannot be more than what he offered
		require(_seekerFraction <= d.dealValue - d.hashtagFee/2);

		/// @dev check
		require(d.dealValue * 2 - _seekerFraction <= d.dealValue * 2);

		/// @dev send the remaining deal value back to the provider
		require (token.transfer(d.provider,d.dealValue * 2 - _seekerFraction));

		deals[_dealhash].status = DealStatuses.Resolved;

		emit DealStatusChange(d.seeker,_dealhash,DealStatuses.Resolved,deals[_dealhash].ipfsMetadata);

	}

	/// @notice Provider has to fund the deal
	function fundDeal(string _dealid) public {

		bytes32 dealhash = keccak256(_dealid);

		dealStruct storage d = deals[dealhash];

		/// @dev only allow open deals to be funded
		require (d.status == DealStatuses.Open);

		/// @dev if the provider is filled in - the deal was already funded
		require (d.provider == 0x0);

		/// @dev put the tokens from the provider on the deal
		require (d.dealValue + d.hashtagFee / 2 >= d.dealValue);
		require (token.transferFrom(d.seeker,this,d.dealValue + d.hashtagFee / 2));

		/// @dev fill in the address of the provider ( to payout the deal later on )
		deals[dealhash].provider = msg.sender;
        deals[dealhash].providerRep = ProviderRep.balanceOf(msg.sender);

		emit FundDeal(msg.sender, d.seeker, dealhash, _dealid);
	}

	/// @notice The payout function can only be called by the deal owner.
	function payout(bytes32 _dealhash) public {

		require(deals[_dealhash].seeker == msg.sender);

		dealStruct storage d = deals[_dealhash];

		/// @dev you can only payout open deals
		require (d.status == DealStatuses.Open);

		/// @dev pay out hashtagFee
		require (token.transfer(payoutAddress,d.hashtagFee));

		/// @dev pay out the provider
		require (token.transfer(d.provider,d.dealValue * 2));

		/// @dev mint REP for Provider
		ProviderRep.mint(d.provider, 5);
		emit ProviderRepAdded(d.provider, 5);

		/// @dev mint REP for Seeker
		SeekerRep.mint(d.seeker, 5);
		emit SeekerRepAdded(d.seeker, 5);

		/// @dev mark the deal as done
		deals[_dealhash].status = DealStatuses.Done;
		emit DealStatusChange(d.seeker,_dealhash,DealStatuses.Done,d.ipfsMetadata);

	}

	/// @notice Read the details of a deal
	function readDeal(bytes32 _dealhash)
		constant public returns(
		    DealStatuses status, 
		    uint hashtagFee,
			uint dealValue,
			uint providerRep,
		    uint seekerRep,
			address provider,
			string ipfsMetadata)
	{
		return (
		    deals[_dealhash].status,
		    deals[_dealhash].hashtagFee,
		    deals[_dealhash].dealValue,
		    deals[_dealhash].providerRep,
		    deals[_dealhash].seekerRep,
		    deals[_dealhash].provider,
		    deals[_dealhash].ipfsMetadata);
	}
}
