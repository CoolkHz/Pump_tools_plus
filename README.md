# PumpFun Tools - PumpFun工具集

一个功能强大的PumpFun工具集合，包含钱包管理、虚拟地址生成和交易执行等功能。

## 主要功能

### 1. 钱包管理 (Wallet Manager)
- **批量创建钱包**
  - 支持一次性创建最多200个钱包(已完成)
  - 自动生成公私钥对(已完成)
  - 实时显示SOL余额(已完成)

- **钱包分组管理** 
  - 支持Dev、底仓、刷单、刷量等分组(已完成)
  - Dev组限制单一钱包(已完成)
  - 灵活的分组调整(已完成)

- **批量转账功能**
  - 支持从Dev钱包批量分发到其他组(已完成)
  - 支持从其他组批量归集到Dev钱包(已完成)
  - 自动计算gas费，确保转账成功(已完成)
  - 实时显示转账进度和结果(已完成)

- **导入导出功能**
  - 支持批量导入Base58格式私钥(已完成)
  - 支持按组导出钱包信息为CSV(已完成)
  - 导入时自动验证私钥格式(已完成)

### 2. 虚拟地址生成
- **多线程并行计算**
  - 自动使用多CPU核心(已完成)
  - 实时显示生成速度(已完成)
  - 支持自定义后缀(已完成)

- **性能优化**
  - 批量生成和验证(已完成)
  - 内存使用优化(已完成)
  - 支持取消生成(已完成)

### 3. PumpFun功能
- **代币监控**
  - 支持山丘之王(KOTH)模式
  - 支持随机仿盘模式(已完成)
  - 自动获取代币元数据(已完成)

- **交易执行**
  - 支持设置底仓买入区间
  - 自动计算最优gas费(已完成)
  - 集成Jito MEV保护(已完成)
  - 交易结果实时反馈(已完成)



## 技术栈
- Next.js 12.3.4
- React 18.2.0
- Chakra UI
- SQLite3
- Solana Web3.js
- Web Workers

## 安装部署

1. 克隆项目
```bash
git clone https://github.com/vnxfsc/Pump_tools_bak.git
cd solana-tools
```

2. 安装依赖
```bash
npm install
```

3. 运行开发环境
```bash
npm run dev
```

4. 构建生产环境
```bash
npm run build
npm start
```

## 项目结构
```
solana-tools/
├── components/          # React组件
├── lib/                # 工具类和数据库操作
│   ├── KOTH.js        # 山丘之王相关
│   ├── NEW.js         # 新代币相关
│   ├── db.js          # 数据库操作
│   ├── tradeHandler.js # 交易处理
│   ├── vanityAddress.js # 虚拟地址生成
│   └── vanityWorker.js  # Web Worker实现
├── pages/              # 页面和API路由
│   ├── api/           # API接口
│   ├── _app.js        # Next.js入口
│   ├── index.js       # 首页
│   ├── pump-fun.js    # PumpFun功能页
│   └── wallet-manager.js # 钱包管理页
└── public/            # 静态资源
```

## 注意事项

1. **私钥安全**
- 所有私钥均使用SQLite本地存储
- 请勿将包含真实资金的私钥导入测试环境
- 建议定期备份数据库文件

2. **性能考虑**
- 虚拟地址生成可能需要较长时间
- 建议限制同时运行的Worker数量
- 注意监控系统资源使用

3. **API限制**
- 注意RPC调用频率限制
- 建议使用付费节点以提高稳定性

## 参与贡献
欢迎提交 Pull Request 或提出 Issue。详细贡献指南请参考 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 问题反馈
如果你发现了bug或有新功能建议，请提交 Issue。

## 更新计划
我们会定期更新项目进展，请关注项目动态。每个重要功能完成后都会发布新版本。
```
