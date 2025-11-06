import { network } from "hardhat";

const { ethers } = await network.connect({
  network: "hardhatOp",
  chainType: "op",
});

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  const CampaignFactory = await ethers.getContractFactory("CampaignFactory");
  console.log("Deploying contract...");
  const campaignFactory = await CampaignFactory.deploy();
  const deployTx = await campaignFactory.deploymentTransaction();
  console.log("CampaignFactory contract deployed to:", deployTx);
  const contractAddress = await campaignFactory.getAddress();
  console.log("CrowdFunding contract deployed to:", contractAddress);
  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
