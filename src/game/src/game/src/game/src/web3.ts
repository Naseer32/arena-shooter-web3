export const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined

export function hasWalletConnectProjectId() {
  return !!walletConnectProjectId
}

