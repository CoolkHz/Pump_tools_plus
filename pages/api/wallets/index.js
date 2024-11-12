import { openDb } from '../../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const db = await openDb()
    const wallets = await db.all('SELECT * FROM wallets ORDER BY id DESC')
    await db.close()
    res.status(200).json(wallets)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
} 