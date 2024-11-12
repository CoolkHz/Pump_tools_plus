import { openDb } from '../../../lib/db'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { group } = req.query
    const db = await openDb()
    let wallets
    
    if (group) {
      wallets = await db.all('SELECT * FROM wallets WHERE wallet_group = ?', group)
    } else {
      wallets = await db.all('SELECT * FROM wallets')
    }

    await db.close()

    // 转换为CSV格式
    const csv = [
      ['序号', '公钥', '私钥', 'SOL余额', '分组'].join(','),
      ...wallets.map((w, i) => [
        i + 1,
        w.public_key,
        w.private_key,
        w.sol_balance,
        w.wallet_group
      ].join(','))
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=wallets.csv')
    res.status(200).send(csv)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
} 