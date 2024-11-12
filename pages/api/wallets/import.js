import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import bs58 from 'bs58'
import { openDb } from '../../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { privateKeys } = req.body
    const connection = new Connection('https://mainnet.helius-rpc.com/?api-key=b9d88906-ac34-4592-b02d-a8fa09739b4f')
    const db = await openDb()
    
    const results = []
    const errors = []

    // 处理每个私钥
    for (const privateKeyStr of privateKeys) {
      try {
        const trimmedKey = privateKeyStr.trim()
        if (!trimmedKey) continue;

        // 验证并解码私钥
        let keypair;
        try {
          const privateKeyBytes = bs58.decode(trimmedKey)
          keypair = Keypair.fromSecretKey(privateKeyBytes)
        } catch (err) {
          throw new Error('无效的私钥格式')
        }

        const publicKey = keypair.publicKey.toString()

        // 检查钱包是否已存在
        const existing = await db.get('SELECT id FROM wallets WHERE public_key = ?', publicKey)
        if (existing) {
          throw new Error('钱包已存在')
        }

        // 获取余额
        const balance = await connection.getBalance(keypair.publicKey)
        const solBalance = balance / 1000000000 // 转换为 SOL

        // 存入数据库
        const result = await db.run(
          'INSERT INTO wallets (public_key, private_key, sol_balance, wallet_group) VALUES (?, ?, ?, NULL)',
          [publicKey, trimmedKey, solBalance]
        )

        results.push({
          publicKey,
          solBalance,
          id: result.lastID
        })
      } catch (err) {
        errors.push({
          privateKey: privateKeyStr,
          error: err.message
        })
      }
    }

    await db.close()
    res.status(200).json({ 
      results, 
      errors,
      message: `成功导入 ${results.length} 个钱包${errors.length > 0 ? `，${errors.length} 个导入失败` : ''}`
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
} 