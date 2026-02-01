import { NextPage } from 'next'
import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/utils/types'
import { isContractDeployed } from '@/services/blockchain'
import TransactionsTable from '@/components/TransactionsTable'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Head from 'next/head'

const TransactionsPage: NextPage = () => {
  const { wallet } = useSelector((states: RootState) => states.globalStates)
  const [isDeployed, setIsDeployed] = useState<boolean>(false)
  const [networkName, setNetworkName] = useState<string>('localhost')
  const [blockExplorerUrl, setBlockExplorerUrl] = useState<string>('https://sepolia.etherscan.io')

  // Detect network on load
  useEffect(() => {
    const detectNetwork = async () => {
      try {
        // Check if window is defined (browser environment)
        if (typeof window !== 'undefined') {
          const ethereum = (window as any).ethereum
          
          if (ethereum) {
            // Get the network ID
            const chainId = await ethereum.request({ method: 'eth_chainId' })
            
            // Set network name and explorer URL based on chain ID
            switch (chainId) {
              case '0x1':
                setNetworkName('Ethereum Mainnet')
                setBlockExplorerUrl('https://etherscan.io')
                break
              case '0x5':
                setNetworkName('Goerli Testnet')
                setBlockExplorerUrl('https://goerli.etherscan.io')
                break
              case '0xaa36a7':
                setNetworkName('Sepolia Testnet')
                setBlockExplorerUrl('https://sepolia.etherscan.io')
                break
              case '0x7a69': // Hardhat local network
                setNetworkName('Local Network')
                setBlockExplorerUrl('#')
                break
              default:
                setNetworkName(`Chain ID: ${parseInt(chainId, 16)}`)
                setBlockExplorerUrl('https://etherscan.io')
            }
          }
        }
        
        // Check if contract is deployed
        const deployed = await isContractDeployed()
        setIsDeployed(deployed)
      } catch (error) {
        console.error('Error detecting network:', error)
      }
    }
    
    detectNetwork()
  }, [wallet])

  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>Transaction History | DappVotes</title>
        <meta name="description" content="View the history of all blockchain transactions on DappVotes" />
      </Head>
      
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
          <p className="mt-2 text-gray-600">
            View all blockchain transactions related to the DappVotes contract
          </p>
          
          <div className="mt-4 flex flex-wrap gap-3">
            <div className={`${networkName.toLowerCase().includes('local') ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-blue-700'} px-3 py-1 rounded-full text-sm font-medium flex items-center`}>
              <span className={`w-2 h-2 ${networkName.toLowerCase().includes('local') ? 'bg-yellow-600' : 'bg-blue-600'} rounded-full mr-2`}></span>
              Network: {networkName}
            </div>
            
            {wallet && (
              <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                Connected: {wallet.slice(0, 6)}...{wallet.slice(-4)}
              </div>
            )}
            
            <div className={`${isDeployed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} px-3 py-1 rounded-full text-sm font-medium flex items-center`}>
              <span className={`w-2 h-2 ${isDeployed ? 'bg-green-600' : 'bg-red-600'} rounded-full mr-2`}></span>
              Contract: {isDeployed ? 'Deployed' : 'Not Deployed'}
            </div>
          </div>
        </div>
        
        {/* Information box for better UX */}
        <div className={`${networkName.toLowerCase().includes('local') ? 'bg-yellow-50 border-yellow-400' : 'bg-blue-50 border-blue-400'} border-l-4 p-4 mb-6 rounded`}>
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className={`h-5 w-5 ${networkName.toLowerCase().includes('local') ? 'text-yellow-400' : 'text-blue-400'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.75.75 0 00.736-.676L10.95 4.237A.75.75 0 0011.698 3h.252a.75.75 0 000-1.5H9.5a.75.75 0 00-.763.686 31.494 31.494 0 00-.013 5.589A.75.75 0 009.5 8h.75a.75.75 0 010 1.5h-.237z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className={`text-sm ${networkName.toLowerCase().includes('local') ? 'text-yellow-700' : 'text-blue-700'}`}>
                {networkName.toLowerCase().includes('local') 
                  ? "You're using a Hardhat local network. Transactions are only preserved during the current session and will be lost when you restart the node. After creating a transaction, click 'Scan Local Blockchain' to find it."
                  : "This page shows all transactions involving the DappVotes smart contract. You can filter by transaction type or search for specific addresses."}
              </p>
            </div>
          </div>
        </div>
        
        {/* Warning if not connected */}
        {!wallet && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  You are not connected to a wallet. Connect your wallet to see transactions related to your account.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Transactions table */}
        <TransactionsTable
          limit={10}
          networkName={networkName}
          blockExplorerUrl={blockExplorerUrl}
        />
      </main>
      
      <Footer />
    </div>
  )
}

export default TransactionsPage
