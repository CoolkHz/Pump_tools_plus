import axios from 'axios'
import path from 'path'
import fs from 'fs'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { imageUrl, symbol } = req.body

    // 下载图片
    const response = await axios({
      method: 'get',
      url: imageUrl,
      responseType: 'arraybuffer'
    })

    // 创建保存目录 - 注意这里改为 new 目录
    const imagePath = path.join(process.cwd(), 'public', 'images', 'new')
    if (!fs.existsSync(imagePath)) {
      fs.mkdirSync(imagePath, { recursive: true })
    }

    // 生成文件名
    const timestamp = Date.now()
    const fileName = `${symbol}_${timestamp}.png`
    const filePath = path.join(imagePath, fileName)

    // 保存图片
    fs.writeFileSync(filePath, response.data)

    // 返回图片路径
    res.status(200).json({ 
      imagePath: `/images/new/${fileName}` 
    })
  } catch (error) {
    console.error('保存图片失败:', error)
    res.status(500).json({ message: error.message })
  }
} 