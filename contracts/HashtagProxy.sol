pragma solidity ^0.4.18;

import "./Ownable.sol";
import "./IPFSEvents.sol";


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