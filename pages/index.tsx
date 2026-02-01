import Banner from '@/components/Banner'
import CreatePoll from '@/components/CreatePoll'
import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import Polls from '@/components/Polls'
import withAuth from '@/components/ProtectedRoute'
import { getPolls } from '@/services/blockchain'
import { globalActions } from '@/store/globalSlices'
import { PollStruct, RootState } from '@/utils/types'
import Head from 'next/head'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

function Home({ pollsData }: { pollsData: PollStruct[] }) {
  const dispatch = useDispatch()
  const { setPolls } = globalActions
  const { polls } = useSelector((states: RootState) => states.globalStates)

  useEffect(() => {
    dispatch(setPolls(pollsData))
  }, [dispatch, setPolls, pollsData])

  return (
    <>
      <Head>
        <title>VoteChain - Decentralized Voting Platform</title>
        <meta name="description" content="A decentralized voting platform for secure and transparent elections" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen">
        <Navbar />
        <main>
          <Banner />
          <Polls polls={polls} />
        </main>
        <Footer />
        <CreatePoll />
      </div>
    </>
  )
}

export const getServerSideProps = async () => {
  try {
    const pollsData: PollStruct[] = await getPolls()
    return {
      props: { pollsData: JSON.parse(JSON.stringify(pollsData)) },
    }
  } catch (error) {
    console.error('Error fetching polls in getServerSideProps:', error)
    // Return empty array if there's an error
    return {
      props: { pollsData: [] },
    }
  }
}

// Wrap the Home component with the authentication HOC
export default withAuth(Home)
