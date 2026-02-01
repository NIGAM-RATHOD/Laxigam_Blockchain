const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Starting Laxigam Contract Deployment...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy LXGToken
  console.log("\n📦 Deploying LXGToken...");
  const LXGToken = await ethers.getContractFactory("LXGToken");
  const lxgToken = await LXGToken.deploy(deployer.address);
  await lxgToken.waitForDeployment();
  console.log("✅ LXGToken deployed to:", await lxgToken.getAddress());

  // Deploy TrustScore
  console.log("\n📦 Deploying TrustScore...");
  const TrustScore = await ethers.getContractFactory("TrustScore");
  const trustScore = await TrustScore.deploy();
  await trustScore.waitForDeployment();
  console.log("✅ TrustScore deployed to:", await trustScore.getAddress());

  // Deploy AIValidator
  console.log("\n📦 Deploying AIValidator...");
  const AIValidator = await ethers.getContractFactory("AIValidator");
  const aiValidator = await AIValidator.deploy(deployer.address);
  await aiValidator.waitForDeployment();
  console.log("✅ AIValidator deployed to:", await aiValidator.getAddress());

  // Deploy GameBridge
  console.log("\n📦 Deploying GameBridge...");
  const GameBridge = await ethers.getContractFactory("GameBridge");
  const gameBridge = await GameBridge.deploy(
    await lxgToken.getAddress(),
    await trustScore.getAddress(),
    await aiValidator.getAddress()
  );
  await gameBridge.waitForDeployment();
  console.log("✅ GameBridge deployed to:", await gameBridge.getAddress());

  // Deploy NFTMarketplace
  console.log("\n📦 Deploying NFTMarketplace...");
  const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
  const nftMarketplace = await NFTMarketplace.deploy(
    await lxgToken.getAddress(),
    await trustScore.getAddress()
  );
  await nftMarketplace.waitForDeployment();
  console.log("✅ NFTMarketplace deployed to:", await nftMarketplace.getAddress());

  // Deploy Governance
  console.log("\n📦 Deploying Governance...");
  const Governance = await ethers.getContractFactory("Governance");
  const governance = await Governance.deploy(
    await lxgToken.getAddress(),
    await trustScore.getAddress()
  );
  await governance.waitForDeployment();
  console.log("✅ Governance deployed to:", await governance.getAddress());

  // Setup permissions
  console.log("\n🔐 Setting up permissions...");

  // Authorize GameBridge as minter
  await (await lxgToken.authorizeMinter(await gameBridge.getAddress())).wait();
  console.log("✅ GameBridge authorized as minter");

  // Authorize contracts in TrustScore
  await (await trustScore.registerAuthorizedContract(await gameBridge.getAddress())).wait();
  await (await trustScore.registerAuthorizedContract(await nftMarketplace.getAddress())).wait();
  console.log("✅ Contracts authorized in TrustScore");

  // Set oracle address in AIValidator (can be updated later)
  await (await aiValidator.setOracleAddress(deployer.address)).wait();
  console.log("✅ Oracle address set in AIValidator");

  // Register some sample games
  console.log("\n🎮 Registering sample games...");
  const sampleGames = ['GTA V', 'Minecraft', 'Fortnite', 'Roblox', 'CS:GO', 'Valorant'];
  for (const game of sampleGames) {
    await (await gameBridge.registerGame(game, deployer.address)).wait();
    console.log(`  ✅ Registered: ${game}`);
  }

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      LXGToken: await lxgToken.getAddress(),
      TrustScore: await trustScore.getAddress(),
      AIValidator: await aiValidator.getAddress(),
      GameBridge: await gameBridge.getAddress(),
      NFTMarketplace: await nftMarketplace.getAddress(),
      Governance: await governance.getAddress()
    }
  };

  // Save to file
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filename = `${network.name}-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(deploymentsDir, filename),
    JSON.stringify(deploymentInfo, null, 2)
  );

  // Also save as latest
  fs.writeFileSync(
    path.join(deploymentsDir, 'latest.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("\n📄 Deployment info saved to:", filename);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(60));
  console.log("\nContract Addresses:");
  console.log("  LXGToken:      ", await lxgToken.getAddress());
  console.log("  TrustScore:    ", await trustScore.getAddress());
  console.log("  AIValidator:   ", await aiValidator.getAddress());
  console.log("  GameBridge:    ", await gameBridge.getAddress());
  console.log("  NFTMarketplace:", await nftMarketplace.getAddress());
  console.log("  Governance:    ", await governance.getAddress());
  console.log("\n" + "=".repeat(60));

  // Verify contracts if on supported network
  if (network.name === 'polygon' || network.name === 'mumbai' || network.name === 'sepolia') {
    console.log("\n🔍 To verify contracts, run:");
    console.log(`  npx hardhat verify --network ${network.name} ${await lxgToken.getAddress()} "${deployer.address}"`);
    console.log(`  npx hardhat verify --network ${network.name} ${await trustScore.getAddress()}`);
    console.log(`  npx hardhat verify --network ${network.name} ${await aiValidator.getAddress()} "${deployer.address}"`);
    console.log(`  npx hardhat verify --network ${network.name} ${await gameBridge.getAddress()} "${await lxgToken.getAddress()}" "${await trustScore.getAddress()}" "${await aiValidator.getAddress()}"`);
    console.log(`  npx hardhat verify --network ${network.name} ${await nftMarketplace.getAddress()} "${await lxgToken.getAddress()}" "${await trustScore.getAddress()}"`);
    console.log(`  npx hardhat verify --network ${network.name} ${await governance.getAddress()} "${await lxgToken.getAddress()}" "${await trustScore.getAddress()}"`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
