import { createConfig, http } from 'wagmi'
import { base, polygon } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'
import { createWeb3Modal } from '@web3modal/wagmi/react'
import { QueryClient } from '@tanstack/react-query'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string

export const queryClient = new QueryClient()

const metadata = {
  name: 'Arena Shooter Web3',
  description: '2D arena shooter with wallet rewards',
  url: window.location.origin,
  icons: [],
}

export const wagmiConfig = createConfig({
  chains: [base, polygon],
  connectors: [injected()],
  transports: {
    [base.id]: http(),
    [polygon.id]: http(),
  },
})

if (!projectId) {
  throw new Error('Missing VITE_WALLETCONNECT_PROJECT_ID')
}

createWeb3Modal({
  wagmiConfig,
  projectId,
  chains: [base, polygon],
  metadata,
})
