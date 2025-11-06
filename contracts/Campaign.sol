// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;


contract CampaignFactory {
  address payable[] public deployedCampaigns;

  function createCampaign(string memory newCampaignName, string memory newCampaignDescription, uint minimum) public returns (address) {
    address newCampaign = address(new Campaign(newCampaignName, newCampaignDescription, minimum, msg.sender));
    deployedCampaigns.push(payable(newCampaign));
    return address(newCampaign);
  }

  function getDeployedCampaigns() public view returns (address payable[] memory) {
    return deployedCampaigns;
  }
}

contract Campaign {
  struct Request {
    string name;
    string description;
    uint value;
    address recipient;
    bool completed;
    uint approvalCount;
    mapping(address => bool) approvals;
  }

  address public manager; // owner who create current campaign
  string public name;
  string public description;
  uint public minimumContribution;  // minimum contribution amount to be a valid approver
  uint public approversCount;
  mapping(address => bool) public approvers;
  Request[] public requests;

  constructor (string memory newCampaignName, string memory newCampaignDescription, uint minimum, address creator) {
    manager = creator;
    name = newCampaignName;
    description = newCampaignDescription;
    minimumContribution = minimum;
  }

  modifier restricted() {
    require(msg.sender == manager, "Only manager can call this method");
    _;
  }

  function contribute() public payable {
    require(msg.value >= minimumContribution, "Contribution below minimum");

    if (!approvers[msg.sender]) {
        approvers[msg.sender] = true;
        approversCount++;
    }
  }

  function createRequest(string memory requestName, string memory requestDescription, uint value, address recipient) public restricted {
    Request storage newRequest = requests.push();
    newRequest.name = requestName;
    newRequest.description = requestDescription;
    newRequest.value = value;
    newRequest.recipient = recipient;
    newRequest.completed = false;
    newRequest.approvalCount = 0;
  }

  function approveRequest(uint index) public {
    require(approvers[msg.sender], "Only valid contributor can approve requests");

    Request storage request = requests[index];
    require(!request.approvals[msg.sender], "A same approver can not approve one request twice");

    request.approvals[msg.sender] = true;
    request.approvalCount++;
  }

  function finalizeRequest(uint index) public {
    Request storage request = requests[index];
    require(!request.completed);
    require(request.approvalCount > (approversCount / 2), "ApprovalCount have to be greater than approversCount / 2");

    payable(request.recipient).transfer(request.value);
    request.completed = true;

  }

  function getSummary() public view returns (
    string memory, string memory, uint, uint, uint, uint, address
    ) {
      string memory nameMemory = name;
      string memory descriptionMemory = description;

      return (
        nameMemory,
        descriptionMemory,
        minimumContribution,
        address(this).balance,
        requests.length,
        approversCount,
        manager
      );
  }

  function getRequestsCount() public view returns (uint) {
    return requests.length;
  }
}