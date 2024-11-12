import axios from 'axios'

class KOTH {
  constructor(addLog) {
    this.addLog = addLog || console.log
  }

  async fetchKOTHMetadata() {
    try {
      // 1. 获取基础数据
      const response = await axios({
        method: 'get',
        url: 'https://frontend-api.pump.fun/coins/king-of-the-hill',
        params: { includeNsfw: true },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          'Origin': 'https://pump.fun',
          'Referer': 'https://pump.fun/'
        }
      })

      const kothData = response.data
      
      // 2. 获取元数据
      const metadataResponse = await axios.get(kothData.metadata_uri)
      const metadata = metadataResponse.data

      // 3. 保存图片
      const saveImageResponse = await axios.post('/api/koth/save-image', {
        imageUrl: metadata.image,
        symbol: metadata.symbol
      })

      // 4. 组合数据
      const combinedData = {
        ...kothData,
        metadata: {
          ...metadata,
          savedImage: saveImageResponse.data.imagePath
        }
      }

      this.addLog('成功获取山丘之王数据', 'success')
      return combinedData

    } catch (error) {
      this.addLog(`获取山丘之王数据失败: ${error.message}`, 'error')
      throw error
    }
  }
}

export default KOTH 