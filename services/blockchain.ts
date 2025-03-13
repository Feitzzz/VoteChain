import { store } from '@/store'
import { ethers } from 'ethers'
import { globalActions } from '@/store/globalSlices'
import address from '@/artifacts/contractAddress.json'
import abi from '@/artifacts/contracts/DappVotes.sol/DappVotes.json'
import { ContestantStruct, PollParams, PollStruct, TransactionData, TruncateParams } from '@/utils/types'
import { logOutWithCometChat } from './chat'
import { toast } from 'react-toastify'

// Cache control and throttling
const CACHE_KEY = 'dappvote_polls_cache'
const CACHE_CONTESTANTS_KEY = 'dappvote_contestants_cache_'
const CACHE_POLL_KEY = 'dappvote_poll_cache_'
const CACHE_DURATION = 30 * 1000 // 30 seconds cache duration
const requestTimestamps: Record<string, number> = {}

// Transaction history caching
const CACHE_TRANSACTIONS_KEY = 'dappvote_transactions_cache'

// Throttle function to prevent excessive calls
const throttleRequest = (key: string, minInterval: number = 2000): boolean => {
  const now = Date.now()
  const lastRequest = requestTimestamps[key] || 0
  
  if (now - lastRequest < minInterval) {
    console.debug(`Throttled request for ${key}, last request was ${now - lastRequest}ms ago`)
    return false
  }
  
  requestTimestamps[key] = now
  return true
}

// Check if cached data is still valid
const isCacheValid = (cacheKey: string): boolean => {
  if (typeof window === 'undefined') return false
  
  const cacheTimestampKey = `${cacheKey}_timestamp`
  const timestampStr = localStorage.getItem(cacheTimestampKey)
  
  if (!timestampStr) return false
  
  const timestamp = parseInt(timestampStr, 10)
  const now = Date.now()
  
  return now - timestamp < CACHE_DURATION
}

// Save data to cache with timestamp
const saveToCache = (cacheKey: string, data: any): void => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(cacheKey, JSON.stringify(data))
    localStorage.setItem(`${cacheKey}_timestamp`, Date.now().toString())
  } catch (error) {
    console.error('Error saving to cache:', error)
  }
}

// Get data from cache
const getFromCache = <T>(cacheKey: string): T | null => {
  if (typeof window === 'undefined') return null
  
  try {
    if (!isCacheValid(cacheKey)) return null
    
    const dataStr = localStorage.getItem(cacheKey)
    if (!dataStr) return null
    
    return JSON.parse(dataStr) as T
  } catch (e) {
    console.error('Error getting from cache:', e)
    return null
  }
}

// Define error types for better classification
const ErrorTypes = {
  CRITICAL: 'CRITICAL',      // Errors that affect core functionality
  TRANSACTION: 'TRANSACTION', // Transaction-related errors
  CONNECTION: 'CONNECTION',   // Network/connection errors
  VIEW_FUNCTION: 'VIEW_FUNCTION', // Read-only function call errors
  UNKNOWN: 'UNKNOWN'          // Unclassified errors
}

