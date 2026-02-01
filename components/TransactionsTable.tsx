import { FC, useState, useEffect } from 'react'
import { TransactionData } from '@/utils/types'
import { getTransactionHistory } from '@/services/blockchain'
import { FaCheckCircle, FaTimesCircle, FaExternalLinkAlt, FaSearch } from 'react-icons/fa'
import { ethers } from 'ethers'

interface TransactionsTableProps {
  limit?: number
  networkName?: string
  blockExplorerUrl?: string
}

const TransactionsTable: FC<TransactionsTableProps> = ({
  limit = 10,
  networkName = 'localhost',
  blockExplorerUrl = 'https://sepolia.etherscan.io'
}) => {
  const [transactions, setTransactions] = useState<TransactionData[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [searchAddress, setSearchAddress] = useState<string>('')
  const isHardhatNetwork = networkName.toLowerCase().includes('local')

  // Function to truncate addresses and hashes
  const truncateAddress = (address: string, startChars = 6, endChars = 4) => {
    if (!address) return ''
    if (address.length <= startChars + endChars) return address
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
  }

  // Load transactions with pagination
  const loadTransactions = async () => {
    setLoading(true);
    setError(null);
    
    // Set scanning flag for better UX
    if (isHardhatNetwork) {
      setIsScanning(true);
    }

    try {
      const offset = (page - 1) * limit;
      
      console.log('Fetching transactions...');
      const txData = await getTransactionHistory(limit, offset);
      console.log('Received transaction data:', txData);
      
      // Ensure txData is an array before setting it
      if (Array.isArray(txData)) {
        // Apply client-side address filtering if search is active
        let filteredData = txData;
        if (searchAddress) {
          const searchTerm = searchAddress.toLowerCase();
          filteredData = txData.filter(tx => 
            tx.from.toLowerCase().includes(searchTerm) || 
            tx.to.toLowerCase().includes(searchTerm)
          );
          console.log(`Filtered ${txData.length} transactions to ${filteredData.length} based on address search`);
        }
        
        setTransactions(filteredData);
        
        // Estimate total pages
        setTotalPages(Math.max(1, Math.ceil(filteredData.length === limit ? (page * limit + limit) : (page * limit)) / limit));
      } else {
        console.error('Expected array of transactions but received:', txData);
        setTransactions([]);
        setError('Received invalid transaction data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
      console.error('Error loading transactions:', err);
      setTransactions([]);
    } finally {
      setLoading(false);
      setIsScanning(false);
    }
  }

  // Handle address search
  const handleSearch = () => {
    setPage(1); // Reset to first page
    loadTransactions();
  }

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setPage(newPage)
  }

  // Format timestamp to relative time
  const formatTimestamp = (timestamp: number) => {
    try {
      const date = new Date(timestamp * 1000);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      
      // Convert to seconds, minutes, hours, days
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);
      
      if (diffSec < 60) {
        return `${diffSec} seconds ago`;
      } else if (diffMin < 60) {
        return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
      } else if (diffHour < 24) {
        return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
      } else if (diffDay < 30) {
        return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
      } else {
        // Format as date for older transactions
        return date.toLocaleDateString();
      }
    } catch (error) {
      return 'Invalid date';
    }
  }

  // External link to block explorer
  const getExplorerLink = (hash: string) => {
    return `${blockExplorerUrl}/tx/${hash}`
  }

  // Format gas price to Gwei
  const formatGasPrice = (gasPrice: string) => {
    try {
      return `${ethers.utils.formatUnits(gasPrice, 'gwei')} Gwei`
    } catch {
      return gasPrice
    }
  }

  // Format gas used with commas
  const formatGasUsed = (gasUsed: string) => {
    try {
      return parseInt(gasUsed).toLocaleString()
    } catch {
      return gasUsed
    }
  }

  // Effect to load transactions when page changes
  useEffect(() => {
    loadTransactions();
  }, [page]); 

  return (
    <div className="w-full px-2 sm:px-0">
      {isHardhatNetwork && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 border border-yellow-300 bg-yellow-50 rounded-md">
          <h3 className="font-medium text-yellow-800 text-sm sm:text-base">Hardhat Local Network Detected</h3>
          <p className="mt-1 text-xs sm:text-sm text-yellow-700">
            You're using a local Hardhat network. Transaction scanning may take longer and only shows transactions from the current session.
          </p>
          {isScanning ? (
            <div className="mt-2 flex items-center text-xs sm:text-sm text-yellow-800">
              <div className="animate-spin mr-2 h-3 w-3 sm:h-4 sm:w-4 border-2 border-yellow-600 rounded-full border-t-transparent"></div>
              Scanning blockchain for transactions... This might take a moment.
            </div>
          ) : (
            <button
              onClick={() => loadTransactions()}
              className="mt-2 px-2 sm:px-3 py-1 bg-yellow-600 text-white text-xs sm:text-sm rounded hover:bg-yellow-700"
            >
              Rescan Blockchain
            </button>
          )}
        </div>
      )}

      {/* Address Search Box */}
      <div className="mb-4 sm:mb-6">
        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Search by Address</label>
        <div className="flex">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
              <FaSearch className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              placeholder="Enter address (0x...)"
              className="block w-full pl-8 sm:pl-10 pr-2 sm:pr-3 py-1.5 sm:py-2 text-sm bg-white border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />
          </div>
          <button
            onClick={handleSearch}
            className="bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm rounded-r-md hover:bg-blue-700 transition duration-200"
          >
            Search
          </button>
        </div>
        {searchAddress && (
          <div className="mt-2 text-sm text-gray-600 flex items-center">
            <span>Searching for: {searchAddress}</span>
            <button 
              onClick={() => {
                setSearchAddress('');
                setTimeout(loadTransactions, 0);
              }}
              className="ml-2 text-blue-600 hover:text-blue-800"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Improved Responsive Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                Hash
              </th>
              <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                From
              </th>
              <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                To
              </th>
              <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                Value
              </th>
              <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                Gas
              </th>
              <th scope="col" className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                Time
              </th>
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-2 sm:px-4 py-4 text-center text-sm text-gray-500">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-600 rounded-full border-t-transparent mr-2"></div>
                    Loading transactions...
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="px-2 sm:px-4 py-4 text-center text-sm text-red-500">
                  {error} 
                </td>
              </tr>
            ) : !transactions || !Array.isArray(transactions) || transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-2 sm:px-4 py-4 text-center text-sm text-gray-500">
                  No transactions found.
                </td>
              </tr>
            ) : (
              Array.isArray(transactions) && transactions.map((tx) => (
                <tr key={tx.hash} className="hover:bg-gray-50">
                  {/* Status */}
                  <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                    {tx.status ? (
                      <span className="flex items-center text-green-600">
                        <FaCheckCircle className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="text-xs sm:text-sm">Success</span>
                      </span>
                    ) : (
                      <span className="flex items-center text-red-600">
                        <FaTimesCircle className="mr-1 sm:mr-1.5 h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="text-xs sm:text-sm">Failed</span>
                      </span>
                    )}
                  </td>
                  
                  {/* Hash */}
                  <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <a
                        href={getExplorerLink(tx.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        {truncateAddress(tx.hash, 6, 4)}
                        <FaExternalLinkAlt className="ml-1 h-2 w-2 sm:h-3 sm:w-3" />
                      </a>
                    </div>
                    <div className="text-xs text-gray-500">
                      <span className="sm:hidden">#{tx.blockNumber}</span>
                      <span className="hidden sm:inline">Block: {tx.blockNumber.toLocaleString()}</span>
                    </div>
                  </td>
                  
                  {/* Transaction Type */}
                  <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {tx.transactionType || 'Transfer'}
                    </span>
                  </td>
                  
                  {/* From */}
                  <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                    <div className="text-sm text-gray-900">{truncateAddress(tx.from)}</div>
                  </td>
                  
                  {/* To */}
                  <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                    {truncateAddress(tx.to)}
                  </td>
                  
                  {/* Value */}
                  <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                    {tx.value || '0 ETH'}
                  </td>
                  
                  {/* Gas */}
                  <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap hidden lg:table-cell">
                    <div className="text-xs sm:text-sm text-gray-900">{formatGasUsed(tx.gasUsed)}</div>
                    <div className="text-xs text-gray-500">{formatGasPrice(tx.gasPrice)}</div>
                  </td>
                  
                  {/* Time */}
                  <td className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                    {formatTimestamp(tx.timestamp)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Responsive Pagination */}
      <div className="flex items-center justify-between mt-4 flex-wrap gap-y-2">
        <div className="text-xs sm:text-sm text-gray-700">
          {transactions.length > 0 && (
            <span>
              Showing page {page} of {totalPages}
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1 || loading}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-md ${
              page === 1 || loading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === totalPages || loading}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-md ${
              page === totalPages || loading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default TransactionsTable;
