import {
  Box,
  Grid,
  GridItem,
  VStack,
  Text,
  Input,
  HStack,
  Select,
  Button,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  useColorModeValue,
  Divider,
  RadioGroup,
  Radio,
} from '@chakra-ui/react'
import { useState, useRef, useCallback } from 'react'
import KOTH from '../lib/KOTH'
import NEW from '../lib/NEW'
import TradeHandler from '../lib/tradeHandler'
import { Keypair } from '@solana/web3.js'
import { VanityAddressGenerator } from '../lib/vanityAddress'

export default function PumpFun() {
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  // 基础状态
  const [contractAddress, setContractAddress] = useState('')
  const [minPosition, setMinPosition] = useState(1)
  const [maxPosition, setMaxPosition] = useState(5)
  const [strategy, setStrategy] = useState('mountain')
  const [rugPercentage, setRugPercentage] = useState(50)
  const [isAutoFetching, setIsAutoFetching] = useState(false)
  const [mintKeypair, setMintKeypair] = useState(null)

  // 日志状态
  const [logs, setLogs] = useState([])
  const logContainerRef = useRef(null)
  const logEndRef = useRef(null)

  // 添加刷单相关状态
  const [tradeMode, setTradeMode] = useState('up')
  const [minTradePosition, setMinTradePosition] = useState(0.1)
  const [maxTradePosition, setMaxTradePosition] = useState(1)
  const [tradingPercentage, setTradingPercentage] = useState(30)
  const [isTrading, setIsTrading] = useState(false)

  // 刷量相关状态
  const [tradeAmount, setTradeAmount] = useState(0.1)
  const [walletCount, setWalletCount] = useState(5)
  const [isVolumeTrading, setIsVolumeTrading] = useState(false)

  // 添加生成合约地址函数
  const [desiredSuffix, setDesiredSuffix] = useState('pump');

  // 日志函数
  const addLog = useCallback((message, type = 'info') => {
    const newLog = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      message,
      type
    }
    setLogs(prev => {
      const updatedLogs = [...prev, newLog].slice(-100)
      return updatedLogs
    })
  }, [])

  // 一键仿盘处理函数
  const handleStartCopy = async () => {
    try {
      if (!mintKeypair) {
        addLog('请先生成合约地址', 'error')
        return
      }

      setIsAutoFetching(true)
      let metadata = null
      
      // 2. 获取元数据
      if (strategy === 'mountain') {
        const koth = new KOTH(addLog)
        metadata = await koth.fetchKOTHMetadata()
        console.log('获取到的山丘之王数据:', metadata)
        
        addLog(`代币名称: ${metadata.metadata.name}`, 'info')
        addLog(`代币符号: ${metadata.metadata.symbol}`, 'info')
        addLog(`合约地址: ${metadata.mint}`, 'info')
        addLog(`图片已保存: ${metadata.metadata.savedImage}`, 'success')
      } else {
        const newToken = new NEW(addLog)
        metadata = await newToken.fetchNewMetadata()
        console.log('获取到的新代币数据:', metadata)
        
        addLog(`代币名称: ${metadata.metadata.name}`, 'info')
        addLog(`代币符号: ${metadata.metadata.symbol}`, 'info')
        addLog(`合约地址: ${metadata.mint}`, 'info')
        addLog(`图片已保存: ${metadata.metadata.savedImage}`, 'success')
        
        newToken.cleanup()
      }

      // 3. 执行完整交易流程
      if (metadata) {
        const tradeHandler = new TradeHandler(addLog)
        await tradeHandler.prepareMetadata(
          metadata,
          strategy,
          mintKeypair,
          Number(minPosition),
          Number(maxPosition)
        )
      }

    } catch (error) {
      console.error('处理失败:', error)
      addLog(`处理失败: ${error.message}`, 'error')
    } finally {
      setIsAutoFetching(false)
    }
  }

  // 添加生成合约地址的函数
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCancel = () => {
    if (generator) {
      generator.stopWorkers();
      setIsGenerating(false);
      addLog('已取消地址生成', 'warning');
    }
  };

  // 在组件中保存 generator 实例
  const [generator, setGenerator] = useState(null);

  const generateNewContract = async () => {
    setIsGenerating(true);
    const newGenerator = new VanityAddressGenerator(addLog);
    setGenerator(newGenerator);
    
    try {
      const startTime = Date.now();
      let lastProgressUpdate = startTime;
      
      const result = await newGenerator.generateEndsWith(desiredSuffix, (attempts) => {
        const now = Date.now();
        // 每秒最多更新一次进度，避免UI卡顿
        if (now - lastProgressUpdate >= 1000) {
          const elapsedSeconds = (now - startTime) / 1000;
          const speed = Math.round(attempts / elapsedSeconds);
          addLog(`已尝试 ${attempts.toLocaleString()} 次... (${speed.toLocaleString()} 次/秒)`, 'info');
          lastProgressUpdate = now;
        }
      });

      const endTime = Date.now();
      const totalSeconds = (endTime - startTime) / 1000;
      const speed = Math.round(result.attempts / totalSeconds);

      setMintKeypair(result.keypair);
      setContractAddress(result.keypair.publicKey.toString());
      
      addLog(`成功生成地址: ${result.keypair.publicKey.toString()}`, 'success');
      addLog(`总尝试次数: ${result.attempts.toLocaleString()}`, 'info');
      addLog(`耗时: ${totalSeconds.toFixed(2)}秒 (${speed.toLocaleString()} 次/秒)`, 'info');
      
    } catch (error) {
      if (error.message !== '已取消生成') {
        addLog(`生成失败: ${error.message}`, 'error');
      }
    } finally {
      setIsGenerating(false);
      setGenerator(null);
    }
  };

  return (
    <Grid 
      templateColumns="repeat(2, 1fr)" 
      templateRows="repeat(2, 1fr)"
      gap={4} 
      p={4} 
      h="calc(100vh - 64px)"
      bg={useColorModeValue('gray.50', 'gray.900')}
    >
      {/* 左上容器 */}
      <GridItem w="100%" h="100%">
        <Box
          w="full"
          h="full"
          bg={bgColor}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="lg"
          p={4}
          overflow="auto"
        >
          {/* 合约地址 */}
          <Box>
            <Text mb={2} fontWeight="bold">合约地址</Text>
            <HStack>
              <Input
                value={contractAddress}
                isReadOnly={true}
                placeholder="点击生成新合约地址"
                size="sm"
              />
              <HStack>
                <Input
                  value={desiredSuffix}
                  onChange={(e) => setDesiredSuffix(e.target.value)}
                  placeholder="输入后缀(区分大小写)"
                  size="sm"
                  width="150px"
                />
                {isGenerating ? (
                  <Button
                    colorScheme="red"
                    size="sm"
                    onClick={handleCancel}
                  >
                    取消生成
                  </Button>
                ) : (
                  <Button
                    colorScheme="blue"
                    size="sm"
                    onClick={generateNewContract}
                    isLoading={isGenerating}
                  >
                    生成新地址
                  </Button>
                )}
              </HStack>
            </HStack>
          </Box>

          {/* 策略选择和底仓买入区间 */}
          <HStack spacing={4} align="flex-end" mt={4}>
            <Box flex="1">
              <Text mb={2} fontWeight="bold">策略选择</Text>
              <Select
                size="sm"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
              >
                <option value="mountain">山丘之王</option>
                <option value="random">随机仿盘</option>
              </Select>
            </Box>

            <Box flex="1">
              <Text mb={2} fontWeight="bold">底仓买入区间 (SOL)</Text>
              <HStack spacing={2}>
                <Input
                  size="sm"
                  value={minPosition}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*\.?\d{0,2}$/.test(value)) {
                      setMinPosition(value);
                    }
                  }}
                  placeholder="最小值"
                />
                <Text>-</Text>
                <Input
                  size="sm"
                  value={maxPosition}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*\.?\d{0,2}$/.test(value)) {
                      setMaxPosition(value);
                    }
                  }}
                  placeholder="最大值"
                />
              </HStack>
            </Box>
          </HStack>

          <Button 
            colorScheme="blue" 
            size="sm"
            onClick={handleStartCopy}
            isLoading={isAutoFetching}
            loadingText="监听中"
            mt={4}
            w="full"
          >
            一键仿盘
          </Button>

          <Divider my={4} />

          {/* 跑路策略 */}
          <Box>
            <Text mb={2} fontWeight="bold" color="red.500">跑路策略</Text>
            <VStack spacing={3}>
              <HStack w="full">
                <Text minW="80px">跑路比例:</Text>
                <Slider
                  value={rugPercentage}
                  onChange={setRugPercentage}
                  min={0}
                  max={100}
                  step={1}
                >
                  <SliderTrack>
                    <SliderFilledTrack bg="red.500" />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
                <Text w="60px" textAlign="right">{rugPercentage}%</Text>
              </HStack>

              <Button 
                colorScheme="red" 
                size="sm" 
                w="full"
                leftIcon={<span role="img" aria-label="warning">⚠️</span>}
              >
                一键跑路 ({rugPercentage}%)
              </Button>
            </VStack>
          </Box>
        </Box>
      </GridItem>

      {/* 右上容器 - 刷单和刷量设置 */}
      <GridItem w="100%" h="100%">
        <Box
          w="full"
          h="full"
          bg={bgColor}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="lg"
          p={4}
          overflow="auto"
        >
          {/* 刷单模式和操盘仓位设置 */}
          <HStack spacing={4} align="flex-start" mb={4}>
            {/* 左侧：刷单模式 */}
            <Box flex="1">
              <Text mb={2} fontWeight="bold">刷单模式</Text>
              <RadioGroup value={tradeMode} onChange={setTradeMode}>
                <HStack spacing={4}>
                  <Radio value="up" colorScheme="green">拉盘</Radio>
                  <Radio value="down" colorScheme="red">砸盘</Radio>
                </HStack>
              </RadioGroup>
            </Box>

            {/* 右侧：操盘仓位 */}
            <Box flex="2">
              <Text mb={2} fontWeight="bold">操盘仓位 (SOL)</Text>
              <HStack spacing={2}>
                <Input
                  size="sm"
                  value={minTradePosition}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*\.?\d{0,2}$/.test(value)) {
                      setMinTradePosition(value);
                    }
                  }}
                  placeholder="最小值"
                />
                <Text>-</Text>
                <Input
                  size="sm"
                  value={maxTradePosition}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*\.?\d{0,2}$/.test(value)) {
                      setMaxTradePosition(value);
                    }
                  }}
                  placeholder="最大值"
                />
              </HStack>
            </Box>
          </HStack>

          <Button
            colorScheme={isTrading ? 'red' : 'green'}
            size="sm"
            onClick={() => setIsTrading(!isTrading)}
            mb={4}
            w="full"
          >
            {isTrading ? '暂停执行' : '开始执行'}
          </Button>

          <Divider my={4} />

          {/* 刷量设置 */}
          <Box>
            <Text mb={2} fontWeight="bold">刷量设置</Text>
            <VStack spacing={3}>
              <HStack w="full" spacing={4}>
                <Box flex="1">
                  <Text mb={2} fontSize="sm">单笔交易量(SOL):</Text>
                  <Input
                    size="sm"
                    value={tradeAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*\.?\d{0,2}$/.test(value)) {
                        setTradeAmount(value);
                      }
                    }}
                    placeholder="输入SOL数量"
                  />
                </Box>

                <Box flex="1">
                  <Text mb={2} fontSize="sm">钱包数量:</Text>
                  <Input
                    size="sm"
                    value={walletCount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d+$/.test(value)) {
                        setWalletCount(Number(value));
                      }
                    }}
                    placeholder="输入钱包数量"
                  />
                </Box>
              </HStack>

              <Button
                w="full"
                size="sm"
                colorScheme={isVolumeTrading ? 'red' : 'blue'}
                onClick={() => setIsVolumeTrading(!isVolumeTrading)}
              >
                {isVolumeTrading ? '关闭刷量' : '开始刷量'}
              </Button>
            </VStack>
          </Box>
        </Box>
      </GridItem>

      {/* 左下日志区域 */}
      <GridItem w="100%" h="100%">
        <Box
          w="full"
          h="full"
          bg="gray.900"
          borderWidth="1px"
          borderColor="gray.700"
          borderRadius="lg"
          p={4}
          overflow="hidden"
          display="flex"
          flexDirection="column"
        >
          <Text mb={2} fontWeight="bold" color="gray.100">操作日志</Text>
          <Box
            ref={logContainerRef}
            flex="1"
            overflowY="auto"
            css={{
              '&::-webkit-scrollbar': {
                width: '4px',
              },
              '&::-webkit-scrollbar-track': {
                width: '6px',
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'gray.600',
                borderRadius: '24px',
              },
            }}
          >
            <VStack align="stretch" spacing={1}>
              {logs.slice(-8).map(log => (
                <HStack
                  key={log.id}
                  p={2}
                  bg="gray.800"
                  borderRadius="md"
                  fontSize="sm"
                  borderLeft="4px solid"
                  borderLeftColor={
                    log.type === 'error' ? 'red.500' :
                    log.type === 'warning' ? 'yellow.500' :
                    log.type === 'success' ? 'green.500' :
                    'blue.500'
                  }
                  h="32px"
                >
                  <Text color="gray.400" fontSize="xs" w="60px">
                    {log.time}
                  </Text>
                  <Text
                    color={
                      log.type === 'error' ? 'red.300' :
                      log.type === 'warning' ? 'yellow.300' :
                      log.type === 'success' ? 'green.300' :
                      'blue.300'
                    }
                    isTruncated
                  >
                    {log.message}
                  </Text>
                </HStack>
              ))}
              <div ref={logEndRef} />
            </VStack>
          </Box>
        </Box>
      </GridItem>

      {/* K线图区域 */}
      <GridItem w="100%" h="100%" colSpan={1} rowSpan={2}>
        <Box
          w="full"
          h="full"
          bg={bgColor}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="lg"
          overflow="hidden"
          position="relative"
        >
          <iframe
            id="klineFrame"
            title="K线图"
            width="100%"
            height="100%"
            src={contractAddress ? `https://www.gmgn.cc/kline/sol/${contractAddress}` : ''}
            frameBorder="0"
            style={{ 
              display: contractAddress ? 'block' : 'none',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
          />
          {!contractAddress && (
            <VStack h="full" justify="center">
              <Text color="gray.500">
                请输入合约地址查看K线图
              </Text>
            </VStack>
          )}
        </Box>
      </GridItem>
    </Grid>
  )
}