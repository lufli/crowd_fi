import { expect } from "chai";
import { network } from "hardhat";
import type { CampaignFactory, Campaign } from "../typechain-types/index.js";
import type { Signer } from "ethers";


const { ethers } = await network.connect();

describe("CampaignFactory", function () {
  let signers;
  let factory: CampaignFactory;
  let deployer: any;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    deployer = signers[0];

    const Factory = await ethers.getContractFactory("CampaignFactory");
    factory = (await Factory.deploy()) as unknown as CampaignFactory;
    await factory.waitForDeployment();
  });

  it("createCampaign deploy a campaign correctly", async function () {
    const tx = await factory.createCampaign(
      "Test Campaign",
      "A simple campaign test",
      ethers.parseEther("0.01")
    );
    await tx.wait();

    const campaigns = await factory.getDeployedCampaigns();
    expect(campaigns.length).to.equal(1);

    const campaignAddress = campaigns[0];
    const campaign = (await ethers.getContractAt(
      "Campaign",
      campaignAddress
    )) as Campaign;

    const manager = await campaign.manager();
    expect(manager).to.equal(deployer.address);
  });


  it("getDeployedCampaigns return all deployed campaigns", async function () {
    const campaigns = await factory.getDeployedCampaigns();
    expect(campaigns).to.be.an("array").that.is.empty;

    const tx1 = await factory.createCampaign(
      "Test Campaign",
      "A simple campaign test",
      ethers.parseEther("0.01")
    );
    await tx1.wait();
    const campaigns1 = await factory.getDeployedCampaigns();
    expect(campaigns1.length).to.equal(1);

    const tx2 = await factory.createCampaign(
      "Another Campaign",
      "Another campaign test",
      ethers.parseEther("0.5")
    );
    await tx2.wait();
    const campaigns2 = await factory.getDeployedCampaigns();
    expect(campaigns2.length).to.equal(2);
  });
});

describe("Campaign", function () {
  let manager: Signer;
  let user1: Signer;
  let user2: Signer;
  let user3: Signer;
  let campaign: Campaign;

  beforeEach(async () => {
    [manager, user1, user2, user3] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CampaignFactory");
    const factory = (await Factory.deploy()) as unknown as CampaignFactory;
    await factory.waitForDeployment();

    // manager create an campaign
    const tx = await factory.connect(manager).createCampaign(
      "Test Campaign",
      "A simple campaign test",
      ethers.parseEther("0.01")
    );
    await tx.wait();

    // get the deployed campaign
    const campaigns = await factory.getDeployedCampaigns();
    const campaignAddress = campaigns[0];
    const CampaignContract = await ethers.getContractFactory("Campaign");
    campaign = CampaignContract.attach(campaignAddress) as Campaign;
  });

  it("allow user to contribute the campaign and to be marked as approver", async function () {
    // Failed if contribute is smaller than minimum requirement
    await expect(
      campaign.connect(user1).contribute({ value: ethers.parseEther("0.005") })
    ).to.be.revertedWith("Contribution below minimum");

    // Success if contribute at least reach the minimum requirement
    await campaign.connect(user1).contribute({ value: ethers.parseEther("0.02") });

    // check approvers map
    const isApprover = await campaign.approvers(await user1.getAddress());
    expect(isApprover).to.be.true;
  });

  it("allow manager to create a request", async function () {
    // Failed if the creator is not the manager
    await expect(
      campaign.connect(user1).createRequest("A Test Request", "Just a simple test request", ethers.parseEther("0.1"), user3)
    ).to.be.revertedWith("Only manager can call this method");

    // Success if the creator is the manager
    await campaign.connect(manager).createRequest("A Test Request", "Just a simple test request", ethers.parseEther("0.1"), user3);

    const request = await campaign.requests(0);
    expect(request.name).to.equal("A Test Request");
    expect(request.description).to.equal("Just a simple test request");
    expect(request.value).to.equal(ethers.parseEther("0.1"));
    expect(request.recipient).to.equal(user3);
    expect(request.completed).to.be.false;
    expect(request.approvalCount).to.equal(0);
  });

  it("allow approver to give approval to a request", async function () {
    await campaign.connect(manager).createRequest("A Test Request", "Just a simple test request", ethers.parseEther("0.1"), user3);
    await campaign.connect(user1).contribute({ value: ethers.parseEther("0.02") });
    // Failed if not the approver
    expect(
      campaign.connect(user2).approveRequest(0)
    ).to.be.revertedWith("Only valid contributor can approve requests");

    // Success if an approver giving a approval
    await campaign.connect(user1).approveRequest(0);

    const request = await campaign.requests(0);
    expect(request.approvalCount).to.equal(1);

    // But, an approver can only give same request one approve only
    expect(
      campaign.connect(user1).approveRequest(0)
    ).to.be.revertedWith("A same approver can not approve one request twice");
  });

  it("allow manager to finalize a request", async function () {
    await campaign.connect(manager).createRequest("A Test Request", "Just a simple test request", ethers.parseEther("0.1"), user3);
    await campaign.connect(user1).contribute({ value: ethers.parseEther("1") });
    const before = await ethers.provider.getBalance(user3);

    // Failed if the approval's count is not reach the requirement
    expect(
      campaign.connect(manager).finalizeRequest(0)
    ).to.be.revertedWith("ApprovalCount have to be greater than approversCount / 2");

    // Failed if not the manager finalize the request
    await campaign.connect(user1).approveRequest(0);
    expect(
      campaign.connect(user1).finalizeRequest(0)
    ).to.be.revertedWith("Only manager can call this method");

    // Success
    await campaign.connect(manager).finalizeRequest(0);
    const after = await ethers.provider.getBalance(user3);
    expect(after - before).to.equal(ethers.parseEther("0.1"));
  });

  it("getSummary returns campaign detail infomation", async function () {
    await campaign.connect(manager).createRequest("A Test Request", "Just a simple test request", ethers.parseEther("0.1"), user3);
    await campaign.connect(user1).contribute({ value: ethers.parseEther("1") });

    const summary = await campaign.getSummary();
    expect(summary[0]).to.equal("Test Campaign");
    expect(summary[1]).to.equal("A simple campaign test");
    expect(summary[2]).to.equal(ethers.parseEther("0.01"));
    expect(summary[3]).to.equal(ethers.parseEther("1"));
    expect(summary[4]).to.equal(1);
    expect(summary[5]).to.equal(1);
    expect(summary[6]).to.equal(manager);
  });

  it("getRequestsCount return number of requests", async function () {
    // 0 request
    expect(await campaign.getRequestsCount()).to.equal(0);
    await campaign.connect(manager).createRequest("The 1st Request", "First test request", ethers.parseEther("0.1"), user3);
    // 1 request
    expect(await campaign.getRequestsCount()).to.equal(1);
    await campaign.connect(manager).createRequest("The 2nd Request", "Second test request", ethers.parseEther("0.2"), user3);
    // 2 requests
    expect(await campaign.getRequestsCount()).to.equal(2);
  });
});