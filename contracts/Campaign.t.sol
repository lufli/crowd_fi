// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {CampaignFactory, Campaign} from "./Campaign.sol";
import {Test} from "forge-std/Test.sol";

contract CampaignFactoryTest is Test {
  CampaignFactory factory;
  address manager1 = address(0x123);
  address manager2 = address(0x456);
  address user1 = address(0x789);
  address user2 = address(0x987);

  function setUp() public {
    factory = new CampaignFactory();
    vm.deal(manager1, 10 ether);
    vm.deal(manager2, 10 ether);
  }

  function test_CreateCampaign() public {
    vm.startPrank(manager1);

    address campaignAddress = factory.createCampaign("Test Campaign", "A simple campaign test", 0.01 ether);
    assertTrue(factory.deployedCampaigns(0) == campaignAddress, "New campaign should in factory's deployedCampaigns");

    Campaign campaign = Campaign(payable(campaignAddress));
    assertEq(campaign.name(), "Test Campaign");
    assertEq(campaign.description(), "A simple campaign test");
    assertEq(campaign.manager(), manager1);
    assertEq(campaign.minimumContribution(), 0.01 ether);
    assertEq(campaign.approversCount(), 0);
    assertEq(address(campaign).balance, 0);

    vm.stopPrank();
  }

  function test_getDeployedCampaigns() public {
    vm.prank(manager1);
    assertTrue(factory.getDeployedCampaigns().length == 0, "There is not any campaigns before creating one");

    factory.createCampaign("Test Campaign", "A simple campaign test", 0.01 ether);
    assertTrue(factory.getDeployedCampaigns().length == 1, "There is 1 campaign if we created 1");

    vm.prank(manager2);
    factory.createCampaign("Another Test Campaign", "Another simple campaign test", 0.05 ether);
    assertTrue(factory.getDeployedCampaigns().length == 2, "There is 2 campaigns if we created 2");

    vm.stopPrank();
  }
}