// Define reportError function
const reportError = (error: any, type = ErrorTypes.UNKNOWN) => {
  // Get meaningful error message
  let errorMessage = 'Something went wrong. Please try again.'
  let errorType = type
  
  // Determine error type and message based on error content
  if (typeof error === 'string') {
    errorMessage = error
  } else if (error?.message) {
    errorMessage = error.message
    
    // Auto-classify common errors
    if (errorMessage.includes('selector was not recognized')) {
      errorType = ErrorTypes.VIEW_FUNCTION
    } else if (errorMessage.includes('user rejected transaction')) {
      errorType = ErrorTypes.TRANSACTION
    } else if (errorMessage.includes('network') || errorMessage.includes('connect')) {
      errorType = ErrorTypes.CONNECTION
    }
  } else if (error?.reason) {
    errorMessage = error.reason
  }

  // Log to console with appropriate level based on error type
  if (errorType === ErrorTypes.CRITICAL) {
    console.error('🚨 CRITICAL ERROR:', errorMessage, error)
  } else if (errorType === ErrorTypes.TRANSACTION) {
    console.warn('⚠️ TRANSACTION ERROR:', errorMessage)
  } else if (errorType === ErrorTypes.CONNECTION) {
    console.error('🔌 CONNECTION ERROR:', errorMessage, error)
  } else if (errorType === ErrorTypes.VIEW_FUNCTION) {
    // Only log VIEW_FUNCTION errors in development environment
    if (process.env.NODE_ENV === 'development') {
      console.debug('ℹ️ VIEW FUNCTION ERROR:', errorMessage)
    }
  } else {
    console.error('❓ UNKNOWN ERROR:', errorMessage, error)
  }

  // Show toast notification in browser environment for important errors
  if (typeof window !== 'undefined' && errorType !== ErrorTypes.VIEW_FUNCTION) {
    toast.error(errorMessage)
  }
  
  return errorMessage
}

const { setWallet, setPolls, setPoll, setContestants, setCurrentUser } = globalActions
const ContractAddress = address.address
const ContractAbi = abi.abi
let ethereum: any
let tx: any

if (typeof window !== 'undefined') {
  ethereum = (window as any).ethereum
}

// Get Ethereum provider based on environment
const getEthereumProvider = async () => {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined'
  
  // Handle server-side rendering case
  if (!isBrowser) {
    return new ethers.providers.JsonRpcProvider(process.env.NEXT_APP_RPC_URL || 'http://localhost:8545')
  }
  
  try {
    const accounts = await ethereum?.request?.({ method: 'eth_accounts' })
    const provider = accounts?.[0]
      ? new ethers.providers.Web3Provider(ethereum)
      : new ethers.providers.JsonRpcProvider(process.env.NEXT_APP_RPC_URL || 'http://localhost:8545')
    
    return provider
  } catch (error) {
    reportError(error, ErrorTypes.CONNECTION)
    return null
  }
}

const getEthereumContract = async () => {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined'
  
  // Handle server-side rendering case
  if (!isBrowser) {
    // For server-side, just use JSON RPC provider without checking contract code
    const provider = new ethers.providers.JsonRpcProvider(process.env.NEXT_APP_RPC_URL || 'http://localhost:8545')
    const contract = new ethers.Contract(ContractAddress, ContractAbi, provider)
    return contract
  }
  
  try {
    const accounts = await ethereum?.request?.({ method: 'eth_accounts' })
    const provider = accounts?.[0]
      ? new ethers.providers.Web3Provider(ethereum)
      : new ethers.providers.JsonRpcProvider(process.env.NEXT_APP_RPC_URL || 'http://localhost:8545')
    const wallet = accounts?.[0] ? null : ethers.Wallet.createRandom()
    const signer = provider.getSigner(accounts?.[0] ? undefined : wallet?.address)

    const contract = new ethers.Contract(ContractAddress, ContractAbi, signer)
    
    // Check if the contract exists at the address
    try {
      // A simple way to check if contract exists is to call a view function
      // This will throw if the contract doesn't exist
      const code = await provider.getCode(ContractAddress)
      if (code === '0x') {
        console.error('Contract not deployed at the specified address. Please deploy the contract first.')
        reportError('Smart contract not deployed. Please deploy the contract or check your connection.', ErrorTypes.CONNECTION)
        throw new Error('Contract not deployed')
      }
    } catch (error) {
      console.error('Error verifying contract:', error)
      reportError('Smart contract not accessible. Please check your setup or restart the application.', ErrorTypes.CONNECTION)
      throw error
    }
    
    return contract
  } catch (error) {
    // This is a critical error - should be properly handled
    reportError(error, ErrorTypes.CRITICAL)
    throw error
  }
}

