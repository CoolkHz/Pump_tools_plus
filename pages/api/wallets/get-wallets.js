import { open } from 'sqlite'
import sqlite3 from 'sqlite3'

export default async function handler(req, res) {
  try {
    const db = await open({
      filename: './wallets.db',
      driver: sqlite3.Database
    })

    // 获取Dev钱包
    const devWallet = await db.get(
      'SELECT private_key FROM wallets WHERE wallet_group = ? LIMIT 1',
      ['Dev']
    )

    // 获取底仓钱包
    const baseWallets = await db.all(
      'SELECT private_key FROM wallets WHERE wallet_group = ? LIMIT 4',
      ['底仓']
    )

    await db.close()

    res.status(200).json({
      devWallet,
      baseWallets
    })
  } catch (error) {
    console.error('获取钱包失败:', error)
    res.status(500).json({ message: error.message })
  }
} 