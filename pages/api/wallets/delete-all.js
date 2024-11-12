import { openDb } from '../../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const db = await openDb()
    await db.run('DELETE FROM wallets')
    await db.close()
    res.status(200).json({ message: '所有钱包已删除' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
} 