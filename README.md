# Pump_tools_bak - Pumpfun失败的工具

一个功能强大的Pumpfun工具集合,包含钱包管理、代币监控和交易执行等功能。
目前Jito失败了 坐等一个大佬

## 主要功能

### 1. 钱包管理 (Wallet Manager)

- **批量创建钱包**
  - 支持一次性创建最多200个钱包
  - 自动生成公私钥对
  - 实时显示SOL余额

- **钱包分组管理** 
  - 支持Dev、底仓、刷单、刷量等分组
  - Dev组限制单一钱包
  - 灵活的分组调整

- **批量转账功能**
  - 支持从Dev钱包批量分发到其他组
  - 支持从其他组批量归集到Dev钱包
  - 自动计算gas费,确保转账成功
  - 实时显示转账进度和结果

- **导入导出功能**
  - 支持批量导入Base58格式私钥
  - 支持按组导出钱包信息为CSV
  - 导入时自动验证私钥格式

- **余额监控**
  - 30秒自动刷新所有钱包SOL余额
  - 显示每个分组的总余额统计

### 2. PumpFun功能

- **代币监控**
  - 支持山丘之王(KOTH)模式
  - 支持随机仿盘模式
  - 自动获取代币元数据

- **交易执行**
  - 支持设置底仓买入区间
  - 自动计算最优gas费
  - 集成Jito MEV保护
  - 交易结果实时反馈

- **刷单功能**
  - 支持拉盘/砸盘模式
  - 可设置操作仓位范围
  - 自动随机化交易金额

- **刷量功能** 
  - 可配置单笔交易量
  - 支持多钱包轮换交易
  - 实时显示刷量进度

## 技术栈

- Next.js 12
- Chakra UI
- SQLite3
- Solana Web3.js
- Helius RPC

## 安装部署

```bash
git clone https://github.com/your-username/solana-tools.git
cd solana-tools
```

## 安装依赖
```bash
npm install
```
## 运行开发环境
```bash
npm run dev
```

## 项目结构
```
Pump_tools_bak/
├── components/ # React组件
├── lib/ # 工具类和数据库操作
├── pages/ # 页面和API路由
│ ├── api/ # API接口
│ │ ├── ipfs/ # IPFS相关接口
│ │ ├── koth/ # KOTH相关接口
│ │ ├── new/ # 新代币相关接口
│ │ └── wallets/ # 钱包管理接口
│ ├── app.js # Next.js入口
│ ├── index.js # 首页
│ ├── pump-fun.js # PumpFun功能页
│ └── wallet-manager.js # 钱包管理页
├── public/ # 静态资源
│ └── images/ # 图片存储
├── styles/ # 样式文件
├── .env.local # 环境变量
├── next.config.js # Next.js配置
└── package.json # 项目配置
```

## API接口说明

### 钱包管理接口

- `GET /api/wallets` - 获取钱包列表
- `POST /api/wallets/import` - 导入钱包
- `POST /api/wallets/create` - 创建钱包
- `PUT /api/wallets/update` - 更新钱包信息
- `DELETE /api/wallets/delete` - 删除钱包
- `POST /api/wallets/transfer` - 批量转账
- `GET /api/wallets/export` - 导出钱包

### PumpFun接口

- `POST /api/koth/save-image` - 保存KOTH图片
- `POST /api/new/save-image` - 保存新代币图片
- `POST /api/ipfs/upload` - 上传到IPFS

## 数据库结构

### wallets表
sql
CREATE TABLE wallets (
id INTEGER PRIMARY KEY AUTOINCREMENT,
public_key TEXT NOT NULL,
private_key TEXT NOT NULL,
sol_balance REAL DEFAULT 0,
wallet_group TEXT DEFAULT NULL,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
