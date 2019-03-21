pragma solidity >=0.4.22 <0.6.0;

contract IPFSEvents {
    event HashAdded(address pubKey, string hashAdded, uint ttl);
    event HashRemoved(address pubKey, string hashRemoved);
}