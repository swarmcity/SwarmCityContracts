
//File: contracts/IMiniMeToken.sol
pragma solidity ^0.4.8;

contract IMiniMeToken {
	function transfer(address _to, uint256 _amount) public returns (bool success);
	function transferFrom(address _from, address _to, uint256 _amount) public returns (bool success);
	function balanceOf(address _owner) constant public returns (uint256 balance);
	function generateTokens(address _owner, uint _amount) public;
}

//File: contracts/RepToken/ERC20Basic.sol
pragma solidity ^0.4.23;


/**
 * @title ERC20Basic
 * @dev Simpler version of ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/179
 */
contract ERC20Basic {
  function totalSupply() public view returns (uint256);
  function balanceOf(address who) public view returns (uint256);
  function transfer(address to, uint256 value) public returns (bool);
  event Transfer(address indexed from, address indexed to, uint256 value);
}
//File: contracts/RepToken/SafeMath.sol
pragma solidity ^0.4.23;


/**
 * @title SafeMath
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath {

  /**
  * @dev Multiplies two numbers, throws on overflow.
  */
  function mul(uint256 a, uint256 b) internal pure returns (uint256 c) {
    if (a == 0) {
      return 0;
    }
    c = a * b;
    assert(c / a == b);
    return c;
  }

  /**
  * @dev Integer division of two numbers, truncating the quotient.
  */
  function div(uint256 a, uint256 b) internal pure returns (uint256) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    // uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return a / b;
  }

  /**
  * @dev Subtracts two numbers, throws on overflow (i.e. if subtrahend is greater than minuend).
  */
  function sub(uint256 a, uint256 b) internal pure returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  /**
  * @dev Adds two numbers, throws on overflow.
  */
  function add(uint256 a, uint256 b) internal pure returns (uint256 c) {
    c = a + b;
    assert(c >= a);
    return c;
  }
}
//File: contracts/RepToken/BasicToken.sol
pragma solidity ^0.4.23;






/**
 * @title Basic token
 * @dev Basic version of StandardToken, with no allowances.
 */
contract BasicToken is ERC20Basic {
  using SafeMath for uint256;

  mapping(address => uint256) balances;

  uint256 totalSupply_;

  /**
  * @dev total number of tokens in existence
  */
  function totalSupply() public view returns (uint256) {
    return totalSupply_;
  }

  /**
  * @dev transfer token for a specified address
  * @param _to The address to transfer to.
  * @param _value The amount to be transferred.
  */
  function transfer(address _to, uint256 _value) public returns (bool) {
    require(_to != address(0));
    require(_value <= balances[msg.sender]);

    balances[msg.sender] = balances[msg.sender].sub(_value);
    balances[_to] = balances[_to].add(_value);
    emit Transfer(msg.sender, _to, _value);
    return true;
  }

  /**
  * @dev Gets the balance of the specified address.
  * @param _owner The address to query the the balance of.
  * @return An uint256 representing the amount owned by the passed address.
  */
  function balanceOf(address _owner) public view returns (uint256) {
    return balances[_owner];
  }

}
//File: contracts/RepToken/ERC20.sol
pragma solidity ^0.4.23;




/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 is ERC20Basic {
  function allowance(address owner, address spender) public view returns (uint256);
  function transferFrom(address from, address to, uint256 value) public returns (bool);
  function approve(address spender, uint256 value) public returns (bool);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}
//File: contracts/RepToken/StandardToken.sol
pragma solidity ^0.4.23;





/**
 * @title Standard ERC20 token
 *
 * @dev Implementation of the basic standard token.
 * @dev https://github.com/ethereum/EIPs/issues/20
 * @dev Based on code by FirstBlood: https://github.com/Firstbloodio/token/blob/master/smart_contract/FirstBloodToken.sol
 */
