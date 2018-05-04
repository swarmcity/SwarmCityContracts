pragma solidity ^0.4.15;

/**
  *  @title Simple Deal Hashtag
	*  @dev Created in Swarm City anno 2017,
	*  for the world, with love.
	*  @description Symmetrical Escrow Deal Contract
	*  @description This is the hashtag contract for creating Swarm City marketplaces.
	*  This contract is used in by the hashtagFactory to spawn new hashtags. It's a
	*  MiniMe based contract, that holds the reputation balances,
	*  and mint the reputation tokens.
	*  This contract makes a specific kind of deals called "SimpleDeals"
	*/

import './Ownable.sol';

// CHANGE MINIME FOR SOMETHING SIMPLER - standard zeppelin - non transferrable tokens
import './IMiniMeToken.sol';

contract HashtagSimpleDeal is Owned {
	/// @param_name The human readable name of the hashtag
	/// @param_commission The fixed hashtag fee in SWT
	/// @param_token The SWT token
	/// @param_ProviderRep The rep token that is minted for the Provider
	/// @param_SeekerRep The rep token that is minted for the Seeker
	/// @param_payoutaddress The address where the commission is sent.
	/// @param_metadataHash The IPFS hash metadata for this hashtag
	string public name;
	uint public commission;
	IMiniMeToken public token;
	IMiniMeToken public ProviderRep;
	IMiniMeToken public SeekerRep;
	address public payoutaddress;
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
	/// @param_commissionValue The value of the hashtag commission is stored in the deal. This prevents the hashtagmaintainer to influence an existing deal when changing the hashtagcommission fee.
	/// @param_dealValue The value of the deal (SWT)
	/// @param_provider The address of the provider
	/// @param_deals Array of deals made by this hashtag

	struct dealStruct {
		DealStatuses status;
		uint commissionValue;
		uint dealValue;
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
	event NewDealForTwo(address owner,bytes32 dealhash, string ipfsMetadata, uint offerValue, uint commission, uint totalValue);

	/// @dev Event FundDeal - This event is fired when a deal is been funded by a party.
	event FundDeal(address provider,address owner, bytes32 dealhash,string ipfsMetadata);

	/// @dev DealStatusChange - This event is fired when a deal status is updated.
	event DealStatusChange(address owner,bytes32 dealhash,DealStatuses newstatus,string ipfsMetadata);

	/// @dev ReceivedApproval - This event is fired when minime sends approval.
	event ReceivedApproval(address owner,bytes extraData, uint amount);

	/// @dev hashtagChanged - This event is fired when any of the metadata is changed.
	event HashtagChanged(string _change);

	/// @notice The function that creates the hashtag
	function HashtagSimpleDeal(address _token, string _name, uint _commission, string _ipfsMetadataHash,
			address _ProviderRep, address _SeekerRep){

		/// @notice The name of the hashtag is set
		name = _name;

		/// @notice The provider reputation token is created
		ProviderRep = IMiniMeToken(_ProviderRep);

		/// @notice The seeker reputation token is created
		SeekerRep = IMiniMeToken(_SeekerRep);

		/// @notice SWT token is added
		token = IMiniMeToken(_token);

		/// Metadata added
		metadataHash = _ipfsMetadataHash;

		/// Commission is set to ...
		commission = _commission;

		/// Commission payout address is set
		/// First time we set it to msg.sender
		payoutaddress = msg.sender;
	}

	/// @notice the approval function that is triggered by the tokencontract
	/*ApproveAndCallFallBack(_spender).receiveApproval(
			msg.sender,
			_amount,
			this,
			_extraData
	);*/
	function receiveApproval(address _msgsender, uint _amount, address _fromcontract, bytes _extraData)  {
		this.call(_extraData);
		ReceivedApproval(_msgsender, _extraData, _amount);
	}

	/// @notice The Hashtag owner can always update the payout address.
	function setPayoutAddress(address _payoutaddress) onlyOwner {
		payoutaddress = _payoutaddress;
		HashtagChanged("Payout address changed");
	}

	/// @notice The Hashtag owner can always update the metadata for the hashtag.
	function setMetadataHash(string _ipfsMetadataHash) onlyOwner {
		metadataHash = _ipfsMetadataHash;
		HashtagChanged("MetaData hash changed");
	}

	/// @notice The Hashtag owner can always change the commission amount
	function setCommission(uint _newCommission) onlyOwner {
		commission = _newCommission;
		HashtagChanged("Commission amount changed");
	}

	/// @notice The Deal making stuff

	/// @notice The create Deal function
	function makeDealForTwo(bytes32 _dealhash, uint _offerValue, string _ipfsMetadata) {
		// make sure the owner of the deal is the one creating the deal
		//require ();
		// make sure there is enough to pay the commission later on
		require (commission / 2 <= _offerValue);
		// fund this deal
		uint totalValue = _offerValue + commission / 2;
    require ( _offerValue + commission / 2 >= _offerValue); //overflow protection
		require (token.transferFrom(msg.sender,this, _offerValue + commission / 2));

		// if deal already exists don't allow to overwrite it
		require (deals[_dealhash].commissionValue == 0 &&
			deals[_dealhash].dealValue == 0);

		// if it's funded - fill in the details
		deals[_dealhash] = dealStruct(DealStatuses.Open,commission,_offerValue,0x0,msg.sender,_ipfsMetadata);

		NewDealForTwo(msg.sender,_dealhash,_ipfsMetadata, _offerValue, commission, totalValue);

	}

	/// @notice The Cancel deal function
	/// @notice Half of the hashtagfee is sent to payoutaddress
	function cancelDeal(bytes32 _dealhash){
		dealStruct storage d = deals[_dealhash];
		if (d.dealValue > 0 && d.provider == 0x0 && d.status == DealStatuses.Open)
		{
			// @dev if you cancel the deal you pay the hashtagfee / 2
			require (token.transfer(payoutaddress,d.commissionValue / 2));

			// @dev cancel this Deal
			require (token.transfer(d.seeker,d.dealValue));

			deals[_dealhash].status = DealStatuses.Cancelled;

			DealStatusChange(msg.sender,_dealhash,DealStatuses.Cancelled,deals[_dealhash].ipfsMetadata);
		}
	}

	/// @notice seeker or provider can choose to dispute an ongoing deal
	function dispute(bytes32 _dealhash){
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

		DealStatusChange(d.seeker,_dealhash,DealStatuses.Disputed,deals[_dealhash].ipfsMetadata);
	}

	/// @notice conflict resolver can resolve a disputed deal
	function resolve(bytes32 _dealhash, uint _seekerFraction){
		dealStruct storage d = deals[_dealhash];

		/// @dev this function can only be called by the current payoutaddress of the hastag
		/// @dev Which is owner for now
		require (msg.sender == payoutaddress);

		/// @dev only disputed deals can be resolved
		require (d.status == DealStatuses.Disputed) ;

		/// @dev pay out commission
		require (token.transfer(payoutaddress,d.commissionValue));

		/// @dev send the seeker fraction back to the dealowner
		require (token.transfer(d.seeker,_seekerFraction));
		//seekerfraction = 4

		/// @dev what the seeker is asking for cannot be more than what he offered
		require(_seekerFraction <= d.dealValue - d.commissionValue/2);

		/// @dev check
		require(d.dealValue * 2 - _seekerFraction <= d.dealValue * 2);

		/// @dev send the remaining deal value back to the provider
		require (token.transfer(d.provider,d.dealValue * 2 - _seekerFraction));

		deals[_dealhash].status = DealStatuses.Resolved;

		DealStatusChange(d.seeker,_dealhash,DealStatuses.Resolved,deals[_dealhash].ipfsMetadata);

	}

	/// @notice Provider has to fund the deal
	function fundDeal(string _dealid){

		bytes32 dealhash = sha3(_dealid);

		dealStruct storage d = deals[dealhash];

		/// @dev only allow open deals to be funded
		require (d.status == DealStatuses.Open);

		/// @dev if the provider is filled in - the deal was already funded
		require (d.provider == 0x0);

		/// @dev put the tokens from the provider on the deal
		require (d.dealValue + d.commissionValue / 2 >= d.dealValue);
		require (token.transferFrom(d.seeker,this,d.dealValue + d.commissionValue / 2));

		/// @dev fill in the address of the provider ( to payout the deal later on )
		deals[dealhash].provider = msg.sender;

		FundDeal(msg.sender, d.seeker, dealhash, _dealid);
	}

	/// @notice The payout function can only be called by the deal owner.
	function payout(bytes32 _dealhash){

		require(deals[_dealhash].seeker == msg.sender);

		dealStruct storage d = deals[_dealhash];

		/// @dev you can only payout open deals
		require (d.status == DealStatuses.Open);

		/// @dev pay out commission
		require (token.transfer(payoutaddress,d.commissionValue));

		/// @dev pay out the provider
		require (token.transfer(d.provider,d.dealValue * 2));

		/// @dev mint REP for Provider
		ProviderRep.generateTokens(d.provider, 5);
		ProviderRepAdded(d.provider, 5);

		/// @dev mint REP for Seeker
		SeekerRep.generateTokens(d.seeker, 5);
		SeekerRepAdded(d.seeker, 5);

		/// @dev mark the deal as done
		deals[_dealhash].status = DealStatuses.Done;
		DealStatusChange(d.seeker,_dealhash,DealStatuses.Done,d.ipfsMetadata);

	}

	/// @notice Read the details of a deal
	function readDeal(bytes32 _dealhash)
		constant returns(DealStatuses status, uint commissionValue,
				uint dealValue, address provider, string ipfsMetadata){
		return (deals[_dealhash].status,deals[_dealhash].commissionValue,deals[_dealhash].dealValue,deals[_dealhash].provider,deals[_dealhash].ipfsMetadata);
	}


}
