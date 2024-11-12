// 客户端数据库操作
async function fetchWallets() {
  const response = await fetch('/api/wallets')
  const data = await response.json()
  return data
}

// 获取Dev钱包
async function getDevWallet() {
  const response = await fetch('/api/wallets')
  const data = await response.json()
  return data.find(wallet => wallet.wallet_group === 'Dev')
}

// 获取底仓钱包
async function getBaseWallets() {
  const response = await fetch('/api/wallets')
  const data = await response.json()
  return data.filter(wallet => wallet.wallet_group === '底仓')
}

export { fetchWallets, getDevWallet, getBaseWallets } 