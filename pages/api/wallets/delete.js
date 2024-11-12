import { openDb } from '../../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { id } = req.query
    const db = await openDb()
    await db.run('DELETE FROM wallets WHERE id = ?', id)
    await db.close()
    res.status(200).json({ message: 'Wallet deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
} 