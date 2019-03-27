pragma solidity >=0.4.22 <0.6.0;

/**
*  @title Hashtag List
*  @dev Created in Swarm City anno 2018,
*  for the world, with love.
*  description Hashtag List Contract
*  description This is the Hashtag List contract for Swarm City marketplaces.
*  In it, "allowed" marketplaces that are advertised in the app are being stored.
*/

import "./Ownable.sol";

contract HashtagList is Ownable {

    enum HashtagStatus { NonExistent, Enabled, Disabled }
    /// @dev instead of using an array of structs, an array and mapping is used to easily prevent address duplication
    address[] public hashtags;
    mapping(address=>HashtagStatus) public hashtagsStatus;

    event HashtagAdded(address indexed hashtagAddress);
    
    constructor() public {}

    function addHashtag(address _hashtagAddress) external onlyOwner {
        require(hashtagsStatus[_hashtagAddress] == HashtagStatus.NonExistent, "Hashtag already registered");
        hashtags.push(_hashtagAddress);
        hashtagsStatus[_hashtagAddress] = HashtagStatus.Enabled;
        emit HashtagAdded(_hashtagAddress);
    }

    function disableHashtag(address _hashtagAddress) external onlyOwner {
        require(hashtagsStatus[_hashtagAddress] == HashtagStatus.Enabled, "Hashtag must be enabled");
        hashtagsStatus[_hashtagAddress] = HashtagStatus.Disabled;
    }

    function enableHashtag(address _hashtagAddress) external onlyOwner {
        require(hashtagsStatus[_hashtagAddress] == HashtagStatus.Disabled, "Hashtag must be disabled");
        hashtagsStatus[_hashtagAddress] = HashtagStatus.Enabled;
    }

    function getHashtags() external view returns(address[] memory) {
        return hashtags;
    }

    function getHashtagCount() external view returns (uint) {
        return hashtags.length;
    }
}