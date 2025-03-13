const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Seeding with account:", deployer.address);

  // Get the contract
  const DappVotes = await ethers.getContractFactory("DappVotes");
  const contract = await DappVotes.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");

  // Example seed data
  const samplePolls = [
    {
      image: "https://example.com/sample1.jpg",
      title: "Sample Election 2024",
      description: "This is a sample election for testing purposes",
      startsAt: Math.floor(Date.now() / 1000), // current time
      endsAt: Math.floor(Date.now() / 1000) + 86400 * 7 // 7 days from now
    },
    {
      image: "https://example.com/sample2.jpg",
      title: "Community Vote",
      description: "Vote for the next community project",
      startsAt: Math.floor(Date.now() / 1000),
      endsAt: Math.floor(Date.now() / 1000) + 86400 * 3 // 3 days from now
    }
  ];

  console.log("Starting to seed polls...");

  for (const poll of samplePolls) {
    try {
      const tx = await contract.createPoll(
        poll.image,
        poll.title,
        poll.description,
        poll.startsAt,
        poll.endsAt
      );
      await tx.wait();
      console.log(`Created poll: ${poll.title}`);
    } catch (error) {
      console.error(`Failed to create poll ${poll.title}:`, error.message);
    }
  }

  console.log("Seeding completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 