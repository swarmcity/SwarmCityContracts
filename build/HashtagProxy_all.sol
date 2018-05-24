
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
//File: contracts/HashtagProxy/IPFSEvents.sol
pragma solidity ^0.4.18;


contract IPFSEvents {
    event HashAdded(address pubKey, string hashAdded, uint ttl);
    event HashRemoved(address pubKey, string hashRemoved);
}
//File: contracts/HashtagProxy/HashtagProxy.sol
pragma solidity ^0.4.18;





contract HashtagProxy is IPFSEvents,Ownable {
    mapping (string => string) hashtags;
    uint public defaultTTL;
    
    event HashtagSet(string hashtagName, string ipfsHash);
    
    function setHashtag(string _name, string _ipfsValue) onlyOwner external {
        require(bytes(_name).length != 0);
        require(bytes(_ipfsValue).length != 0 || bytes(getHashtagMetadata(_name)).length != 0);
        
        generateIPFSEvent(_name,_ipfsValue);
        HashtagSet(_name,_ipfsValue);
        hashtags[_name] = _ipfsValue;
    }

    function getHashtagMetadata(string _name) public view returns (string) {
        return hashtags[_name];
    }

    function setTTL(uint _ttl) onlyOwner public {
        defaultTTL = _ttl;
    }

    function generateIPFSEvent(string _name, string _ipfsValue) onlyOwner internal {
        if (bytes(_ipfsValue).length == 0) {
            HashRemoved(this, getHashtagMetadata(_name));
        }else {
            if (bytes(getHashtagMetadata(_name)).length != 0) {
                HashRemoved(this, getHashtagMetadata(_name));
            }
            HashAdded(this,_ipfsValue,defaultTTL);
        }
    }
}