contract CampaignTest is Test {
  Campaign campaign;
  address manager = address(0x123);
  address user1 = address(0x234);
  address user2 = address(0x345);
  address user3 = address(0x456);
  address receiver = address(0x567);
  address campaignAddress;

  function setUp() public {
    CampaignFactory factory = new CampaignFactory();
    vm.deal(manager, 10 ether);
    vm.startPrank(manager);
    campaignAddress = factory.createCampaign("Test Campaign", "A simple campaign test", 0.01 ether);
    campaign = Campaign(payable(campaignAddress));
    vm.stopPrank();
  }

  function test_contribute() public {
    vm.deal(user1, 1 ether);
    vm.deal(user2, 1 ether);
    vm.deal(user3, 1 ether);

    // user1 contribute 0.01
    vm.prank(user1);
    campaign.contribute{value: 0.01 ether}();

    assertEq(campaign.approvers(user1), true, "user1 should be a valid approver");
    assertEq(campaign.approversCount(), 1, "approversCount should be 1");
    assertEq(address(campaign).balance, 0.01 ether, "Balance should be 0.01");

    // user2 contribute 0.05
    vm.prank(user2);
    campaign.contribute{value: 0.05 ether}();

    assertEq(campaign.approvers(user2), true, "user2 should be a valid approver");
    assertEq(campaign.approversCount(), 2, "approversCount should be 2");
    assertEq(address(campaign).balance, 0.06 ether, "Balance should be 0.06");

    // user3 contribute 0.009
    vm.prank(user3);
    vm.expectRevert("Contribution below minimum");
    campaign.contribute{value: 0.009 ether}();

    assertEq(campaign.approvers(user3), false, "user3 should not be a valid approver");
    assertEq(campaign.approversCount(), 2, "approversCount should be 2");
    assertEq(address(campaign).balance, 0.06 ether, "Balance should be 0.06");
  
    vm.stopPrank();
  }

  function test_createRequest() public {
    vm.startPrank(manager);
    campaign.createRequest("Test Request", "A simple request", 1 ether, user1);
    campaign.createRequest("Another Test Request", "Another simple request", 0.5 ether, user2);
    vm.stopPrank();

    (
      string memory name1,
      string memory description1,
      uint value1,
      address recipient1,
      bool completed1,
      uint approvalCount1
    ) = campaign.requests(0);
    assertEq(name1, "Test Request");
    assertEq(description1, "A simple request");
    assertEq(value1, 1 ether);
    assertEq(recipient1, user1);
    assertEq(completed1, false);
    assertEq(approvalCount1, 0);

    (
      string memory name2,
      string memory description2,
      uint value2,
      address recipient2,
      bool completed2,
      uint approvalCount2
    ) = campaign.requests(1);
    assertEq(name2, "Another Test Request");
    assertEq(description2, "Another simple request");
    assertEq(value2, 0.5 ether);
    assertEq(recipient2, user2);
    assertEq(completed2, false);
    assertEq(approvalCount2, 0);
  }

  function test_approveRequest() public {
    vm.deal(user1, 1 ether);
    vm.deal(user2, 1 ether);
    vm.prank(manager);
    campaign.createRequest("Test Request", "A simple request", 1 ether, user1);

    vm.startPrank(user1);
    vm.expectRevert("Only valid contributor can approve requests");
    campaign.approveRequest(0);
    (, , , , , uint approvalCount1) = campaign.requests(0);
    assertEq(approvalCount1, 0);

    campaign.contribute{value: 0.01 ether}();
    campaign.approveRequest(0);
    (, , , , , uint approvalCount2) = campaign.requests(0);
    assertEq(approvalCount2, 1);
    vm.stopPrank();
  }

  function test_finalizeRequest() public {
    vm.deal(user1, 1 ether);
    vm.deal(user2, 1 ether);
    vm.deal(user3, 1 ether);
    address recipient = address(0x118);
    uint beforeBalance = recipient.balance;
    // check recipient balance here
    vm.prank(manager);
    campaign.createRequest("Test Request", "A simple request", 0.5 ether, recipient);
    vm.prank(user1);
    campaign.contribute{value: 0.1 ether}();
    vm.prank(user2);
    campaign.contribute{value: 0.2 ether}();
    vm.prank(user3);
    campaign.contribute{value: 0.3 ether}();
    
    // Can not finalize request with approvers 0 / 3
    vm.prank(manager);
    vm.expectRevert("ApprovalCount have to be greater than approversCount / 2");
    campaign.finalizeRequest(0);

    // Can not finalize request with approvers 1 / 3
    vm.prank(user1);
    campaign.approveRequest(0);
    vm.prank(manager);
    vm.expectRevert("ApprovalCount have to be greater than approversCount / 2");
    campaign.finalizeRequest(0);

    // Can not finalize request with approvers 1 / 3 (Same contributor approved twice)
    vm.prank(user1);
    vm.expectRevert("A same approver can not approve one request twice");
    campaign.approveRequest(0);
    vm.prank(manager);
    vm.expectRevert("ApprovalCount have to be greater than approversCount / 2");
    campaign.finalizeRequest(0);


    // Can finalize request with approvers 2 / 3 (manager only)
    vm.prank(user2);
    campaign.approveRequest(0);
    vm.prank(user2); // Only manager can finalize requests
    vm.expectRevert("Only manager can call this method");
    campaign.finalizeRequest(0);
    vm.prank(manager);
    campaign.finalizeRequest(0);

    // Check completed status and recipient balance
    (, , , , bool completed,) = campaign.requests(0);
    assertEq(completed, true, "Request is marked as complated");
    uint afterBalance = recipient.balance;
    assertEq(afterBalance - beforeBalance, 0.5 ether);
  }

  function test_getSummary() public {
    vm.deal(user1, 1 ether);
    vm.deal(user2, 1 ether);

    vm.prank(manager);
    campaign.createRequest("Test Request", "A simple request", 0.5 ether, user3);

    vm.prank(user1);
    campaign.contribute{value: 0.01 ether}();

    vm.prank(user2);
    campaign.contribute{value: 0.02 ether}();


    (
        string memory name,
        string memory description,
        uint minimumContribution,
        uint balance,
        uint requestsCount,
        uint approversCount,
        address managerAddress
    ) = campaign.getSummary();

    assertEq(name, "Test Campaign");
    assertEq(description, "A simple campaign test");
    assertEq(minimumContribution, 0.01 ether);
    assertEq(balance, 0.03 ether);
    assertEq(requestsCount, 1);
    assertEq(approversCount, 2);
    assertEq(managerAddress, manager);
  }

  function test_getRequestsCount() public {
    assertEq(campaign.getRequestsCount(), 0, "There is any request before creating any");
    vm.prank(manager);
    campaign.createRequest("Test Request", "A simple request", 1 ether, user1);
    assertEq(campaign.getRequestsCount(), 1, "There is 1 request after creating one");
    vm.prank(manager);
    campaign.createRequest("Another Test Request", "Another simple request", 0.5 ether, user2);
    assertEq(campaign.getRequestsCount(), 2, "There are 2 requests after creating two");
  }
}