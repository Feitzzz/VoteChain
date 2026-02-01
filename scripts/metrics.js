const { ethers } = require("hardhat");

describe("DappVotes Performance Testing", function () {
  let DappVotes;
  let dappVotes;
  let owner;
  let addr1;
  let addr2;
  let addrs;

  // Deploy the contract before running tests
  before(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    DappVotes = await ethers.getContractFactory("DappVotes");
    dappVotes = await DappVotes.deploy();
    await dappVotes.deployed();
  });

  // Test poll creation performance
  it("Should create multiple polls and measure gas usage", async function () {
    const startTime = Date.now();

    const tx1 = await dappVotes.createPoll(
      "image1.jpg",
      "Poll 1",
      "Description 1",
      Math.floor(Date.now() / 1000) + 60, // Starts in 60 seconds
      Math.floor(Date.now() / 1000) + 3600 // Ends in 1 hour
    );
    const receipt1 = await tx1.wait();
    console.log(`Gas used for creating Poll 1: ${receipt1.gasUsed.toString()}`);

    const tx2 = await dappVotes.createPoll(
      "image2.jpg",
      "Poll 2",
      "Description 2",
      Math.floor(Date.now() / 1000) + 60,
      Math.floor(Date.now() / 1000) + 3600
    );
    const receipt2 = await tx2.wait();
    console.log(`Gas used for creating Poll 2: ${receipt2.gasUsed.toString()}`);

    const endTime = Date.now();
    console.log(`Time taken to create 2 polls: ${endTime - startTime} ms`);
  });

  // Test contestant addition performance
  it("Should add contestants to a poll and measure gas usage", async function () {
    const startTime = Date.now();

    const tx1 = await dappVotes.contest(1, "Contestant 1", "contestant1.jpg");
    const receipt1 = await tx1.wait();
    console.log(`Gas used for adding Contestant 1 to Poll 1: ${receipt1.gasUsed.toString()}`);

    const tx2 = await dappVotes.connect(addr1).contest(1, "Contestant 2", "contestant2.jpg");
    const receipt2 = await tx2.wait();
    console.log(`Gas used for adding Contestant 2 to Poll 1: ${receipt2.gasUsed.toString()}`);

    const endTime = Date.now();
    console.log(`Time taken to add 2 contestants: ${endTime - startTime} ms`);
  });

  // Test voting performance with a small number of votes
  it("Should simulate voting and measure gas usage and throughput", async function () {
    // Update poll to be active (started 60 seconds ago, ends in 1 hour)
    await dappVotes.updatePoll(
      1,
      "image1.jpg",
      "Poll 1",
      "Description 1",
      Math.floor(Date.now() / 1000) - 60,
      Math.floor(Date.now() / 1000) + 3600
    );

    const startTime = Date.now();

    const tx1 = await dappVotes.connect(addr2).vote(1, 1);
    const receipt1 = await tx1.wait();
    console.log(`Gas used for vote 1: ${receipt1.gasUsed.toString()}`);

    const tx2 = await dappVotes.connect(addrs[0]).vote(1, 2);
    const receipt2 = await tx2.wait();
    console.log(`Gas used for vote 2: ${receipt2.gasUsed.toString()}`);

    const endTime = Date.now();
    console.log(`Time taken for 2 votes: ${endTime - startTime} ms`);
  });

  // Test scalability with multiple votes
  it("Should measure performance with multiple votes", async function () {
    const startTime = Date.now();
    const votes = [];
    for (let i = 1; i <= 10; i++) {
      const voter = addrs[i];
      const tx = await dappVotes.connect(voter).vote(1, 1);
      votes.push(tx.wait());
    }
    await Promise.all(votes);
    const endTime = Date.now();
    console.log(`Time taken for 10 votes: ${endTime - startTime} ms`);
  });
});