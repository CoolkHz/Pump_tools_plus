import { Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js'
import bs58 from 'bs58'
import FormData from 'form-data'
import axios from 'axios'

class TradeHandler {
  constructor(addLog) {
    this.addLog = addLog || console.log
    this.signerKeyPairs = []
    this.devKeypair = null
  }

  // 生成随机金额
  getRandomAmount(min, max) {
    min = Number(min)
    max = Number(max)
    return Number((Math.random() * (max - min) + min).toFixed(2))
  }

  // 初始化钱包
  async initializeWallets() {
    try {
      // 通过API获取钱包
      const response = await axios.get('/api/wallets/get-wallets')
      const { devWallet, baseWallets } = response.data

      if (!devWallet) {
        throw new Error('未找到Dev钱包')
      }

      if (!baseWallets || baseWallets.length === 0) {
        throw new Error('未找到底仓钱包')
      }

      // 初始化签名者数组
      this.devKeypair = Keypair.fromSecretKey(bs58.decode(devWallet.private_key))
      this.signerKeyPairs = baseWallets.map(wallet => 
        Keypair.fromSecretKey(bs58.decode(wallet.private_key))
      )

      this.addLog(`成功初始化 ${this.signerKeyPairs.length + 1} 个钱包`, 'success')
      return true

    } catch (error) {
      this.addLog(`初始化钱包失败: ${error.message}`, 'error')
      return false
    }
  }

  // 准备元数据
  prepareTokenMetadata(metadata, strategy) {
    try {
      let tokenMetadata = {}

      if (strategy === 'mountain') {
        tokenMetadata = {
          name: metadata.metadata.name,
          symbol: metadata.metadata.symbol,
          description: metadata.metadata.description || '',
          twitter: metadata.twitter || '',
          telegram: metadata.telegram || '',
          website: metadata.website || '',
          savedImage: metadata.metadata.savedImage
        }
      } else {
        tokenMetadata = {
          name: metadata.metadata.name,
          symbol: metadata.metadata.symbol,
          description: metadata.metadata.description || '',
          twitter: metadata.metadata.twitter || '',
          telegram: metadata.metadata.telegram || '',
          website: metadata.metadata.website || '',
          savedImage: metadata.metadata.savedImage
        }
      }

      this.addLog('元数据准备完成', 'success')
      return tokenMetadata

    } catch (error) {
      this.addLog(`准备元数据失败: ${error.message}`, 'error')
      throw error
    }
  }

  // 上传到IPFS
  async uploadToIPFS(tokenMetadata) {
    try {
      this.addLog('开始上传到IPFS...', 'info')

      // 改用后端API处理图片上传和元数据
      const response = await fetch('/api/ipfs/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: tokenMetadata.name,
          symbol: tokenMetadata.symbol,
          description: tokenMetadata.description,
          twitter: tokenMetadata.twitter || "",
          telegram: tokenMetadata.telegram || "",
          website: tokenMetadata.website || "",
          imagePath: tokenMetadata.savedImage // 只传递图片路径
        })
      })

      if (!response.ok) {
        throw new Error(`上传失败: ${response.statusText}`)
      }

      const { metadataUri } = await response.json()
      this.addLog('IPFS上传成功', 'success')
      return metadataUri

    } catch (error) {
      this.addLog(`IPFS上传失败: ${error.message}`, 'error')
      throw error
    }
  }

  // 创建交易捆绑包
  async createBundledTransactions(tokenMetadata, mintKeypair, minAmount, maxAmount) {
    try {
      // 确保已初始化钱包
      if (!this.devKeypair) {
        throw new Error('未找到Dev钱包')
      }
      if (!this.signerKeyPairs || this.signerKeyPairs.length === 0) {
        throw new Error('未找到底仓钱包')
      }
      if (this.signerKeyPairs.length < 1) {
        throw new Error('底仓钱包数量不足，需要至少1个钱包')
      }

      // 确定底仓钱包数量（1-4个）
      const baseWalletCount = Math.min(4, this.signerKeyPairs.length)
      
      // 创建交易：1 Dev创建 + 1-4个底仓买入
      const bundleTxs = [
        // Dev钱包创建交易
        {
          publicKey: this.devKeypair.publicKey.toBase58(),
          action: "create",
          tokenMetadata: {
            name: tokenMetadata.name,
            symbol: tokenMetadata.symbol,
            uri: tokenMetadata.uri
          },
          mint: mintKeypair.publicKey.toBase58(),
          mintKeypair: mintKeypair,
          denominatedInSol: "true",
          amount: this.getRandomAmount(minAmount, maxAmount),
          slippage: 10,
          priorityFee: 0.0001,
          pool: "pump"
        },
        // 1-4个底仓钱包买入交易
        ...this.signerKeyPairs.slice(0, baseWalletCount).map(keypair => ({
          publicKey: keypair.publicKey.toBase58(),
          action: "buy",
          mint: mintKeypair.publicKey.toBase58(),
          denominatedInSol: "true",
          amount: this.getRandomAmount(minAmount, maxAmount),
          slippage: 50,
          priorityFee: 0.00005,
          pool: "pump"
        }))
      ]

      this.addLog(`创建交易捆绑包成功: 1 Dev + ${baseWalletCount} 底仓`, 'success')
      return bundleTxs

    } catch (error) {
      this.addLog(`创建交易捆绑包失败: ${error.message}`, 'error')
      throw error
    }
  }

  // 提交交易并发送到Jito
  async submitTransactions(bundledTxArgs) {
    try {
      // 1. 提交到trade-local获取交易
      this.addLog('正在生成交易...', 'info')
      const response = await fetch('https://pumpportal.fun/api/trade-local', {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(bundledTxArgs)
      })

      if (response.status === 200) {
        const transactions = await response.json()
        let encodedSignedTransactions = []
        let signatures = []

        // 2. 签名交易
        this.addLog('正在签名交易...', 'info')
        for (let i = 0; i < bundledTxArgs.length; i++) {
          const tx = VersionedTransaction.deserialize(
            new Uint8Array(bs58.decode(transactions[i]))
          )

          if (bundledTxArgs[i].action === "create") {
            // 创建交易需要Dev钱包签名
            tx.sign([this.devKeypair])
          } else {
            // 买入交易使用底仓钱包签名
            const walletIndex = i - 1 // 减1是因为第一个是Dev钱包
            tx.sign([this.signerKeyPairs[walletIndex]])
          }

          encodedSignedTransactions.push(bs58.encode(tx.serialize()))
          signatures.push(bs58.encode(tx.signatures[0]))
        }

        // 3. 发送到Jito
        try {
          this.addLog('正在发送到Jito...', 'info')
          const jitoResponse = await fetch('https://mainnet.block-engine.jito.wtf/api/v1/bundles', {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              "jsonrpc": "2.0",
              "id": 1,
              "method": "sendBundle",
              "params": [
                encodedSignedTransactions
              ]
            })
          })
          console.log(jitoResponse)

          // 4. 打印交易链接
          for (let i = 0; i < signatures.length; i++) {
            const txType = bundledTxArgs[i].action === "create" ? '创建' : '买入'
            const txUrl = `https://solscan.io/tx/${signatures[i]}`
            console.log(`Transaction ${i}: ${txUrl}`)
            this.addLog(`${txType}交易: ${txUrl}`, 'success')
          }

        } catch (error) {
          console.error(error.message)
          throw error
        }
      } else {
        console.log(response.statusText)
        throw new Error(response.statusText)
      }

    } catch (error) {
      this.addLog(`交易提交失败: ${error.message}`, 'error')
      throw error
    }
  }

  // 处理完整流程
  async prepareMetadata(metadata, strategy, mintKeypair, minAmount, maxAmount) {
    try {
      // 1. 初始化钱包
      const initialized = await this.initializeWallets()
      if (!initialized) {
        throw new Error('钱包初始化失败')
      }

      // 2. 准备元数据
      const tokenMetadata = this.prepareTokenMetadata(metadata, strategy)
      
      // 3. 上传到IPFS
      const metadataUri = await this.uploadToIPFS(tokenMetadata)

      // 4. 创建交易捆绑包
      const bundledTxArgs = await this.createBundledTransactions(
        {
          ...tokenMetadata,
          uri: metadataUri
        },
        mintKeypair,
        minAmount,
        maxAmount
      )

      // 5. 提交交易
      await this.submitTransactions(bundledTxArgs)

      this.addLog('交易流程完成', 'success')
      return {
        bundledTxArgs,
        devKeypair: this.devKeypair,
        signerKeyPairs: this.signerKeyPairs
      }

    } catch (error) {
      this.addLog(`处理失败: ${error.message}`, 'error')
      throw error
    }
  }
}

export default TradeHandler 