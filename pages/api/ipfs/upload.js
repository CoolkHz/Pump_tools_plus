import fs from 'fs'
import path from 'path'
import FormData from 'form-data'
import fetch from 'node-fetch'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不允许' })
  }

  try {
    const { name, symbol, description, twitter, telegram, website, imagePath } = req.body

    // 读取图片文件
    const publicDir = path.join(process.cwd(), 'public')
    const imageFilePath = path.join(publicDir, imagePath)
    const imageBuffer = await fs.promises.readFile(imageFilePath)

    // 准备表单数据
    const formData = new FormData()
    formData.append('file', imageBuffer, { filename: path.basename(imagePath) })
    formData.append('name', name)
    formData.append('symbol', symbol)
    formData.append('description', description)
    formData.append('twitter', twitter)
    formData.append('telegram', telegram)
    formData.append('website', website)
    formData.append('showName', 'true')

    // 发送到IPFS
    const ipfsResponse = await fetch('https://pump.fun/api/ipfs', {
      method: 'POST',
      body: formData
    })

    if (!ipfsResponse.ok) {
      throw new Error(`IPFS上传失败: ${ipfsResponse.statusText}`)
    }

    const ipfsData = await ipfsResponse.json()
    return res.status(200).json({ metadataUri: ipfsData.metadataUri })

  } catch (error) {
    console.error('IPFS上传错误:', error)
    return res.status(500).json({ error: error.message })
  }
} 