// Checks if a contract is deployed at the specified address
const isContractDeployed = async () => {
  try {
    // If we're on the server, assume the contract is deployed
    if (typeof window === 'undefined') {
      return true
    }
    
    if (!ethereum) return false
    
    const provider = new ethers.providers.Web3Provider(ethereum)
    const code = await provider.getCode(ContractAddress)
    return code !== '0x'
  } catch (error) {
    console.error('Error checking contract deployment:', error)
    return false
  }
}

const connectWallet = async () => {
  try {
    if (!ethereum) return reportError('Please install Metamask')
    const accounts = await ethereum.request?.({ method: 'eth_requestAccounts' })
    store.dispatch(setWallet(accounts?.[0]))
  } catch (error) {
    reportError(error)
  }
}

const checkWallet = async () => {
  try {
    if (!ethereum) return reportError('Please install Metamask')
    const accounts = await ethereum.request?.({ method: 'eth_accounts' })

    ethereum.on('chainChanged', () => {
      window.location.reload()
    })

    ethereum.on('accountsChanged', async () => {
      store.dispatch(setWallet(accounts?.[0]))
      await checkWallet()
      await logOutWithCometChat()
      store.dispatch(setCurrentUser(null))
    })

    if (accounts?.length) {
      store.dispatch(setWallet(accounts[0]))
    } else {
      store.dispatch(setWallet(''))
      reportError('Please connect wallet, no accounts found.')
    }
  } catch (error) {
    reportError(error)
  }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const createPoll = async (data: PollParams) => {
  if (!ethereum) {
    reportError('Please install Metamask')
    return Promise.reject(new Error('Metamask not installed'))
  }

  try {
    const contract = await getEthereumContract()
    const { image, title, description, startsAt, endsAt } = data
    const tx = await contract.createPoll(image, title, description, startsAt, endsAt)

    await tx.wait()
    await delay(2000)
    const polls = await getPolls()
    store.dispatch(setPolls(polls))
    
    // Cache the new poll
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEY, JSON.stringify(polls))
    }
    
    return Promise.resolve(tx)
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

const updatePoll = async (id: number, data: PollParams) => {
  if (!ethereum) {
    reportError('Please install Metamask')
    return Promise.reject(new Error('Metamask not installed'))
  }

  try {
    const contract = await getEthereumContract()
    const { image, title, description, startsAt, endsAt } = data
    const tx = await contract.updatePoll(id, image, title, description, startsAt, endsAt)

    await tx.wait()
    await delay(2000)
    
    // Update both the specific poll and the polls list
    const [poll, polls] = await Promise.all([
      retryOperation(async () => {
        const poll = await contract.getPoll(id)
        return structurePolls([poll])[0]
      }),
      retryOperation(async () => {
        const allPolls = await contract.getPolls()
        return structurePolls(allPolls)
      })
    ])
    
    store.dispatch(setPoll(poll))
    store.dispatch(setPolls(polls))
    
    // Update cache
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEY, JSON.stringify(polls))
    }
    
    return Promise.resolve(tx)
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

const deletePoll = async (id: number) => {
  if (!ethereum) {
    reportError('Please install Metamask')
    return Promise.reject(new Error('Metamask not installed'))
  }

  try {
    const contract = await getEthereumContract()
    const tx = await contract.deletePoll(id)
    await tx.wait()
    await delay(2000)
    
    // Update the polls list in Redux after deletion
    const polls = await retryOperation(async () => {
      const allPolls = await contract.getPolls()
      return structurePolls(allPolls)
    })
    store.dispatch(setPolls(polls))
    
    return Promise.resolve(tx)
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

const contestPoll = async (id: number, name: string, image: string) => {
  if (!ethereum) {
    reportError('Please install Metamask')
    return Promise.reject(new Error('Metamask not installed'))
  }

  try {
    const contract = await getEthereumContract()
    const tx = await contract.contest(id, name, image)
    await tx.wait()
    await delay(2000)
    const contestants = await getContestants(id)
    store.dispatch(setContestants(contestants))
    return Promise.resolve(tx)
  } catch (error) {
    reportError(error)
    return Promise.reject(error)
  }
}

const voteCandidate = async (id: number, cid: number) => {
  if (!ethereum) {
    reportError('Please install Metamask', ErrorTypes.CONNECTION)
    return Promise.reject(new Error('Metamask not installed'))
  }

  try {
    const contract = await getEthereumContract()
    
    // Use safeContractCall for the transaction with proper typing
    const tx = await safeContractCall(
      () => contract.vote(id, cid),
      `Failed to vote for contestant #${cid} in poll #${id}`
    ) as ethers.ContractTransaction
    
    // Wait for transaction confirmation
    await tx.wait()
    
    // Add a delay to allow blockchain state to update
    await delay(2000)
    
    // Refresh poll and contestants data
    try {
      const updatedPoll = await getPoll(id)
      store.dispatch(setPoll(updatedPoll))
      
      const contestants = await getContestants(id)
      store.dispatch(setContestants(contestants))
    } catch (refreshError) {
      // Log refresh errors but don't fail the operation
      console.warn('Error refreshing data after vote:', refreshError)
    }
    
    return Promise.resolve(tx)
  } catch (error: any) {
    // Handle different error types
    if (error?.message?.includes('user rejected')) {
      reportError('Transaction was rejected', ErrorTypes.TRANSACTION)
    } else if (error?.message?.includes('Already voted')) {
      reportError('You have already voted in this poll', ErrorTypes.TRANSACTION)
    } else {
      reportError(error, ErrorTypes.CRITICAL)
    }
    
    return Promise.reject(error)
  }
}

const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await delay(delayMs);
      }
    }
  }
  
  throw lastError;
};

