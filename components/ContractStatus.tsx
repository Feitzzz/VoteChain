import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { useRouter } from 'next/router'
import contractAddress from '@/artifacts/contractAddress.json'
import { ethers } from 'ethers'
import dynamic from 'next/dynamic'

// Make this component only render client-side to avoid server rendering issues
const ContractStatus = () => {
  const [isDeployed, setIsDeployed] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkContractDeployment = async () => {
      try {
        setIsLoading(true)
        
        // Get the provider
        const ethereum = (window as any).ethereum
        if (!ethereum) {
          setIsDeployed(false)
          return
        }
        
        const provider = new ethers.providers.Web3Provider(ethereum)
        const code = await provider.getCode(contractAddress.address)
        const deployed = code !== '0x'
        
        setIsDeployed(deployed)
      } catch (error) {
        console.error('Error checking contract deployment:', error)
        setIsDeployed(false)
      } finally {
        setIsLoading(false)
      }
    }

    // Check on initial load
    checkContractDeployment()
    
    // Set up interval to check every 10 seconds
    const interval = setInterval(checkContractDeployment, 10000)
    
    return () => clearInterval(interval)
  }, [])

  // Don't show anything if we're still loading
  if (isLoading) return null
  
  // Don't show anything if the contract is deployed
  if (isDeployed) return null

  return (
    <div className="fixed top-20 left-0 right-0 mx-auto z-50 p-4 rounded-lg bg-red-100 border-l-4 border-red-500 max-w-lg">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">Contract Not Deployed</h3>
          <div className="mt-2 text-sm text-red-700">
            <p>
              The smart contract is not deployed at address: {contractAddress.address.slice(0, 6)}...{contractAddress.address.slice(-4)}
            </p>
            <p className="mt-2">
              Please make sure your Hardhat node is running and the contract is deployed. Run the following commands in your terminal:
            </p>
            <pre className="mt-2 p-2 bg-gray-800 text-white text-xs rounded overflow-x-auto">
              npx hardhat run scripts/deploy.js --network localhost
            </pre>
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Use dynamic import with ssr: false to ensure this component only runs on the client
export default dynamic(() => Promise.resolve(ContractStatus), { ssr: false }) 