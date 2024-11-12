import { openDb } from '../../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { publicKey, balance } = req.body
    const db = await openDb()

    await db.run(
      'UPDATE wallets SET sol_balance = ? WHERE public_key = ?',
      [balance, publicKey]
    )

    await db.close()
    res.status(200).json({ message: 'Balance updated successfully' })
  } catch (error) {
    console.error('更新余额失败:', error)
    res.status(500).json({ message: error.message })
  }
} 