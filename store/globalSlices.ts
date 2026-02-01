import { createSlice } from '@reduxjs/toolkit'
import { globalActions as GlobalActions } from './actions/globalActions'
import { globalStates as GlobalStates } from './states/globalState'
import { ContestantStruct, PollStruct, TransactionData } from '@/utils/types'

interface GlobalState {
  createModal: string
  updateModal: string
  deleteModal: string
  contestModal: string
  contestants: ContestantStruct[]
  polls: PollStruct[]
  poll: PollStruct | null
  wallet: string | null
  balance: string
  transactions: TransactionData[]
  transactionsCount: number
  currentUser: any
  isVoting: boolean
}

const initialState: GlobalState = {
  createModal: 'scale-0',
  updateModal: 'scale-0',
  deleteModal: 'scale-0',
  contestModal: 'scale-0',
  contestants: [],
  polls: [],
  poll: null,
  wallet: null,
  balance: '',
  transactions: [],
  transactionsCount: 0,
  currentUser: null,
  isVoting: false
}

export const globalSlices = createSlice({
  name: 'global',
  initialState,
  reducers: {
    setCreateModal: (state, action) => {
      state.createModal = action.payload
    },
    setUpdateModal: (state, action) => {
      state.updateModal = action.payload
    },
    setDeleteModal: (state, action) => {
      state.deleteModal = action.payload
    },
    setContestModal: (state, action) => {
      state.contestModal = action.payload
    },
    setContestants: (state, action) => {
      state.contestants = action.payload
    },
    setPolls: (state, action) => {
      state.polls = action.payload
    },
    setPoll: (state, action) => {
      state.poll = action.payload
    },
    setWallet: (state, action) => {
      state.wallet = action.payload
    },
    setBalance: (state, action) => {
      state.balance = action.payload
    },
    setTransactions: (state, action) => {
      state.transactions = action.payload
    },
    setTransactionsCount: (state, action) => {
      state.transactionsCount = action.payload
    },
    setCurrentUser: (state, action) => {
      state.currentUser = action.payload
    },
    setVotingState: (state, action) => {
      state.isVoting = action.payload
    }
  },
})

export const globalActions = globalSlices.actions
export default globalSlices.reducer
