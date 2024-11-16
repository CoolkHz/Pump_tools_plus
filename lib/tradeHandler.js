import { Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js'
import bs58 from 'bs58'
import FormData from 'form-data'
import axios from 'axios'
import { Connection } from '@solana/web3.js'

// 在文件顶部添加常量定义
const WALLETS_PER_GROUP = 5; // 每组5个钱包

// 添加多个 RPC 节点
const RPC_ENDPOINTS = [
  'https://mainnet.helius-rpc.com/?api-key=b9d88906-ac34-4592-b02d-a8fa09739b4f',
  'https://autumn-holy-frost.solana-mainnet.quiknode.pro/272ebddec617025abfb555741dfef06238a19411',
];

class TradeHandler {
  constructor(addLog) {
    this.addLog = addLog || console.log
    this.signerKeyPairs = []
    this.devKeypair = null
    this.mintKeypair = null
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
      this.addLog('IPFS上传功', 'success')
      return metadataUri

    } catch (error) {
      this.addLog(`IPFS上传失败: ${error.message}`, 'error')
      throw error
    }
  }

  // 修改检查余额的方法
  async checkWalletBalances(wallets, amounts) {
    try {
      // 从数据库获取所有钱包余额
      const response = await fetch('/api/wallets');
      const walletsData = await response.json();
      
      // 创建公钥到余额的映射
      const balanceMap = walletsData.reduce((map, wallet) => {
        map[wallet.public_key] = wallet.sol_balance;
        return map;
      }, {});

      // 检查每个钱包的余额
      return wallets.map((wallet, index) => {
        const publicKey = wallet.publicKey.toString();
        const solBalance = balanceMap[publicKey] || 0;
        const requiredAmount = Number(amounts[index]) + 0.01;
        
        return {
          publicKey,
          hasEnough: solBalance >= requiredAmount,
          balance: solBalance,
          required: requiredAmount
        };
      });
    } catch (error) {
      throw new Error(`检查余额失败: ${error.message}`);
    }
  }

  // 创建交易捆绑包
  async createBundledTransactions(tokenMetadata, mintKeypair, minAmount, maxAmount) {
    try {
      // 确保已初始化钱包
      if (!this.devKeypair) {
        throw new Error('未找Dev钱包')
      }
      if (!this.signerKeyPairs || this.signerKeyPairs.length === 0) {
        throw new Error('未找到底仓钱包')
      }
      if (this.signerKeyPairs.length < 1) {
        throw new Error('底仓钱包数量不足，需要至少1个钱包')
      }

      // 第一组：1 Dev + 4 底仓
      const firstGroupBaseCount = 4;
      const firstGroup = [
        this.devKeypair,
        ...this.signerKeyPairs.slice(0, firstGroupBaseCount)
      ];

      // 剩余底仓钱包分组，每组5个
      const remainingWallets = this.signerKeyPairs.slice(firstGroupBaseCount);
      const groups = [firstGroup];
      
      for (let i = 0; i < remainingWallets.length; i += WALLETS_PER_GROUP) {
        const group = remainingWallets.slice(i, i + WALLETS_PER_GROUP);
        if (group.length > 0) {
          groups.push(group);
        }
      }

      // 先生成所有组的交易金额并显示
      this.addLog('------------------------', 'info');
      this.addLog('交易金额预览：', 'info');
      
      // 第一组：Dev + 4底仓
      const firstGroupAmounts = firstGroup.map(() => this.getRandomAmount(minAmount, maxAmount));
      this.addLog(`Dev钱包买入: ${firstGroupAmounts[0]} SOL`, 'info');
      firstGroupAmounts.slice(1).forEach((amount, index) => {
        this.addLog(`底仓${index + 1}买入: ${amount} SOL`, 'info');
      });

      // 其他组的金额
      const otherGroupsAmounts = groups.slice(1).map(group => 
        group.map(() => this.getRandomAmount(minAmount, maxAmount))
      );

      otherGroupsAmounts.forEach((groupAmounts, groupIndex) => {
        groupAmounts.forEach((amount, index) => {
          const walletIndex = firstGroupBaseCount + (groupIndex * WALLETS_PER_GROUP) + index + 1;
          this.addLog(`底仓${walletIndex}买入: ${amount} SOL`, 'info');
        });
      });

      // 计算总金额
      const totalAmount = [
        ...firstGroupAmounts,
        ...otherGroupsAmounts.flat()
      ].reduce((sum, amount) => sum + amount, 0);
      
      this.addLog(`总买入金额: ${totalAmount.toFixed(2)} SOL`, 'info');
      this.addLog('------------------------', 'info');

      // 检查所有钱包余额
      this.addLog('检查钱包余额...', 'info');
      
      // 收集所有钱包和对应的金额
      const allWallets = [
        ...firstGroup,
        ...groups.slice(1).flat()
      ];

      const allAmounts = [
        ...firstGroupAmounts,
        ...otherGroupsAmounts.flat()
      ];

      // 批量检查余额
      const balanceResults = await this.checkWalletBalances(allWallets, allAmounts);

      // 收有余额不足的钱包
      const insufficientBalances = [];

      // 检查结果
      for (let i = 0; i < balanceResults.length; i++) {
        const result = balanceResults[i];
        const walletType = i === 0 ? 'Dev' : `底仓${i}`;
        
        if (!result.hasEnough) {
          insufficientBalances.push({
            type: walletType,
            required: result.required,
            balance: result.balance
          });
        } else {
          this.addLog(`${walletType}钱包余额充足: ${result.balance} SOL`, 'success');
        }
      }

      // 如果有余额不足的钱包，显示所有不足情况并抛出错误
      if (insufficientBalances.length > 0) {
        this.addLog('------------------------', 'error');
        this.addLog('以下钱包余额不足:', 'error');
        
        insufficientBalances.forEach(wallet => {
          this.addLog(`${wallet.type}钱包: 需要 ${wallet.required} SOL，当前余额 ${wallet.balance} SOL`, 'error');
        });
        
        this.addLog('------------------------', 'error');
        throw new Error('存在余额不足的钱包，请充值后重试');
      }

      this.addLog('所有钱包余额检查通过', 'success');
      this.addLog('------------------------', 'info');

      // 处理所有组的交易
      let allTransactions = [];

      // 第一组交易（Dev + 4底仓）
      const firstGroupTxs = [
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
          amount: firstGroupAmounts[0],
          slippage: 10,
          priorityFee: 0.0001,
          pool: "pump"
        },
        // 4个底仓钱包买入交易
        ...firstGroup.slice(1).map((keypair, index) => ({
          publicKey: keypair.publicKey.toBase58(),
          action: "buy",
          mint: mintKeypair.publicKey.toBase58(),
          denominatedInSol: "true",
          amount: firstGroupAmounts[index + 1],
          slippage: 50,
          priorityFee: 0.00005,
          pool: "pump"
        }))
      ];

      allTransactions.push(...firstGroupTxs);
      this.addLog(`创建第1组交易: 1 Dev + ${firstGroupBaseCount} 底仓`, 'success');

      // 处理剩余组的交易（每组5个底仓）
      for (let groupIndex = 1; groupIndex < groups.length; groupIndex++) {
        const group = groups[groupIndex];
        const groupAmounts = group.map(() => this.getRandomAmount(minAmount, maxAmount));
        
        // 检查每个钱包的余额
        for (let i = 0; i < group.length; i++) {
          const walletIndex = firstGroupBaseCount + (groupIndex - 1) * WALLETS_PER_GROUP + i + 1;
          const balanceCheck = await this.checkWalletBalances([group[i]], [groupAmounts[i]]);
          
          if (!balanceCheck.hasEnough) {
            throw new Error(`底仓${walletIndex}钱包余额不足: 需要 ${balanceCheck.required} SOL，当前余额 ${balanceCheck.balance} SOL`);
          }
          
          this.addLog(`底仓${walletIndex}买入: ${groupAmounts[i]} SOL (余额: ${balanceCheck.balance} SOL)`, 'info');
        }

        const groupTxs = group.map((keypair, index) => ({
          publicKey: keypair.publicKey.toBase58(),
          action: "buy",
          mint: mintKeypair.publicKey.toBase58(),
          denominatedInSol: "true",
          amount: groupAmounts[index],
          slippage: 50,
          priorityFee: 0.00005,
          pool: "pump"
        }));

        allTransactions.push(...groupTxs);
        this.addLog(`创建第${groupIndex + 1}组交易: ${group.length} 底仓`, 'success');
      }

      return allTransactions;

    } catch (error) {
      this.addLog(`创建交易失败: ${error.message}`, 'error');
      throw error;
    }
  }

  // 提交交易并发送到Jito
  async submitTransactions(bundledTxArgs) {
    try {
      // 将交易分成每组5个
      const MAX_BUNDLE_SIZE = 5;
      const txGroups = [];
      
      for (let i = 0; i < bundledTxArgs.length; i += MAX_BUNDLE_SIZE) {
        txGroups.push(bundledTxArgs.slice(i, i + MAX_BUNDLE_SIZE));
      }

      this.addLog(`交易分组: ${txGroups.length}组，每组最多${MAX_BUNDLE_SIZE}笔交易`, 'info');

      // 逐组处理交易
      for (let groupIndex = 0; groupIndex < txGroups.length; groupIndex++) {
        const groupTxs = txGroups[groupIndex];
        
        // 1. 提交到trade-local获取交易
        this.addLog(`正在生成第${groupIndex + 1}组交易...`, 'info');
        
        // 如果不是第一组，先等待0.1秒让前面的交易确认
        if (groupIndex > 0) {
          this.addLog('等待0.1秒让前面的交易确认...', 'info');
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const response = await fetch('https://pumpportal.fun/api/trade-local', {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(groupTxs)
        });

        if (response.status === 200) {
          const transactions = await response.json();
          let encodedSignedTransactions = [];
          let signatures = [];

          // 2. 签名交易
          this.addLog('正在签名交易...', 'info');
          for (let i = 0; i < groupTxs.length; i++) {
            const tx = VersionedTransaction.deserialize(
              new Uint8Array(bs58.decode(transactions[i]))
            );

            if (groupTxs[i].action === "create") {
              tx.sign([this.mintKeypair, this.devKeypair]);
            } else {
              const walletIndex = groupIndex * MAX_BUNDLE_SIZE + i - (groupIndex === 0 ? 1 : 0);
              tx.sign([this.signerKeyPairs[walletIndex]]);
            }

            encodedSignedTransactions.push(bs58.encode(tx.serialize()));
            signatures.push(bs58.encode(tx.signatures[0]));
          }

          // 3. 发送Jito
          this.addLog('正在发送到Jito...', 'info');
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
          });

          // 4. 打印交易链接
          for (let i = 0; i < signatures.length; i++) {
            const txType = groupIndex === 0 && i === 0 ? '创建' : '买入';
            const txUrl = `https://solscan.io/tx/${signatures[i]}`;
            this.addLog(`${txType}交易: ${txUrl}`, 'success');
          }

          // 组之间添加延迟，第一组和其他组都等待100毫秒
          if (groupIndex < txGroups.length - 1) {
            const delayTime = 100;
            this.addLog(`等待${delayTime/1000}秒处理下一组...`, 'info');
            await new Promise(resolve => setTimeout(resolve, delayTime));
          }
        } else {
          throw new Error(response.statusText);
        }
      }
    } catch (error) {
      this.addLog(`交易提交失败: ${error.message}`, 'error');
      throw error;
    }
  }

  // 处理完整流程
  async prepareMetadata(metadata, strategy, mintKeypair, minAmount, maxAmount) {
    try {
      this.mintKeypair = mintKeypair
      
      // 1. 初始化钱包
      const initialized = await this.initializeWallets()
      if (!initialized) {
        throw new Error('钱包初始失败')
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

  // 修改卖出方法，移除余额检查
  async executeSellTransactions(rugPercentage) {
    try {
      if (!this.devKeypair || !this.signerKeyPairs || !this.mintKeypair) {
        throw new Error('未找到交易钱包或代币地址');
      }

      // 分组处理钱包
      const firstGroupBaseCount = 4;
      const walletGroups = [];
      
      // 第一组：Dev + 4个底仓
      walletGroups.push([this.devKeypair, ...this.signerKeyPairs.slice(0, firstGroupBaseCount)]);
      
      // 剩余的底仓钱包分组，每组5个
      const remainingWallets = this.signerKeyPairs.slice(firstGroupBaseCount);
      for (let i = 0; i < remainingWallets.length; i += WALLETS_PER_GROUP) {
        const group = remainingWallets.slice(i, i + WALLETS_PER_GROUP);
        if (group.length > 0) {
          walletGroups.push(group);
        }
      }

      this.addLog(`钱包分组: ${walletGroups.length}组`, 'info');
      this.addLog(`第1组: Dev + ${firstGroupBaseCount}个底仓`, 'info');
      for (let i = 1; i < walletGroups.length; i++) {
        this.addLog(`第${i + 1}组: ${walletGroups[i].length}个底仓`, 'info');
      }

      // 逐组处理交易
      for (let groupIndex = 0; groupIndex < walletGroups.length; groupIndex++) {
        const group = walletGroups[groupIndex];
        
        // 构建卖出交易参数
        const bundledTxArgs = group.map((keypair, index) => ({
          publicKey: keypair.publicKey.toBase58(),
          action: "sell",
          mint: this.mintKeypair.publicKey.toBase58(),
          denominatedInSol: "false",
          amount: `${rugPercentage}%`,  // 改回百分比字符串格式
          slippage: 50,
          priorityFee: groupIndex === 0 && index === 0 ? 0.00005 : 0,
          pool: "pump"
        }));

        this.addLog(`正在处理第${groupIndex + 1}组卖出交易...`, 'info');
        
        // 获取交易
        const response = await fetch('https://pumpportal.fun/api/trade-local', {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(bundledTxArgs)
        });

        if (response.status === 200) {
          const transactions = await response.json();
          let encodedSignedTransactions = [];
          let signatures = [];

          // 签名交易
          this.addLog('正在签名交易...', 'info');
          for (let i = 0; i < bundledTxArgs.length; i++) {
            const tx = VersionedTransaction.deserialize(
              new Uint8Array(bs58.decode(transactions[i]))
            );
            tx.sign([group[i]]);
            encodedSignedTransactions.push(bs58.encode(tx.serialize()));
            signatures.push(bs58.encode(tx.signatures[0]));
          }

          // 发送到Jito
          this.addLog('正在发送到Jito...', 'info');
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
          });

          if (jitoResponse.status === 200) {
            // 打印交易链接
            signatures.forEach((sig, index) => {
              const walletType = groupIndex === 0 && index === 0 ? 'Dev' : `底仓${index + (groupIndex * WALLETS_PER_GROUP)}`;
              this.addLog(`${walletType}卖出: https://solscan.io/tx/${sig}`, 'success');
            });
          } else {
            throw new Error('Jito交易发送失败');
          }
        } else {
          throw new Error(`API响应错误: ${response.status}`);
        }

        // 组之间添加延迟
        if (groupIndex < walletGroups.length - 1) {
          this.addLog(`等待0.1秒处理下一组...`, 'info');
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      this.addLog('所有组卖出交易完成！', 'success');
      return { success: true };

    } catch (error) {
      this.addLog(`卖出失败: ${error.message}`, 'error');
      throw error;
    }
  }
}

export default TradeHandler 