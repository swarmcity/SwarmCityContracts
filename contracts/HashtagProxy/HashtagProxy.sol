pragma solidity >=0.4.22 <0.6.0;

import "../Ownable.sol";
import "./IPFSEvents.sol";

contract HashtagProxy is IPFSEvents,Ownable {
    mapping (string => string) hashtags;
    uint public defaultTTL;
    
    event HashtagSet(string hashtagName, string ipfsHash);
    
    function setHashtag(string calldata _name, string calldata _ipfsValue) onlyOwner external {
        require(bytes(_name).length != 0);
        require(bytes(_ipfsValue).length != 0 || bytes(getHashtagMetadata(_name)).length != 0);
        
        generateIPFSEvent(_name,_ipfsValue);
        hashtags[_name] = _ipfsValue;
        emit HashtagSet(_name,_ipfsValue);
    }

    function getHashtagMetadata(string memory _name) public view returns (string memory) {
        return hashtags[_name];
    }

    function setTTL(uint _ttl) onlyOwner public {
        defaultTTL = _ttl;
    }

    function generateIPFSEvent(string memory _name, string memory _ipfsValue) onlyOwner internal {
        if (bytes(_ipfsValue).length == 0) {
            emit HashRemoved(address(this), getHashtagMetadata(_name));
        } else {
            if (bytes(getHashtagMetadata(_name)).length != 0) {
                emit HashRemoved(address(this), getHashtagMetadata(_name));
            }
            emit HashAdded(address(this),_ipfsValue,defaultTTL);
        }
    }
}