const getPolls = async (): Promise<PollStruct[]> => {
  // Check for throttling - if throttled, return cached data
  if (!throttleRequest('getPolls') && typeof window !== 'undefined') {
    // Try to get from cache first
    const cachedPolls = getFromCache<PollStruct[]>(CACHE_KEY)
    if (cachedPolls) {
      console.debug('Returning cached polls due to throttling')
      store.dispatch(setPolls(cachedPolls))
      return cachedPolls
    }
  }

  return retryOperation(async () => {
    try {
      // Check if we're in a browser environment
      const isBrowser = typeof window !== 'undefined'
      
      // Check if contract is deployed first (only in browser)
      if (isBrowser) {
        try {
          const isDeployed = await isContractDeployed()
          if (!isDeployed) {
            console.warn('Contract not deployed. Returning empty polls array.')
            // Only report error in browser environment
            reportError('Smart contract not deployed. Please deploy the contract or check your connection.', ErrorTypes.CONNECTION)
            return []
          }
        } catch (deploymentError) {
          // If there's an error checking deployment, handle it but continue
          console.debug('Error checking contract deployment:', deploymentError)
        }
      }

      try {
        const contract = await getEthereumContract()
        const polls = await contract.getPolls()
        const structuredPolls = structurePolls(polls)
        
        // Cache the polls data (only in browser)
        if (isBrowser) {
          saveToCache(CACHE_KEY, structuredPolls)
        }

        store.dispatch(setPolls(structuredPolls))
        return structuredPolls
      } catch (contractError: any) {
        // Handle selector errors specifically
        if (contractError?.message?.includes('selector was not recognized')) {
          reportError(contractError, ErrorTypes.VIEW_FUNCTION)
        } else {
          reportError(contractError, ErrorTypes.CRITICAL)
        }
        
        throw contractError
      }
    } catch (error) {
      console.error('Error fetching polls:', error)
      
      // Only try to use localStorage and reportError in browser environment
      if (typeof window !== 'undefined') {
        // Don't show error toast for selector errors
        if (!(error as any)?.message?.includes('selector was not recognized')) {
          reportError('Failed to load polls. Please check your connection or contract deployment.', ErrorTypes.CONNECTION)
        }
        
        // Try to return cached polls if available
        const cachedPolls = getFromCache<PollStruct[]>(CACHE_KEY)
        if (cachedPolls) {
          store.dispatch(setPolls(cachedPolls))
          return cachedPolls
        }
      }
      
      // If all else fails, return empty array
      store.dispatch(setPolls([]))
      return []
    }
  });
}

