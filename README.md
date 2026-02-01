# VoteChain - Decentralized Voting Dapp

A decentralized voting application built with Next.js, TypeScript, Tailwind CSS, and CometChat. This dApp allows users to create polls, add contestants, vote securely on the blockchain, and chat about polls in real-time.

Read the original tutorial here: [**>> Build a Decentralized Voting Dapp with Next.js, TypeScript, Tailwind CSS, and CometChat **](https://daltonic.github.io)

This example shows Build a Decentralized Voting Dapp with Next.js, TypeScript, Tailwind CSS, and CometChat:

![Poll Lisiting](./screenshots/0.png)

<center><figcaption>Poll Listing</figcaption></center>

![Poll Listing](./screenshots/1.png)

<center><figcaption>Poll Details with Candidates</figcaption></center>

![Poll Group Chat](./screenshots/2.gif)

<center><figcaption>Poll Group Chat</figcaption></center>

## Technology

This demo uses:

- Metamask
- Hardhat
- Infuria
- ReactJs
- Tailwind CSS
- Solidity
- EthersJs
- Faucet

## Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Git** - [Download](https://git-scm.com/)
- **MongoDB** - [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier available)
- **MetaMask** browser extension - [Download](https://metamask.io/)
- **CometChat Account** - [Sign up](https://try.cometchat.com/oj0s7hrm5v78) (free tier available)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/Feitzzz/VoteChain.git
cd VoteChain
```

### 2. Install Dependencies

Using npm:
```bash
npm install
```

Or using yarn:
```bash
yarn install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
touch .env
```

Add the following environment variables to your `.env` file:

```env
# MongoDB Connection String
# For local MongoDB: mongodb://localhost:27017/dappvote
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/dappvote
MONGODB_URI=your_mongodb_connection_string

# JWT Secret (generate a random string for production)
# You can generate one using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_jwt_secret_key

# CometChat Configuration
# Get these from https://app.cometchat.com/ after creating a project
NEXT_PUBLIC_COMET_CHAT_APP_ID=your_cometchat_app_id
NEXT_PUBLIC_COMET_CHAT_AUTH_KEY=your_cometchat_auth_key
NEXT_PUBLIC_COMET_CHAT_REGION=your_cometchat_region

# Blockchain RPC URL
# For local Hardhat node: http://127.0.0.1:8545
# For testnet/mainnet: Use Infura, Alchemy, or other RPC provider
NEXT_APP_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
```

#### Getting Your Environment Variables:

**MongoDB URI:**
- **Local MongoDB**: `mongodb://localhost:27017/dappvote`
- **MongoDB Atlas**: Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas), then copy the connection string

**JWT Secret:**
- Generate a secure random string:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

**CometChat Credentials:**
1. Sign up at [CometChat](https://try.cometchat.com/oj0s7hrm5v78)
2. Create a new app
3. Copy the App ID, Auth Key, and Region from your dashboard

### 4. Compile Smart Contracts

```bash
npx hardhat compile
```

## Running the Application

### Option 1: Using the Start Script (Recommended)

The project includes a convenient script that starts everything:

```bash
chmod +x start-local.sh
./start-local.sh
```

This script will:
- Clean and compile contracts
- Start Hardhat local blockchain node
- Deploy the smart contract
- Seed initial data
- Start the Next.js development server

### Option 2: Manual Setup (Step by Step)

**Terminal 1 - Start Hardhat Local Blockchain:**
```bash
npx hardhat node
```

This will start a local Ethereum node on `http://127.0.0.1:8545` with 20 test accounts pre-funded with ETH.

**Terminal 2 - Deploy Smart Contract:**
```bash
npx hardhat run scripts/deploy.js --network localhost
```

This deploys the voting contract to your local blockchain. The contract address will be saved to `artifacts/contractAddress.json` and `public/contractAddress.json`.

**Terminal 3 - Seed Initial Data (Optional):**
```bash
npx hardhat run scripts/seed.js --network localhost
```

This creates some sample polls and contestants for testing.

**Terminal 4 - Start the Frontend:**
```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`

### 5. Connect MetaMask to Local Network

1. Open MetaMask in your browser
2. Click the network dropdown and select "Add Network"
3. Add a new network with these settings:
   - **Network Name**: Hardhat Local
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`
4. Import one of the Hardhat test accounts:
   - Copy a private key from the Hardhat node terminal output
   - In MetaMask: Settings → Import Account → Paste the private key

## Testing

### Running Smart Contract Tests

The project includes comprehensive tests for the smart contracts:

```bash
# Run all tests
npx hardhat test

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test

# Run tests with coverage
npx hardhat coverage
```

The test suite covers:
- Poll creation and management
- Contestant management
- Voting functionality
- Access control and security

### Testing the Frontend

1. **Register a New User:**
   - Navigate to the registration page
   - Fill in your details (name, email, national ID, password)
   - Verify your email with the OTP (check console/logs for OTP in development)

2. **Create a Poll:**
   - Log in to your account
   - Click "Create Poll"
   - Fill in poll details (title, description, start/end dates)
   - Add contestants
   - Submit the poll

3. **Vote on a Poll:**
   - Browse available polls
   - Click on a poll to view details
   - Select a contestant and vote
   - Confirm the transaction in MetaMask

4. **Test Chat Functionality:**
   - Open a poll detail page
   - Click the chat button
   - Send messages in the poll's group chat

### Manual Testing Checklist

- [ ] User registration and login
- [ ] Poll creation
- [ ] Contestant addition
- [ ] Voting functionality
- [ ] Poll updates and deletion
- [ ] Transaction history
- [ ] Chat functionality
- [ ] MetaMask wallet connection
- [ ] Responsive design on mobile/tablet

## Troubleshooting

### Common Issues

**Issue: MongoDB connection error**
- Ensure MongoDB is running: `mongod` (local) or check Atlas cluster status
- Verify `MONGODB_URI` in `.env` is correct

**Issue: Contract deployment fails**
- Make sure Hardhat node is running
- Check that you're using `--network localhost` flag
- Verify RPC URL in `.env`

**Issue: MetaMask can't connect**
- Ensure you've added the Hardhat local network
- Check that Chain ID is `31337`
- Try resetting your MetaMask account (Settings → Advanced → Reset Account)

**Issue: CometChat not working**
- Verify all CometChat environment variables are set
- Check browser console for CometChat errors
- Ensure you're using valid CometChat credentials

**Issue: Port already in use**
- Kill the process using port 3000: `lsof -ti:3000 | xargs kill -9`
- Or change the port: `PORT=3001 npm run dev`

## Project Structure

```
VoteChain/
├── contracts/          # Solidity smart contracts
├── components/         # React components
├── pages/             # Next.js pages and API routes
├── services/          # Business logic (blockchain, chat)
├── store/             # Redux state management
├── utils/             # Utility functions
├── styles/            # CSS and styling
├── public/            # Static assets
├── scripts/           # Deployment and seeding scripts
├── test/              # Smart contract tests
└── hardhat.config.js  # Hardhat configuration
```

## Additional Resources


- Questions? [Open an issue](https://github.com/Feitzzz/VoteChain/issues)

## Useful links

- ⚽ [Metamask](https://metamask.io/)
- 🚀 [CometChat](https://try.cometchat.com/oj0s7hrm5v78)
- 💡 [Hardhat](https://hardhat.org/)
- 📈 [Infuria](https://infura.io/)
- 🔥 [NextJs](https://nextjs.org/)
- 🎅 [TypeScript](https://www.typescriptlang.org/)
- 🐻 [Solidity](https://soliditylang.org/)
- 👀 [EthersJs](https://docs.ethers.io/v5/)
-
