#!/bin/bash

# Clean and compile contracts
echo "Cleaning and compiling contracts..."
npx hardhat clean
npx hardhat compile

# Start Hardhat node in the background
echo "Starting Hardhat node..."
npx hardhat node > hardhat.log 2>&1 &
HARDHAT_PID=$!

# Wait for node to start
sleep 5

# Deploy contract
echo "Deploying contract..."
npx hardhat run scripts/deploy.js --network localhost

# Seed initial data
echo "Seeding initial data..."
npx hardhat run scripts/seed.js --network localhost

# Start frontend
echo "Starting frontend..."
npm run dev

# Cleanup function
cleanup() {
    echo "Cleaning up..."
    kill $HARDHAT_PID
    exit 0
}

# Set up cleanup on script exit
trap cleanup EXIT

# Wait for frontend to exit
wait 