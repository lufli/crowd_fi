import { expect } from "chai";
import { network } from "hardhat";
import type { CampaignFactory, Campaign } from "../typechain-types/index.js";


const { ethers } = await network.connect();

describe("CampaignFactory", function () {
  let signers;
  let factory: CampaignFactory;
  let deployer: any;
  // let campaignAddress;
  // let campaign;

  beforeEach(async () => {
    signers = await ethers.getSigners();
    deployer = signers[0];

    const Factory = await ethers.getContractFactory("CampaignFactory");
    // TODO: I dont really know what is happening here
    factory = (await Factory.deploy()) as unknown as CampaignFactory;
    await factory.waitForDeployment();

    console.log("Deployed to:", await factory.getAddress());
  });

  it("deploys a CampaignFactory", async function () {
    // 创建一个新 Campaign
    const tx = await factory.createCampaign(
      "Test Campaign",
      "A simple campaign test",
      ethers.parseEther("0.01")
    );
    await tx.wait();

    // 获取所有已部署的 campaign 地址
    const campaigns = await factory.getDeployedCampaigns();
    expect(campaigns.length).to.equal(1);

    const campaignAddress = campaigns[0];

    // 连接到 Campaign 合约
    const campaign = (await ethers.getContractAt(
      "Campaign",
      campaignAddress
    )) as Campaign;

    // 验证 manager 是 deployer
    const manager = await campaign.manager();
    expect(manager).to.equal(deployer.address);
  });

  it("createCampaign deploy a campaign correctly", async function () {
    expect(true).to.be.true;``
  });

  it("getDeployedCampaigns return all deployed campaigns", async function () {
    expect(true).to.be.true;``
  });
});
