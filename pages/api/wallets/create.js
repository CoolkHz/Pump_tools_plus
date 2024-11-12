import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'
import { openDb, initDb } from '../../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { count } = req.body
    
    // 验证数量
    if (!count || count < 1 || count > 200) {
      return res.status(400).json({ message: '无效的钱包数量，请输入1-200之间的数字' })
    }

    // 确保数据库已初始化
    await initDb()
    const db = await openDb()
    const wallets = []

    // 创建指定数量的钱包
    for (let i = 0; i < count; i++) {
      // 生成新的密钥对
      const keypair = Keypair.generate()
      
      // 转换私钥为 base58 格式
      const privateKey = bs58.encode(keypair.secretKey)
      const publicKey = keypair.publicKey.toString()

      // 存入数据库
      await db.run(
        'INSERT INTO wallets (public_key, private_key, sol_balance, wallet_group) VALUES (?, ?, ?, NULL)',
        [publicKey, privateKey, 0]
      )

      wallets.push({ publicKey, privateKey })
    }

    await db.close()

    res.status(200).json({ 
      message: '钱包创建成功',
      count: wallets.length
    })
  } catch (error) {
    console.error('创建钱包失败:', error)
    res.status(500).json({ message: error.message })
  }
} 