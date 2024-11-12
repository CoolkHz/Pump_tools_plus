const sqlite3 = require('sqlite3').verbose()
const { open } = require('sqlite')
const path = require('path')

let isInitialized = false

// 创建异步数据库连接函数
async function openDb() {
  if (!isInitialized) {
    await initDb()
    isInitialized = true
  }
  
  return open({
    filename: path.join(process.cwd(), 'wallets.db'),
    driver: sqlite3.Database
  })
}

// 初始化数据库
async function initDb() {
  const db = await open({
    filename: path.join(process.cwd(), 'wallets.db'),
    driver: sqlite3.Database
  })
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_key TEXT NOT NULL,
      private_key TEXT NOT NULL,
      sol_balance REAL DEFAULT 0,
      wallet_group TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  await db.close()
}

module.exports = { openDb, initDb } 