contract StandardToken is ERC20, BasicToken {

  mapping (address => mapping (address => uint256)) internal allowed;


  /**
   * @dev Transfer tokens from one address to another
   * @param _from address The address which you want to send tokens from
   * @param _to address The address which you want to transfer to
   * @param _value uint256 the amount of tokens to be transferred
   */
  function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
    require(_to != address(0));
    require(_value <= balances[_from]);
    require(_value <= allowed[_from][msg.sender]);

    balances[_from] = balances[_from].sub(_value);
    balances[_to] = balances[_to].add(_value);
    allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
    emit Transfer(_from, _to, _value);
    return true;
  }

  /**
   * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
   *
   * Beware that changing an allowance with this method brings the risk that someone may use both the old
   * and the new allowance by unfortunate transaction ordering. One possible solution to mitigate this
   * race condition is to first reduce the spender's allowance to 0 and set the desired value afterwards:
   * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
   * @param _spender The address which will spend the funds.
   * @param _value The amount of tokens to be spent.
   */
  function approve(address _spender, uint256 _value) public returns (bool) {
    allowed[msg.sender][_spender] = _value;
    emit Approval(msg.sender, _spender, _value);
    return true;
  }

  /**
   * @dev Function to check the amount of tokens that an owner allowed to a spender.
   * @param _owner address The address which owns the funds.
   * @param _spender address The address which will spend the funds.
   * @return A uint256 specifying the amount of tokens still available for the spender.
   */
  function allowance(address _owner, address _spender) public view returns (uint256) {
    return allowed[_owner][_spender];
  }

  /**
   * @dev Increase the amount of tokens that an owner allowed to a spender.
   *
   * approve should be called when allowed[_spender] == 0. To increment
   * allowed value is better to use this function to avoid 2 calls (and wait until
   * the first transaction is mined)
   * From MonolithDAO Token.sol
   * @param _spender The address which will spend the funds.
   * @param _addedValue The amount of tokens to increase the allowance by.
   */
  function increaseApproval(address _spender, uint _addedValue) public returns (bool) {
    allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(_addedValue);
    emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }

  /**
   * @dev Decrease the amount of tokens that an owner allowed to a spender.
   *
   * approve should be called when allowed[_spender] == 0. To decrement
   * allowed value is better to use this function to avoid 2 calls (and wait until
   * the first transaction is mined)
   * From MonolithDAO Token.sol
   * @param _spender The address which will spend the funds.
   * @param _subtractedValue The amount of tokens to decrease the allowance by.
   */
  function decreaseApproval(address _spender, uint _subtractedValue) public returns (bool) {
    uint oldValue = allowed[msg.sender][_spender];
    if (_subtractedValue > oldValue) {
      allowed[msg.sender][_spender] = 0;
    } else {
      allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
    }
    emit Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }

}
//File: contracts/Ownable.sol
pragma solidity ^0.4.23;


/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
  address public owner;


  event OwnershipRenounced(address indexed previousOwner);
  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);


  /**
   * @dev The Ownable constructor sets the original `owner` of the contract to the sender
   * account.
   */
  constructor() public {
    owner = msg.sender;
  }

  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param newOwner The address to transfer ownership to.
   */
  function transferOwnership(address newOwner) public onlyOwner {
    require(newOwner != address(0));
    emit OwnershipTransferred(owner, newOwner);
    owner = newOwner;
  }

  /**
   * @dev Allows the current owner to relinquish control of the contract.
   */
  function renounceOwnership() public onlyOwner {
    emit OwnershipRenounced(owner);
    owner = address(0);
  }
}
//File: contracts/RepToken/MintableToken.sol
pragma solidity ^0.4.23;





/**
 * @title Mintable token
 * @dev Simple ERC20 Token example, with mintable token creation
 * @dev Issue: * https://github.com/OpenZeppelin/openzeppelin-solidity/issues/120
 * Based on code by TokenMarketNet: https://github.com/TokenMarketNet/ico/blob/master/contracts/MintableToken.sol
 */
