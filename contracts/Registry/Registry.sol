pragma solidity ^0.4.18;

/**
*  @title Registry
*  @dev Created in Swarm City anno 2018,
*  for the world, with love.
*  description Registry Contract
*  description This contract is a single source of truth for usernames and avatars.
*/

contract AvatarRegistry {

    mapping (address => string) public avatars;
    mapping (address => string) public usernames;

    event SetAvatar(address user, string ipfsHash);
    event SetUsername(address user, string username);
    
    constructor() public {}

    function setAvatar(string _ipfsHash) public {
        avatars[msg.sender] = _ipfsHash;
        emit SetAvatar(msg.sender, _ipfsHash);
    }
    
    function setUsername(string _username) public {
        usernames[msg.sender] = _username;
        emit SetUsername(msg.sender, _username);
    }
    
    function getAvatar(address _user) public view returns (string) {
        return avatars[_user];
    }
    
    function getUsername(address _user) public view returns (string) {
        return usernames[_user];
    }
}