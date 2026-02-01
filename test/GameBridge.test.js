const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GameBridge", function () {
  let LXGToken;
  let lxgToken;
  let TrustScore;
  let trustScore;
  let AIValidator;
  let aiValidator;
  let GameBridge;
  let gameBridge;
  let owner;
  let addr1;
  let addr2;
  let treasury;

  beforeEach(async function () {
    [owner, addr1, addr2, treasury] = await ethers.getSigners();

    // Deploy LXGToken
    LXGToken = await ethers.getContractFactory("LXGToken");
    lxgToken = await LXGToken.deploy(treasury.address);
    await lxgToken.waitForDeployment();

    // Deploy TrustScore
    TrustScore = await ethers.getContractFactory("TrustScore");
    trustScore = await TrustScore.deploy();
    await trustScore.waitForDeployment();

    // Deploy AIValidator
    AIValidator = await ethers.getContractFactory("AIValidator");
    aiValidator = await AIValidator.deploy(owner.address);
    await aiValidator.waitForDeployment();

    // Deploy GameBridge
    GameBridge = await ethers.getContractFactory("GameBridge");
    gameBridge = await GameBridge.deploy(
      await lxgToken.getAddress(),
      await trustScore.getAddress(),
      await aiValidator.getAddress()
    );
    await gameBridge.waitForDeployment();

    // Authorize GameBridge in TrustScore
    await trustScore.registerAuthorizedContract(await gameBridge.getAddress());

    // Transfer some LXG to addr1
    await lxgToken.transfer(addr1.address, ethers.parseEther("10000"));
    await lxgToken.connect(addr1).approve(await gameBridge.getAddress(), ethers.parseEther("10000"));
  });

  describe("Game Registration", function () {
    it("Should allow owner to register a game", async function () {
      await expect(gameBridge.registerGame("GTA V", addr2.address))
        .to.emit(gameBridge, "GameRegistered")
        .withArgs("GTA V", addr2.address, await ethers.provider.getBlock("latest").then(b => b.timestamp));
    });

    it("Should track registered games", async function () {
      await gameBridge.registerGame("Minecraft", addr2.address);
      expect(await gameBridge.registeredGames("Minecraft")).to.be.true;
    });

    it("Should not allow non-owner to register game", async function () {
      await expect(
        gameBridge.connect(addr1).registerGame("Test Game", addr2.address)
      ).to.be.revertedWithCustomError(gameBridge, "OwnableUnauthorizedAccount");
    });
  });

  describe("Deposit to Game", function () {
    beforeEach(async function () {
      await gameBridge.registerGame("GTA V", addr2.address);
    });

    it("Should deposit tokens to game", async function () {
      const amount = ethers.parseEther("100");
      
      await expect(gameBridge.connect(addr1).depositToGame(amount, "GTA V"))
        .to.emit(gameBridge, "DepositToGame")
        .withArgs(addr1.address, amount, "GTA V", await ethers.provider.getBlock("latest").then(b => b.timestamp), 0);
    });

    it("Should update game balance", async function () {
      const amount = ethers.parseEther("100");
      await gameBridge.connect(addr1).depositToGame(amount, "GTA V");
      
      const balance = await gameBridge.getGameBalance(addr1.address, "GTA V");
      expect(balance).to.equal(amount);
    });

    it("Should update total game balance", async function () {
      const amount = ethers.parseEther("100");
      await gameBridge.connect(addr1).depositToGame(amount, "GTA V");
      
      const [, totalGameBal] = await gameBridge.getBalance(addr1.address);
      expect(totalGameBal).to.equal(amount);
    });

    it("Should fail for unregistered game", async function () {
      const amount = ethers.parseEther("100");
      await expect(
        gameBridge.connect(addr1).depositToGame(amount, "Unregistered Game")
      ).to.be.revertedWith("Game not registered");
    });

    it("Should fail for zero amount", async function () {
      await expect(
        gameBridge.connect(addr1).depositToGame(0, "GTA V")
      ).to.be.revertedWith("Amount must be > 0");
    });
  });

  describe("Withdraw from Game", function () {
    beforeEach(async function () {
      await gameBridge.registerGame("GTA V", addr2.address);
      const amount = ethers.parseEther("100");
      await gameBridge.connect(addr1).depositToGame(amount, "GTA V");
    });

    it("Should withdraw tokens from game", async function () {
      const withdrawAmount = ethers.parseEther("50");
      
      await expect(gameBridge.connect(addr1).withdrawToWallet(withdrawAmount, "GTA V"))
        .to.emit(gameBridge, "WithdrawToWallet")
        .withArgs(addr1.address, withdrawAmount, "GTA V", await ethers.provider.getBlock("latest").then(b => b.timestamp));
    });

    it("Should update game balance after withdrawal", async function () {
      const withdrawAmount = ethers.parseEther("50");
      await gameBridge.connect(addr1).withdrawToWallet(withdrawAmount, "GTA V");
      
      const balance = await gameBridge.getGameBalance(addr1.address, "GTA V");
      expect(balance).to.equal(ethers.parseEther("50"));
    });

    it("Should fail if insufficient game balance", async function () {
      await expect(
        gameBridge.connect(addr1).withdrawToWallet(ethers.parseEther("200"), "GTA V")
      ).to.be.revertedWith("Insufficient game balance");
    });
  });

  describe("Escrow", function () {
    beforeEach(async function () {
      await gameBridge.registerGame("GTA V", addr2.address);
      // Transfer more tokens for escrow test
      await lxgToken.transfer(addr1.address, ethers.parseEther("50000"));
      await lxgToken.connect(addr1).approve(await gameBridge.getAddress(), ethers.parseEther("50000"));
    });

    it("Should create escrow for large amounts", async function () {
      const amount = ethers.parseEther("15000"); // Above 10k threshold
      
      await expect(gameBridge.connect(addr1).depositToGame(amount, "GTA V"))
        .to.emit(gameBridge, "EscrowCreated");
    });

    it("Should not release escrow before time", async function () {
      const amount = ethers.parseEther("15000");
      await gameBridge.connect(addr1).depositToGame(amount, "GTA V");
      
      const escrows = await gameBridge.getUserEscrows(addr1.address);
      
      await expect(
        gameBridge.connect(addr1).releaseEscrow(escrows[0])
      ).to.be.revertedWith("Escrow period not over");
    });
  });

  describe("Transfer Between Games", function () {
    beforeEach(async function () {
      await gameBridge.registerGame("GTA V", addr2.address);
      await gameBridge.registerGame("Minecraft", addr2.address);
      const amount = ethers.parseEther("100");
      await gameBridge.connect(addr1).depositToGame(amount, "GTA V");
    });

    it("Should transfer between games", async function () {
      const transferAmount = ethers.parseEther("50");
      
      await gameBridge.connect(addr1).transferBetweenGames(transferAmount, "GTA V", "Minecraft");
      
      const gtaBalance = await gameBridge.getGameBalance(addr1.address, "GTA V");
      const mcBalance = await gameBridge.getGameBalance(addr1.address, "Minecraft");
      
      expect(gtaBalance).to.equal(ethers.parseEther("50"));
      expect(mcBalance).to.equal(transferAmount);
    });
  });

  describe("P2P Transfer", function () {
    beforeEach(async function () {
      await gameBridge.registerGame("GTA V", addr2.address);
      const amount = ethers.parseEther("100");
      await gameBridge.connect(addr1).depositToGame(amount, "GTA V");
    });

    it("Should transfer to another player in same game", async function () {
      const transferAmount = ethers.parseEther("50");
      
      await gameBridge.connect(addr1).p2pTransfer(addr2.address, transferAmount, "GTA V");
      
      const senderBalance = await gameBridge.getGameBalance(addr1.address, "GTA V");
      const receiverBalance = await gameBridge.getGameBalance(addr2.address, "GTA V");
      
      expect(senderBalance).to.equal(ethers.parseEther("50"));
      expect(receiverBalance).to.equal(transferAmount);
    });
  });

  describe("Transaction History", function () {
    beforeEach(async function () {
      await gameBridge.registerGame("GTA V", addr2.address);
    });

    it("Should track transaction history", async function () {
      const amount = ethers.parseEther("100");
      await gameBridge.connect(addr1).depositToGame(amount, "GTA V");
      
      const history = await gameBridge.getTransactionHistory(addr1.address);
      expect(history.length).to.be.greaterThan(0);
    });
  });
});
