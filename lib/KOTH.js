import axios from 'axios'

class KOTH {
  constructor(addLog) {
    this.addLog = addLog || console.log
    this.maxRetries = 3
    this.retryDelay = 2000
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async fetchWithRetry(url, retryCount = 0) {
    try {
      const response = await axios.get(url)
      return response
    } catch (error) {
      if (retryCount < this.maxRetries) {
        this.addLog(`请求失败(${error.message})，${this.retryDelay/1000}秒后重试(${retryCount + 1}/${this.maxRetries})...`, 'warning')
        await this.delay(this.retryDelay)
        return this.fetchWithRetry(url, retryCount + 1)
      }
      throw error
    }
  }

  async fetchKOTHMetadata() {
    try {
      // 1. 通过本地 API 路由获取数据
      const response = await this.fetchWithRetry('/api/koth/metadata')
      const { metadata_uri, mint } = response.data
      
      // 2. 获取元数据
      this.addLog('正在获取代币元数据...', 'info')
      const metadataResponse = await this.fetchWithRetry(metadata_uri)
      const metadata = metadataResponse.data

      // 3. 保存图片
      this.addLog('正在保存代币图片...', 'info')
      const saveImageResponse = await axios.post('/api/koth/save-image', {
        imageUrl: metadata.image,
        symbol: metadata.symbol
      })

      // 4. 返回需要的数据
      const combinedData = {
        mint,
        metadata: {
          name: metadata.name,
          symbol: metadata.symbol,
          description: metadata.description,
          savedImage: saveImageResponse.data.imagePath,
          twitter: metadata.twitter,
          telegram: metadata.telegram,
          website: metadata.website
        }
      }

      this.addLog('成功获取山丘之王数据', 'success')
      return combinedData

    } catch (error) {
      let errorMessage = '获取山丘之王数据失败'
      
      if (error.response) {
        errorMessage += `: ${error.response.status} - ${error.response.statusText}`
      } else if (error.request) {
        errorMessage += ': 网络连接失败，请检查网络设置'
      } else {
        errorMessage += `: ${error.message}`
      }
      
      this.addLog(errorMessage, 'error')
      throw new Error(errorMessage)
    }
  }
}

export default KOTH 