import axios from 'axios'

class NEW {
  constructor(addLog) {
    this.wsRef = null
    this.addLog = addLog || console.log
    this.hasReceivedData = false
  }

  async fetchNewMetadata() {
    return new Promise((resolve, reject) => {
      try {
        this.wsRef = new WebSocket('wss://pumpportal.fun/api/data')

        this.wsRef.onopen = () => {
          const payload = { method: "subscribeNewToken" }
          this.wsRef.send(JSON.stringify(payload))
        }

        this.wsRef.onmessage = async (event) => {
          try {
            if (this.hasReceivedData) {
              return
            }

            const parsedData = JSON.parse(event.data)
            
            if (parsedData.message?.includes('Successfully subscribed')) {
              return
            }

            if (!parsedData.uri || !parsedData.mint) {
              return
            }

            this.hasReceivedData = true

            const metadataResponse = await axios.get(parsedData.uri)
            const metadata = metadataResponse.data

            const saveImageResponse = await axios.post('/api/new/save-image', {
              imageUrl: metadata.image,
              symbol: metadata.symbol
            })

            const combinedData = {
              ...parsedData,
              metadata: {
                ...metadata,
                savedImage: saveImageResponse.data.imagePath
              }
            }

            this.addLog('成功获取新代币数据', 'success')
            
            this.wsRef.close()
            
            resolve(combinedData)

          } catch (error) {
            console.error('处理消息失败:', error)
            reject(error)
          }
        }

        this.wsRef.onerror = (error) => {
          this.addLog('WebSocket连接失败', 'error')
          reject(error)
        }

      } catch (error) {
        this.addLog(`获取新代币数据失败: ${error.message}`, 'error')
        reject(error)
      }
    })
  }

  cleanup() {
    if (this.wsRef) {
      this.wsRef.close()
      this.wsRef = null
    }
    this.hasReceivedData = false
  }
}

export default NEW 