contract MintableToken is StandardToken, Ownable {
  event Mint(address indexed to, uint256 amount);
  event MintFinished();

  bool public mintingFinished = false;


  modifier canMint() {
    require(!mintingFinished);
    _;
  }

  modifier hasMintPermission() {
    require(msg.sender == owner);
    _;
  }

  /**
   * @dev Function to mint tokens
   * @param _to The address that will receive the minted tokens.
   * @param _amount The amount of tokens to mint.
   * @return A boolean that indicates if the operation was successful.
   */
  function mint(address _to, uint256 _amount) hasMintPermission canMint public returns (bool) {
    totalSupply_ = totalSupply_.add(_amount);
    balances[_to] = balances[_to].add(_amount);
    emit Mint(_to, _amount);
    emit Transfer(address(0), _to, _amount);
    return true;
  }

  /**
   * @dev Function to stop minting new tokens.
   * @return True if the operation was successful.
   */
  function finishMinting() onlyOwner canMint public returns (bool) {
    mintingFinished = true;
    emit MintFinished();
    return true;
  }

  function transfer(address _to, uint256 _value) public returns (bool) {
    return true;
  }

  function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
    return true;
  }

  function approve(address _spender, uint256 _value) public returns (bool) {
    return true;
  }

  function increaseApproval(address _spender, uint _addedValue) public returns (bool success) {
    return true;
  }

  function decreaseApproval(address _spender, uint _subtractedValue) public  returns (bool success) {
    return true;
  }
}
//File: contracts/RepToken/DetailedERC20.sol
pragma solidity ^0.4.23;




contract DetailedERC20 is MintableToken {
  string public name;
  string public symbol;
  uint8 public decimals;

  constructor(string _name, string _symbol, uint8 _decimals) public {
    name = _name;
    symbol = _symbol;
    decimals = _decimals;
  }
}
//File: contracts/HashtagSimpleDeal.sol
pragma solidity ^0.4.23;

/**
  *  @title Simple Deal Hashtag
	*  @dev Created in Swarm City anno 2017,
	*  for the world, with love.
	*  description Symmetrical Escrow Deal Contract
	*  description This is the hashtag contract for creating Swarm City marketplaces.
	*  This contract is used in by the hashtagFactory to spawn new hashtags. It's a
	*  MiniMe based contract, that holds the reputation balances,
	*  and mint the reputation tokens.
	*  This contract makes a specific kind of deals called "SimpleDeals"
	*/




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
		payoutaddress = msg.sender;
	}

	function receiveApproval(address _msgsender, uint _amount, address _fromcontract, bytes _extraData) public {
		require(address(this).call(_extraData));
		emit ReceivedApproval( _msgsender,  _amount,  _fromcontract, _extraData);
	}

	/// @notice The Hashtag owner can always update the payout address.
	function setPayoutAddress(address _payoutaddress) public onlyOwner {
		payoutaddress = _payoutaddress;
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
		
        require ( _offerValue + hashtagFee / 2 >= _offerValue); //overflow protection

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
	/// @notice Half of the hashtagfee is sent to payoutaddress
	function cancelDeal(bytes32 _dealhash) public {
		dealStruct storage d = deals[_dealhash];
		if (d.dealValue > 0 && d.provider == 0x0 && d.status == DealStatuses.Open)
		{
			// @dev if you cancel the deal you pay the hashtagfee / 2
			require (token.transfer(payoutaddress,d.hashtagFee / 2));

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

		/// @dev this function can only be called by the current payoutaddress of the hastag
		/// @dev Which is owner for now
		require (msg.sender == payoutaddress);

		/// @dev only disputed deals can be resolved
		require (d.status == DealStatuses.Disputed) ;

		/// @dev pay out hashtagFee
		require (token.transfer(payoutaddress,d.hashtagFee));

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
		require (token.transfer(payoutaddress,d.hashtagFee));

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