const getPoll = async (id: number): Promise<PollStruct> => {
  const cacheKey = `${CACHE_POLL_KEY}${id}`
  
  // Check for throttling - if throttled, return cached data
  if (!throttleRequest(`getPoll_${id}`) && typeof window !== 'undefined') {
    // Try to get from cache first
    const cachedPoll = getFromCache<PollStruct>(cacheKey)
    if (cachedPoll) {
      console.debug(`Returning cached poll #${id} due to throttling`)
      if (typeof window !== 'undefined') {
        store.dispatch(setPoll(cachedPoll))
      }
      return cachedPoll
    }
  }

  try {
    const contract = await getEthereumContract()
    
    // Use the safeContractCall helper for better error handling
    const poll = await safeContractCall(
      () => contract.getPoll(id),
      `Failed to fetch poll #${id}`
    )
    
    const structuredPoll = structurePolls([poll])[0]
    
    // Cache the poll data
    if (typeof window !== 'undefined') {
      saveToCache(cacheKey, structuredPoll)
      store.dispatch(setPoll(structuredPoll))
    }
    
    return structuredPoll
  } catch (error) {
    // For selector errors, try to return cached data or a minimal poll object
    if ((error as any)?.message?.includes('selector was not recognized')) {
      console.debug(`Selector error in getPoll for ID ${id}`)
      
      // Try to get from cache first
      if (typeof window !== 'undefined') {
        const cachedPoll = getFromCache<PollStruct>(cacheKey)
        if (cachedPoll) {
          console.debug(`Returning cached poll #${id} after selector error`)
          store.dispatch(setPoll(cachedPoll))
          return cachedPoll
        }
      }
      
      // If no cache, return minimal poll object
      console.debug(`No cache for poll #${id}, returning minimal poll object`)
      const minimalPoll: PollStruct = {
        id,
        title: 'Unable to load poll',
        description: 'Poll data could not be loaded due to a contract error',
        image: '',
        votes: 0,
        contestants: 0,
        deleted: false,
        director: '',
        startsAt: 0,
        endsAt: 0,
        timestamp: 0,
        voters: [],
        avatars: []
      }
      
      return minimalPoll
    }
    
    console.error(`Error fetching poll #${id}:`, error)
    throw error
  }
}

const getContestants = async (pollId: number): Promise<ContestantStruct[]> => {
  const cacheKey = `${CACHE_CONTESTANTS_KEY}${pollId}`
  
  // Check for throttling - if throttled, return cached data
  if (!throttleRequest(`getContestants_${pollId}`) && typeof window !== 'undefined') {
    // Try to get from cache first
    const cachedContestants = getFromCache<ContestantStruct[]>(cacheKey)
    if (cachedContestants) {
      console.debug(`Returning cached contestants for poll #${pollId} due to throttling`)
      return cachedContestants
    }
  }

  try {
    const contract = await getEthereumContract()
    
    // Use the safeContractCall helper for better error handling
    const contestants = await safeContractCall(
      () => contract.getContestants(pollId),
      `Failed to fetch contestants for poll #${pollId}`
    )
    
    const structuredContestants = structureContestants(contestants as any[])
    
    // Cache the contestants data
    if (typeof window !== 'undefined') {
      saveToCache(cacheKey, structuredContestants)
    }
    
    return structuredContestants
  } catch (error) {
    // For selector errors, return empty array instead of throwing
    if ((error as any)?.message?.includes('selector was not recognized')) {
      console.debug('Selector error in getContestants, returning empty array')
      return []
    }
    
    console.error(`Error fetching contestants for poll #${pollId}:`, error)
    
    // Try to return cached data if available
    if (typeof window !== 'undefined') {
      const cachedContestants = getFromCache<ContestantStruct[]>(cacheKey)
      if (cachedContestants) {
        console.debug(`Returning cached contestants for poll #${pollId} after error`)
        return cachedContestants
      }
    }
    
    throw error
  }
}

