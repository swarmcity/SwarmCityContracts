pragma solidity ^0.4.23;

import "./MintableToken.sol";


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