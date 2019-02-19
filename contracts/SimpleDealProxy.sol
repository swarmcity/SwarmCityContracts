pragma solidity ^0.4.23;

/**
*  @title Simple Deal Hashtag Proxy
*  @dev Created in Swarm City anno 2019,
*  for the world, with love.
*  description Symmetrical Escrow Deal Contract
*  description This is the hashtag contract for creating Swarm City marketplaces.
*  It's the first, most simple approach to making Swarm City work.
*  This contract creates "SimpleDeals".
*/

import "./IMiniMeToken.sol";
import "./RepToken/DetailedERC20.sol";
import "./SimpleDealData.sol";
import "./SimpleDealLogic.sol";

contract SimpleDealProxy is Ownable {
    /// @param_hashtagName The human readable name of the hashtag
    string public hashtagName;
    /// @param_hashtagFee The fixed hashtag fee in SWT
    uint public hashtagFee;
    /// @param_token The SWT token
    IMiniMeToken public token;
    /// @param_ProviderRep The rep token that is minted for the Provider
    DetailedERC20 public ProviderRep;
    /// @param_SeekerRep The rep token that is minted for the Seeker
    DetailedERC20 public SeekerRep;
    /// @param_payoutaddress The address where the hashtag fee is sent.
    address public payoutAddress;
    /// @param_hashtagMetadataHash The IPFS hash metadata for this hashtag
    /// @dev using bytes32 instead of string, * ref https://ethereum.stackexchange.com/questions/17094/how-to-store-ipfs-hash-using-bytes
    bytes32 public hashtagMetadataHash;
    /// @param_deployBlock Set in the constructor. Used to log more efficiently
    uint public deployBlock;
    /// @param_simpledealData The data contract to use
    SimpleDealData public Data;
    /// @param_simpledealLogic The logic contract to use
    SimpleDealLogic public Logic;

    /// @notice The function that creates the hashtag
    constructor(address _token, string _hashtagName, uint _hashtagFee, bytes32 _hashtagMetadataHash) public {

        /// @notice The name of the hashtag is set
        hashtagName = _hashtagName;

        /// @notice The seeker reputation token is created
        SeekerRep = new DetailedERC20("SeekerRep", "SWRS", 0);

        /// @notice The provider reputation token is created
        ProviderRep = new DetailedERC20("ProviderRep", "SWRP", 0);

        /// @notice The data contract is created
        Data = new SimpleDealData(this);

        /// @notice The data contract is created
        Logic = new SimpleDealLogic(this);

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

    function setSimpleDealData(address _datacontract) public {
        Data = SimpleDealData(_datacontract);
    }

    function setSimpleDealData(address _logiccontract) public {
        Logic = SimpleDealLogic(_logiccontract);
    }

    function receiveApproval(address _msgsender, uint _amount, address _fromcontract, bytes _extraData) public {
        require(Logic.call(_extraData), "Error calling extraData");
        emit ReceivedApproval(_msgsender, _amount, _fromcontract, _extraData);
    }

    function onTokenTransfer(address _msgsender, uint256 _amount, bytes _extraData) public {
        require(Logic.call(_extraData), "Error calling extraData");
        emit OnTokenTransfer(_msgsender, _amount, _extraData);
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
}

