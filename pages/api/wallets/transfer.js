import { Connection, PublicKey, Transaction, SystemProgram, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js'
import bs58 from 'bs58'
import { openDb } from '../../../lib/db'

const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=b9d88906-ac34-4592-b02d-a8fa09739b4f'

// 获取最优 gas 费
async function getOptimalGasFee(connection) {
  try {
    const recentBlockhash = await connection.getRecentBlockhash('finalized')
    return recentBlockhash.feeCalculator.lamportsPerSignature
  } catch (error) {
    console.error('获取gas费失败:', error)
    return 5000 // 默认 gas 费
  }
}

// 更新钱包余额
async function updateWalletBalance(db, publicKey, connection) {
  try {
    const balance = await connection.getBalance(new PublicKey(publicKey))
    await db.run(
      'UPDATE wallets SET sol_balance = ? WHERE public_key = ?',
      [balance / LAMPORTS_PER_SOL, publicKey]
    )
    return balance
  } catch (error) {
    console.error('更新余额失败:', error)
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { mode, fromGroup, toGroup, amount, devToGroups } = req.body
    const connection = new Connection(HELIUS_RPC, 'confirmed')
    const db = await openDb()
    
    // 获取Dev钱包
    const devWallet = await db.get('SELECT * FROM wallets WHERE wallet_group = ?', ['Dev'])
    if (!devWallet) {
      throw new Error('未找到Dev钱包')
    }

    let results = []
    let errors = []

    // 获取最优 gas 费
    const optimalGasFee = await getOptimalGasFee(connection)
    console.log('当前最优gas费:', optimalGasFee / LAMPORTS_PER_SOL, 'SOL')

    if (mode === 'distribute') {
      // 批量分发模式
      const targetWallets = await db.all(
        'SELECT * FROM wallets WHERE wallet_group IN (' + 
        devToGroups.map(() => '?').join(',') + 
        ')',
        devToGroups
      )

      console.log('目标钱包:', targetWallets.length)

      // 先检查 Dev 钱包余额是否足够
      const devBalance = await connection.getBalance(new PublicKey(devWallet.public_key))
      const totalNeeded = (Number(amount) * LAMPORTS_PER_SOL * targetWallets.length) + 
                         (optimalGasFee * targetWallets.length)
      
      if (devBalance < totalNeeded) {
        throw new Error(`Dev钱包余额不足，需要 ${totalNeeded / LAMPORTS_PER_SOL} SOL，当前余额 ${devBalance / LAMPORTS_PER_SOL} SOL`)
      }

      const devKeypair = Keypair.fromSecretKey(bs58.decode(devWallet.private_key))
      
      for (const wallet of targetWallets) {
        try {
          console.log('正在转账到:', wallet.public_key)
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
          
          const transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: devKeypair.publicKey,
              toPubkey: new PublicKey(wallet.public_key),
              lamports: Math.floor(Number(amount) * LAMPORTS_PER_SOL),
            })
          )

          transaction.recentBlockhash = blockhash
          transaction.feePayer = devKeypair.publicKey
          
          transaction.sign(devKeypair)
          const signature = await connection.sendRawTransaction(
            transaction.serialize(),
            { maxRetries: 5 }
          )

          await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
          })

          // 更新发送方和接收方的余额
          await updateWalletBalance(db, devWallet.public_key, connection)
          await updateWalletBalance(db, wallet.public_key, connection)

          results.push({
            from: devWallet.public_key,
            to: wallet.public_key,
            amount,
            signature
          })
        } catch (err) {
          console.error('转账错误:', err)
          errors.push({
            wallet: wallet.public_key,
            error: err.message
          })
        }
      }
    } else if (mode === 'collect') {
      // 批量归集模式
      const sourceWallets = await db.all(
        'SELECT * FROM wallets WHERE wallet_group IN (' + 
        fromGroup.map(() => '?').join(',') + 
        ')',
        fromGroup
      )

      console.log('源钱包:', sourceWallets.length)
      const devPubkey = new PublicKey(devWallet.public_key)

      for (const wallet of sourceWallets) {
        try {
          console.log('正在从钱包转出:', wallet.public_key)
          const balance = await connection.getBalance(new PublicKey(wallet.public_key))
          const solBalance = balance / LAMPORTS_PER_SOL
          
          // 修改最小保留金额计算
          const minimumBalanceForRentExemption = await connection.getMinimumBalanceForRentExemption(0)
          const minRequired = (optimalGasFee + minimumBalanceForRentExemption) / LAMPORTS_PER_SOL
          
          if (solBalance <= minRequired) {
            console.log(`余额太小，跳过: ${solBalance} SOL (最小需要 ${minRequired} SOL)`)
            continue
          }

          // 计算可转账金额，确保保留足够的租金和手续费
          const transferAmount = solBalance - (minRequired)
          console.log(`可转账金额: ${transferAmount} SOL`)
          
          const sourceKeypair = Keypair.fromSecretKey(bs58.decode(wallet.private_key))
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
          
          const transaction = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: sourceKeypair.publicKey,
              toPubkey: devPubkey,
              lamports: Math.floor(transferAmount * LAMPORTS_PER_SOL),
            })
          )

          transaction.recentBlockhash = blockhash
          transaction.feePayer = sourceKeypair.publicKey
          
          // 先模拟交易
          try {
            const simulation = await connection.simulateTransaction(transaction)
            if (simulation.value.err) {
              throw new Error(`交易模拟失败: ${JSON.stringify(simulation.value.err)}`)
            }
          } catch (simError) {
            console.error('交易模拟失败:', simError)
            throw simError
          }

          transaction.sign(sourceKeypair)
          const signature = await connection.sendRawTransaction(
            transaction.serialize(),
            { 
              maxRetries: 5,
              skipPreflight: false // 启用预检查
            }
          )

          await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
          })

          // 更新发送方和接收方的余额
          await updateWalletBalance(db, wallet.public_key, connection)
          await updateWalletBalance(db, devWallet.public_key, connection)

          results.push({
            from: wallet.public_key,
            to: devWallet.public_key,
            amount: transferAmount,
            signature
          })
        } catch (err) {
          console.error('转账错误:', err)
          errors.push({
            wallet: wallet.public_key,
            error: err.message
          })
        }
      }
    }

    await db.close()

    res.status(200).json({
      results,
      errors,
      message: `成功执行 ${results.length} 笔转账${errors.length > 0 ? `，${errors.length} 笔失败` : ''}`
    })
  } catch (error) {
    console.error('转账失败:', error)
    res.status(500).json({ message: error.message })
  }
} 