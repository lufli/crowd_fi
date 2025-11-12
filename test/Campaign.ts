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

    // Success if the creator is the manager

  });

  it("allow approver to give approval to a request", async function () {
    // Failed if not the approver

    // Success if an approver giving a approval

  });

  it("allow manager to finalize a request", async function () {
    // Failed if not the manager finalize the request

    // Failed if the approval's count is not reach the requirement

    // Success

  });

  it("getSummary returns campaign detail infomation", async function () {

  });

  it("getRequestsCount return number of requests", async function () {
    // 0 request

    // 1 request

    // 2 requests
  });
});