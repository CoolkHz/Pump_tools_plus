import { openDb } from '../../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { id, wallet_group } = req.body
    const db = await openDb()

    // 如果是 Dev 组，检查是否已存在
    if (wallet_group === 'Dev') {
      const existingDev = await db.get(
        'SELECT id FROM wallets WHERE wallet_group = ? AND id != ?', 
        ['Dev', id]
      )
      if (existingDev) {
        await db.close()
        return res.status(400).json({ 
          message: 'Dev 组只能有一个钱包' 
        })
      }
    }

    await db.run(
      'UPDATE wallets SET wallet_group = ? WHERE id = ?', 
      [wallet_group, id]
    )
    await db.close()
    res.status(200).json({ message: 'Wallet updated successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
} 