const truncate = ({ text, startChars, endChars, maxLength }: TruncateParams): string => {
  if (text.length > maxLength) {
    let start = text.substring(0, startChars)
    let end = text.substring(text.length - endChars, text.length)
    while (start.length + end.length < maxLength) {
      start = start + '.'
    }
    return start + end
  }
  return text
}

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]

  const dayOfWeek = daysOfWeek[date.getUTCDay()]
  const month = months[date.getUTCMonth()]
  const day = date.getUTCDate()
  const year = date.getUTCFullYear()

  return `${dayOfWeek}, ${month} ${day}, ${year}`
}

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const structurePolls = (polls: any[]): PollStruct[] =>
  polls
    .map((poll) => ({
      id: Number(poll.id),
      image: poll.image,
      title: poll.title,
      description: poll.description,
      votes: Number(poll.votes),
      contestants: Number(poll.contestants),
      deleted: poll.deleted,
      director: poll.director.toLowerCase(),
      startsAt: Number(poll.startsAt),
      endsAt: Number(poll.endsAt),
      timestamp: Number(poll.timestamp),
      voters: poll.voters.map((voter: string) => voter.toLowerCase()),
      avatars: poll.avatars,
    }))
    .sort((a, b) => b.timestamp - a.timestamp)

const structureContestants = (contestants: any[]): ContestantStruct[] =>
  contestants
    .map((contestant) => ({
      id: Number(contestant.id),
      image: contestant.image,
      name: contestant.name,
      voter: contestant.voter.toLowerCase(),
      votes: Number(contestant.votes),
      voters: contestant.voters.map((voter: string) => voter.toLowerCase()),
    }))
    .sort((a, b) => b.votes - a.votes)

// Helper function to handle contract function calls with better error handling
const safeContractCall = async <T>(
  contractFn: () => Promise<T>,
  errorMessage: string = 'Contract operation failed'
): Promise<T> => {
  try {
    return await contractFn();
  } catch (error: any) {
    // Check if this is a selector error
    if (error?.message?.includes('selector was not recognized')) {
      reportError(error, ErrorTypes.VIEW_FUNCTION);
    } else if (error?.message?.includes('user rejected')) {
      reportError(error, ErrorTypes.TRANSACTION);
    } else {
      reportError(`${errorMessage}: ${error?.message || error}`, ErrorTypes.CRITICAL);
    }
    throw error;
  }
};

// Function to determine transaction type from input data
const getTransactionType = (inputData: string, contractInterface: ethers.utils.Interface): string => {
  try {
    // Remove '0x' prefix if present
    const data = inputData.startsWith('0x') ? inputData.slice(2) : inputData
    // Get function signature (first 4 bytes/8 hex characters)
    const functionSignature = '0x' + data.slice(0, 8)
    
    // Try to decode the function signature
    try {
      const functionFragment = contractInterface.getFunction(functionSignature)
      
      if (functionFragment) {
        // Map contract function names to readable transaction types
        switch (functionFragment.name) {
          case 'createPoll':
            return 'Poll Created'
          case 'updatePoll':
            return 'Poll Updated'
          case 'deletePoll':
            return 'Poll Deleted'
          case 'contestPoll':
            return 'Contestant Added'
          case 'vote':
            return 'Vote Cast'
          default:
            return functionFragment.name // Use function name if no mapping
        }
      }
    } catch (error) {
      // If function signature cannot be decoded, return unknown
      return 'Unknown Transaction'
    }
    
    return 'Unknown Transaction'
  } catch (error) {
    console.error('Error determining transaction type:', error)
    return 'Unknown Transaction'
  }
}

