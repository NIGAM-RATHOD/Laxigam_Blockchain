const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LXGToken", function () {
  let LXGToken;
  let lxgToken;
  let owner;
  let addr1;
  let addr2;
  let treasury;

  const INITIAL_SUPPLY = ethers.parseEther("1000000000"); // 1 billion

  beforeEach(async function () {
    [owner, addr1, addr2, treasury] = await ethers.getSigners();
    
    LXGToken = await ethers.getContractFactory("LXGToken");
    lxgToken = await LXGToken.deploy(treasury.address);
    await lxgToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await lxgToken.name()).to.equal("Laxigam");
      expect(await lxgToken.symbol()).to.equal("LXG");
    });

    it("Should have correct total supply", async function () {
      expect(await lxgToken.totalSupply()).to.equal(INITIAL_SUPPLY);
    });

    it("Should mint initial supply to deployer", async function () {
      expect(await lxgToken.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
    });

    it("Should emit GenesisCreated event", async function () {
      await expect(lxgToken.deploymentTransaction())
        .to.emit(lxgToken, "GenesisCreated")
        .withArgs("Created by Laxigam Team", await ethers.provider.getBlock("latest").then(b => b.timestamp));
    });

    it("Should set treasury address correctly", async function () {
      expect(await lxgToken.treasury()).to.equal(treasury.address);
    });

    it("Should authorize deployer as minter", async function () {
      expect(await lxgToken.authorizedMinters(owner.address)).to.be.true;
    });
  });

  describe("Token Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      const amount = ethers.parseEther("100");
      await lxgToken.transfer(addr1.address, amount);
      expect(await lxgToken.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      const amount = ethers.parseEther("100");
      await expect(
        lxgToken.connect(addr1).transfer(owner.address, amount)
      ).to.be.revertedWithCustomError(lxgToken, "ERC20InsufficientBalance");
    });
  });

  describe("transferWithBurn", function () {
    it("Should burn gas fees correctly", async function () {
      const transferAmount = ethers.parseEther("100");
      const gasFee = ethers.parseEther("10");
      const burnAmount = gasFee / 2n; // 50%
      const poolAmount = gasFee - burnAmount;

      const initialSupply = await lxgToken.totalSupply();
      const initialPoolBalance = await lxgToken.balanceOf(owner.address);

      await lxgToken.transferWithBurn(addr1.address, transferAmount, gasFee);

      expect(await lxgToken.totalSupply()).to.equal(initialSupply - burnAmount);
      expect(await lxgToken.balanceOf(addr1.address)).to.equal(transferAmount);
    });

    it("Should emit GasFeeBurned event", async function () {
      const transferAmount = ethers.parseEther("100");
      const gasFee = ethers.parseEther("10");
      const burnAmount = gasFee / 2n;

      await expect(lxgToken.transferWithBurn(addr1.address, transferAmount, gasFee))
        .to.emit(lxgToken, "GasFeeBurned")
        .withArgs(owner.address, burnAmount);
    });
  });

  describe("Minting", function () {
    it("Should allow authorized minter to mint", async function () {
      const amount = ethers.parseEther("1000");
      await lxgToken.mintForDeposit(addr1.address, amount, "Test deposit");
      expect(await lxgToken.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should emit TokensMinted event", async function () {
      const amount = ethers.parseEther("1000");
      await expect(lxgToken.mintForDeposit(addr1.address, amount, "Test deposit"))
        .to.emit(lxgToken, "TokensMinted")
        .withArgs(addr1.address, amount, "Test deposit");
    });

    it("Should not allow unauthorized minter to mint", async function () {
      const amount = ethers.parseEther("1000");
      await expect(
        lxgToken.connect(addr1).mintForDeposit(addr2.address, amount, "Test")
      ).to.be.revertedWith("Not authorized minter");
    });
  });

  describe("Burning", function () {
    it("Should allow authorized minter to burn", async function () {
      // First transfer some tokens to addr1
      const amount = ethers.parseEther("1000");
      await lxgToken.transfer(addr1.address, amount);
      
      // Burn half
      const burnAmount = ethers.parseEther("500");
      await lxgToken.burnForWithdrawal(addr1.address, burnAmount, "Test withdrawal");
      
      expect(await lxgToken.balanceOf(addr1.address)).to.equal(amount - burnAmount);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to authorize minter", async function () {
      await lxgToken.authorizeMinter(addr1.address);
      expect(await lxgToken.authorizedMinters(addr1.address)).to.be.true;
    });

    it("Should allow owner to revoke minter", async function () {
      await lxgToken.authorizeMinter(addr1.address);
      await lxgToken.revokeMinter(addr1.address);
      expect(await lxgToken.authorizedMinters(addr1.address)).to.be.false;
    });

    it("Should allow owner to set burn percentage", async function () {
      await lxgToken.setBurnPercentage(30);
      expect(await lxgToken.burnPercentage()).to.equal(30);
    });

    it("Should not allow burn percentage above 100", async function () {
      await expect(
        lxgToken.setBurnPercentage(101)
      ).to.be.revertedWith("Exceeds maximum");
    });

    it("Should allow owner to pause", async function () {
      await lxgToken.pause();
      expect(await lxgToken.paused()).to.be.true;
    });

    it("Should allow owner to unpause", async function () {
      await lxgToken.pause();
      await lxgToken.unpause();
      expect(await lxgToken.paused()).to.be.false;
    });

    it("Should prevent renouncing ownership", async function () {
      await expect(
        lxgToken.renounceOwnership()
      ).to.be.revertedWith("Renouncing ownership is disabled");
    });
  });

  describe("getTokenInfo", function () {
    it("Should return correct token info", async function () {
      const info = await lxgToken.getTokenInfo();
      expect(info.tokenName).to.equal("Laxigam");
      expect(info.tokenSymbol).to.equal("LXG");
      expect(info.initialSupply).to.equal(INITIAL_SUPPLY);
      expect(info.currentSupply).to.equal(INITIAL_SUPPLY);
      expect(info.burnedAmount).to.equal(0);
      expect(info.currentBurnPercentage).to.equal(50);
      expect(info.currentValidatorPool).to.equal(owner.address);
      expect(info.currentTreasury).to.equal(treasury.address);
    });
  });
});
