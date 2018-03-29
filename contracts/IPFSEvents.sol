pragma solidity ^0.4.18;


contract IPFSEvents {
    event HashAdded(address pubKey, string hashAdded, uint ttl);
    event HashRemoved(address pubKey, string hashRemoved);
}