// Get transaction history for Hardhat local network
const getTransactionHistory = async (
  limit = 50, 
  offset = 0
): Promise<TransactionData[]> => {
  try {
    console.log('Getting transaction history for Hardhat local network')
    
    // Get provider and contract
    const provider = await getEthereumProvider()
    if (!provider) {
      console.error('Provider not initialized')
      return []
    }
    
    const contractAddress = address.address
    const contractInterface = new ethers.utils.Interface(abi.abi)
    
    // Get latest block number
    const latestBlock = await provider.getBlockNumber()
    console.log('Latest block number:', latestBlock)
    
    // In Hardhat, we need to scan all blocks since we don't have a large history
    // Start from block 1 instead of 0 (genesis block)
    const fromBlock = 1
    const toBlock = latestBlock
    
    console.log(`Scanning all blocks from ${fromBlock} to ${toBlock}`)
    
    const transactions: TransactionData[] = []
    const processedHashes = new Set<string>()
    
    // We need a different approach for Hardhat:
    // 1. Get all blocks
    // 2. Check each transaction in each block
    // 3. Filter for transactions to our contract
    
    for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber++) {
      try {
        // Get block with transaction hashes (not full objects)
        const block = await provider.getBlock(blockNumber)
        
        if (!block || !block.transactions || block.transactions.length === 0) {
          continue // Skip empty blocks silently
        }
        
        // Process each transaction hash in the block
        for (const txHash of block.transactions) {
          // Skip if already processed
          if (processedHashes.has(txHash)) continue
          processedHashes.add(txHash)
          
          try {
            // Get the full transaction
            const tx = await provider.getTransaction(txHash)
            
            // Only process transactions to our contract
            if (tx && tx.to && tx.to.toLowerCase() === contractAddress.toLowerCase()) {
              // Get receipt for more details
              const receipt = await provider.getTransactionReceipt(txHash)
              
              if (receipt) {
                const transactionType = getTransactionType(tx.data, contractInterface)
                console.log(`Found transaction: ${tx.hash} Type: ${transactionType}`)
                
                transactions.push({
                  hash: tx.hash,
                  blockNumber: tx.blockNumber || 0,
                  timestamp: block.timestamp,
                  from: tx.from,
                  to: tx.to || '',
                  transactionType,
                  status: receipt.status === 1, // 1 = success, 0 = failure
                  gasUsed: receipt.gasUsed.toString(),
                  gasPrice: tx.gasPrice?.toString() || '0',
                  value: ethers.utils.formatEther(tx.value)
                })
              }
            }
          } catch (txError) {
            console.warn(`Error processing transaction ${txHash}:`, txError)
          }
        }
      } catch (blockError) {
        console.warn(`Error getting block ${blockNumber}:`, blockError)
      }
    }
    
    console.log(`Found ${transactions.length} total transactions`)
    
    // Sort by block number (descending) since Hardhat timestamps may not be reliable
    transactions.sort((a, b) => b.blockNumber - a.blockNumber)
    
    // Apply pagination
    const paginatedTransactions = transactions.slice(offset, offset + limit)
    
    return paginatedTransactions
  } catch (error) {
    console.error('Error fetching transaction history:', error)
    return []
  }
}

export {
  connectWallet,
  checkWallet,
  truncate,
  formatDate,
  formatTimestamp,
  createPoll,
  updatePoll,
  deletePoll,
  getPolls,
  getPoll,
  contestPoll,
  getContestants,
  voteCandidate,
  isContractDeployed,
  ErrorTypes,
  getTransactionHistory,
  getEthereumProvider
}
