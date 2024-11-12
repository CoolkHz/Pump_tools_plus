import {
  Box,
  Text,
  useColorModeValue,
  Button,
  HStack,
  VStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Textarea,
  useToast,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Radio,
  RadioGroup,
  Stack,
  Checkbox,
  CheckboxGroup,
  Input,
  Divider,
} from '@chakra-ui/react'
import { DeleteIcon, EditIcon, CopyIcon } from '@chakra-ui/icons'
import { useState, useEffect } from 'react'
import { saveAs } from 'file-saver'
import { Connection, PublicKey } from '@solana/web3.js'

export default function WalletManager() {
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const { isOpen, onOpen, onClose } = useDisclosure()
  const [privateKeys, setPrivateKeys] = useState('')
  const [wallets, setWallets] = useState([])
  const toast = useToast()
  const WALLET_GROUPS = ['未分组', 'Dev', '底仓', '刷单', '刷量']
  const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=b9d88906-ac34-4592-b02d-a8fa09739b4f'
  const { 
    isOpen: isImportOpen, 
    onOpen: onImportOpen, 
    onClose: onImportClose 
  } = useDisclosure()
  const {
    isOpen: isCreateOpen,
    onOpen: onCreateOpen,
    onClose: onCreateClose
  } = useDisclosure()
  const [walletCount, setWalletCount] = useState(1)
  const {
    isOpen: isTransferOpen,
    onOpen: onTransferOpen,
    onClose: onTransferClose
  } = useDisclosure()
  
  const [transferMode, setTransferMode] = useState('distribute')
  const [selectedGroups, setSelectedGroups] = useState([])
  const [transferAmount, setTransferAmount] = useState(0.1)
  const [isTransferring, setIsTransferring] = useState(false)

  // 获取钱包列表
  const fetchWallets = async () => {
    try {
      const response = await fetch('/api/wallets')
      const data = await response.json()
      setWallets(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('获取钱包列表失败:', error)
      setWallets([])
      toast({
        title: '获取钱包列表失败',
        description: error.message,
        status: 'error',
        duration: 3000,
      })
    }
  }

  // 页面加载时获取钱包列表
  useEffect(() => {
    fetchWallets()
  }, [])

  // 修改处理导入钱包函数
  const handleImport = async () => {
    try {
      const keys = privateKeys
        .split('\n')
        .map(key => key.trim())
        .filter(key => key.length > 0)

      if (keys.length === 0) {
        toast({
          title: '请输入私钥',
          status: 'warning',
          duration: 3000,
        })
        return
      }

      const response = await fetch('/api/wallets/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ privateKeys: keys }),
      })

      const data = await response.json()

      if (data.errors.length > 0) {
        // 显示详细的错误信息
        const errorDetails = data.errors.map(err => 
          `私钥: ${err.privateKey.slice(0, 4)}...${err.privateKey.slice(-4)} - ${err.error}`
        ).join('\n')

        toast({
          title: '部分钱包导入失败',
          description: `${data.message}\n\n${errorDetails}`,
          status: 'warning',
          duration: 5000,
          isClosable: true,
        })
      } else {
        toast({
          title: '导入成功',
          description: data.message,
          status: 'success',
          duration: 3000,
        })
      }

      // 刷新钱包列表
      fetchWallets()
      onClose()
      setPrivateKeys('')
    } catch (error) {
      toast({
        title: '导入失败',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  // 添加删除钱包函数
  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这个钱包吗？')) {
      try {
        await fetch(`/api/wallets/delete?id=${id}`, { method: 'DELETE' })
        toast({
          title: '删除成功',
          status: 'success',
          duration: 3000,
        })
        fetchWallets()
      } catch (error) {
        toast({
          title: '删除失败',
          description: error.message,
          status: 'error',
          duration: 3000,
        })
      }
    }
  }

  // 添加一键删除函数
  const handleDeleteAll = async () => {
    if (window.confirm('确定要删除所有钱包吗？此操作不可恢复！')) {
      try {
        await fetch('/api/wallets/delete-all', { method: 'DELETE' })
        toast({
          title: '删除成功',
          description: '所有钱包已删除',
          status: 'success',
          duration: 3000,
        })
        fetchWallets()
      } catch (error) {
        toast({
          title: '删除失败',
          description: error.message,
          status: 'error',
          duration: 3000,
        })
      }
    }
  }

  // 修改分组更新函数，添加 Dev 组限制
  const handleGroupChange = async (id, group) => {
    try {
      // 如果选择的是 Dev 组，先检查是否已有 Dev 组钱包
      if (group === 'Dev') {
        const devWallets = wallets.filter(w => w.wallet_group === 'Dev' && w.id !== id)
        if (devWallets.length > 0) {
          toast({
            title: '分组失败',
            description: 'Dev 组只能有一个钱包',
            status: 'error',
            duration: 3000,
          })
          return
        }
      }

      await fetch('/api/wallets/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, wallet_group: group })
      })
      fetchWallets()
      
      toast({
        title: '分组更新成功',
        status: 'success',
        duration: 2000,
      })
    } catch (error) {
      toast({
        title: '更新分组失败',
        description: error.message,
        status: 'error',
        duration: 3000,
      })
    }
  }

  // 添加导出功能
  const handleExport = async (group) => {
    try {
      const response = await fetch(`/api/wallets/export${group ? `?group=${group}` : ''}`)
      const blob = await response.blob()
      saveAs(blob, `wallets${group ? `-${group}` : ''}.csv`)
    } catch (error) {
      toast({
        title: '导出失败',
        description: error.message,
        status: 'error',
        duration: 3000,
      })
    }
  }

  // 修改余额自动刷新功能
  useEffect(() => {
    const updateBalances = async () => {
      if (!Array.isArray(wallets) || wallets.length === 0) return;
      
      const connection = new Connection(HELIUS_RPC)
      try {
        // 并行获取所有钱包余额
        const balancePromises = wallets.map(async (wallet) => {
          try {
            const balance = await connection.getBalance(new PublicKey(wallet.public_key))
            const solBalance = balance / 1000000000

            // 立即更新数据库
            await fetch('/api/wallets/update-balance', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                publicKey: wallet.public_key,
                balance: solBalance
              })
            })

            return {
              ...wallet,
              sol_balance: solBalance
            }
          } catch (error) {
            console.error('获取余额失败:', error)
            return wallet
          }
        })

        const updatedWallets = await Promise.all(balancePromises)
        setWallets(updatedWallets)
      } catch (error) {
        console.error('更新余额失败:', error)
      }
    }

    const interval = setInterval(updateBalances, 30000)
    // 首次加载时立即执行一次
    updateBalances()
    
    return () => clearInterval(interval)
  }, [wallets])

  // 添加创建钱包函数
  const handleCreate = async () => {
    try {
      const response = await fetch('/api/wallets/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count: walletCount }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: '创建成功',
          description: `成功创建 ${data.count} 个钱包`,
          status: 'success',
          duration: 3000,
        })
        fetchWallets()
        onCreateClose()
        setWalletCount(1)
      } else {
        throw new Error(data.message)
      }
    } catch (error) {
      toast({
        title: '创建失败',
        description: error.message,
        status: 'error',
        duration: 3000,
      })
    }
  }

  // 添加统计函数
  const getGroupStats = (group) => {
    const groupWallets = wallets.filter(w => w.wallet_group === group)
    const totalBalance = groupWallets.reduce((sum, w) => sum + w.sol_balance, 0)
    return {
      count: groupWallets.length,
      totalBalance: totalBalance.toFixed(4)
    }
  }

  // 处理批量转账
  const handleTransfer = async () => {
    if (!selectedGroups.length) {
      toast({
        title: '请选择钱包组',
        status: 'warning',
        duration: 3000,
      })
      return
    }

    try {
      setIsTransferring(true)
      
      const response = await fetch('/api/wallets/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: transferMode,
          devToGroups: transferMode === 'distribute' ? selectedGroups : null,
          fromGroup: transferMode === 'collect' ? selectedGroups : null,
          amount: transferAmount,
        }),
      })

      const data = await response.json()

      if (data.errors.length > 0) {
        const errorDetails = data.errors.map(err => 
          `钱包: ${err.wallet} - ${err.error}`
        ).join('\n')

        toast({
          title: '部分转账失败',
          description: `${data.message}\n\n${errorDetails}`,
          status: 'warning',
          duration: 5000,
          isClosable: true,
        })
      } else {
        toast({
          title: '转账成功',
          description: data.message,
          status: 'success',
          duration: 3000,
        })
      }

      onTransferClose()
      fetchWallets()
    } catch (error) {
      toast({
        title: '转账失败',
        description: error.message,
        status: 'error',
        duration: 3000,
      })
    } finally {
      setIsTransferring(false)
    }
  }

  return (
    <Box maxW="75vw" mx="auto" px={4} py={8}>
      {/* 按钮组 */}
      <HStack spacing={4} justify="center" mb={8}>
        <Button colorScheme="blue" onClick={onImportOpen}>导入钱包</Button>
        <Button colorScheme="green" onClick={onCreateOpen}>新建钱包</Button>
        <Menu>
          <MenuButton as={Button} colorScheme="purple">
            导出钱包
          </MenuButton>
          <MenuList>
            <MenuItem onClick={() => handleExport()}>导出全部</MenuItem>
            {WALLET_GROUPS.map(group => (
              <MenuItem key={group} onClick={() => handleExport(group)}>
                导出{group}组
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
        <Button colorScheme="orange" onClick={onTransferOpen}>批量转账</Button>
        <Button colorScheme="red" onClick={handleDeleteAll}>一键删除</Button>
      </HStack>

      {/* 导入钱包模态框 */}
      <Modal isOpen={isImportOpen} onClose={onImportClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>导入钱包</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={2}>请输入 Solana Base58 格式的私钥，每行一个：</Text>
            <Textarea
              value={privateKeys}
              onChange={(e) => setPrivateKeys(e.target.value)}
              placeholder="5KH..."
              rows={10}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onImportClose}>
              取消
            </Button>
            <Button colorScheme="blue" onClick={handleImport}>
              导入
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 新建钱包模态框 */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>新建钱包</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4}>请输入要创建的钱包数量（最大200个）：</Text>
            <NumberInput
              value={walletCount}
              onChange={(value) => setWalletCount(Number(value))}
              min={1}
              max={200}
              keepWithinRange={true}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCreateClose}>
              取消
            </Button>
            <Button colorScheme="green" onClick={handleCreate}>
              创建
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 批量转账模态框 */}
      <Modal isOpen={isTransferOpen} onClose={onTransferClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>批量转账</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <RadioGroup value={transferMode} onChange={setTransferMode}>
                <Stack direction="row" spacing={5}>
                  <Radio value="distribute">批量分发</Radio>
                  <Radio value="collect">批量归集</Radio>
                </Stack>
              </RadioGroup>

              {/* Dev钱包信息 */}
              <Box p={3} borderWidth={1} borderRadius="md">
                <Text fontWeight="bold">Dev钱包信息：</Text>
                <Text>余额：{getGroupStats('Dev').totalBalance} SOL</Text>
              </Box>

              {transferMode === 'distribute' ? (
                <>
                  <Text>选择接收钱包组：</Text>
                  <CheckboxGroup value={selectedGroups} onChange={setSelectedGroups}>
                    <Stack spacing={2}>
                      {WALLET_GROUPS.filter(g => g !== 'Dev' && g !== '未分组').map(group => {
                        const stats = getGroupStats(group)
                        return (
                          <Box key={group} p={2} borderWidth={1} borderRadius="md">
                            <Checkbox value={group}>
                              {group} ({stats.count}个钱包)
                            </Checkbox>
                          </Box>
                        )
                      })}
                    </Stack>
                  </CheckboxGroup>
                  <Box>
                    <Text mb={2}>每个钱包分发数量 (SOL)：</Text>
                    <Input
                      value={transferAmount}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*\.?\d*$/.test(value)) {
                          setTransferAmount(value);
                        }
                      }}
                      placeholder="输入SOL数量"
                      size="md"
                    />
                  </Box>
                  {/* 分发统计信息 */}
                  {selectedGroups.length > 0 && transferAmount && (
                    <Box p={3} bg="gray.50" borderRadius="md">
                      <Text fontWeight="bold">转账统计：</Text>
                      {selectedGroups.map(group => {
                        const stats = getGroupStats(group)
                        const groupTotal = stats.count * Number(transferAmount)
                        return (
                          <Text key={group}>
                            {group}: {stats.count}个钱包 × {transferAmount} SOL = {groupTotal.toFixed(4)} SOL
                          </Text>
                        )
                      })}
                      <Divider my={2} />
                      <Text color={
                        Number(getGroupStats('Dev').totalBalance) >= 
                        selectedGroups.reduce((sum, group) => 
                          sum + getGroupStats(group).count * Number(transferAmount), 0
                        ) ? "green.500" : "red.500"
                      }>
                        总计需要：{selectedGroups.reduce((sum, group) => 
                          sum + getGroupStats(group).count * Number(transferAmount), 0
                        ).toFixed(4)} SOL
                        {Number(getGroupStats('Dev').totalBalance) < 
                         selectedGroups.reduce((sum, group) => 
                           sum + getGroupStats(group).count * Number(transferAmount), 0
                         ) && " (Dev钱包余额不足)"}
                      </Text>
                    </Box>
                  )}
                </>
              ) : (
                <>
                  <Text>选择归集钱包组：</Text>
                  <CheckboxGroup value={selectedGroups} onChange={setSelectedGroups}>
                    <Stack spacing={2}>
                      {WALLET_GROUPS.filter(g => g !== 'Dev' && g !== '未分组').map(group => {
                        const stats = getGroupStats(group)
                        return (
                          <Box key={group} p={2} borderWidth={1} borderRadius="md">
                            <Checkbox value={group}>
                              {group} ({stats.count}个钱包, 总余额: {stats.totalBalance} SOL)
                            </Checkbox>
                          </Box>
                        )
                      })}
                    </Stack>
                  </CheckboxGroup>
                  {/* 归集统计信息 */}
                  {selectedGroups.length > 0 && (
                    <Box p={3} bg="gray.50" borderRadius="md">
                      <Text fontWeight="bold">归集统计：</Text>
                      {selectedGroups.map(group => {
                        const stats = getGroupStats(group)
                        return (
                          <Text key={group}>
                            {group}: {stats.count}个钱包, 可归集余额约 {stats.totalBalance} SOL
                          </Text>
                        )
                      })}
                      <Divider my={2} />
                      <Text color="green.500">
                        预计总归集：约 {selectedGroups.reduce((sum, group) => 
                          sum + Number(getGroupStats(group).totalBalance), 0
                        ).toFixed(4)} SOL
                        （实际金额以扣除手续费后为准）
                      </Text>
                    </Box>
                  )}
                </>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onTransferClose}>
              取消
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleTransfer}
              isLoading={isTransferring}
              loadingText="转账中"
              isDisabled={
                !selectedGroups.length || 
                (transferMode === 'distribute' && (
                  !transferAmount || 
                  Number(getGroupStats('Dev').totalBalance) < 
                  selectedGroups.reduce((sum, group) => 
                    sum + getGroupStats(group).count * Number(transferAmount), 0
                  )
                ))
              }
            >
              确认转账
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 钱包列表 */}
      <Box 
        bg={bgColor} 
        borderRadius="lg" 
        shadow="base"
        borderWidth="1px"
        borderColor={borderColor}
        overflowX="auto"
        sx={{
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: useColorModeValue('gray.100', 'gray.700'),
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: useColorModeValue('gray.300', 'gray.600'),
            borderRadius: '4px',
            '&:hover': {
              background: useColorModeValue('gray.400', 'gray.500'),
            },
          },
        }}
      >
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              <Th width="50px" minW="50px" px={2} fontSize="18px" textAlign="center">序号</Th>
              <Th width="400px" minW="400px" px={2} fontSize="18px" textAlign="center">公钥</Th>
              <Th width="280px" minW="280px" px={2} fontSize="18px" textAlign="center">私钥</Th>
              <Th width="100px" minW="100px" px={2} fontSize="18px" textAlign="center">SOL余额</Th>
              <Th width="100px" minW="100px" px={2} fontSize="18px" textAlign="center">组</Th>
              <Th width="60px" minW="60px" px={2} fontSize="18px" textAlign="center">操作</Th>
            </Tr>
          </Thead>
          <Tbody>
            {Array.isArray(wallets) && wallets.map((wallet, index) => (
              <Tr key={wallet.id}>
                <Td px={2} fontSize="18px" textAlign="center">{index + 1}</Td>
                <Td px={2}>
                  <Box display="flex" alignItems="center">
                    <Text
                      fontSize="18px"
                      fontFamily="monospace"
                      whiteSpace="nowrap"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      title={wallet.public_key}
                      flex="1"
                      mr={3}
                    >
                      {wallet.public_key}
                    </Text>
                    <IconButton
                      aria-label="复制公钥"
                      icon={<CopyIcon />}
                      size="xs"
                      variant="ghost"
                      flexShrink={0}
                      p={0}
                      minW="24px"
                      h="24px"
                      onClick={() => {
                        navigator.clipboard.writeText(wallet.public_key);
                        toast({
                          title: "已复制公钥",
                          status: "success",
                          duration: 2000,
                        });
                      }}
                    />
                  </Box>
                </Td>
                <Td px={2}>
                  <Box display="flex" alignItems="center">
                    <Text
                      fontSize="18px"
                      fontFamily="monospace"
                      whiteSpace="nowrap"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      title={wallet.private_key}
                      flex="1"
                      mr={3}
                    >
                      {`${wallet.private_key.slice(0, 24)}...${wallet.private_key.slice(-4)}`}
                    </Text>
                    <IconButton
                      aria-label="复制私钥"
                      icon={<CopyIcon />}
                      size="xs"
                      variant="ghost"
                      flexShrink={0}
                      p={0}
                      minW="24px"
                      h="24px"
                      onClick={() => {
                        navigator.clipboard.writeText(wallet.private_key);
                        toast({
                          title: "已复制私钥",
                          status: "success",
                          duration: 2000,
                        });
                      }}
                    />
                  </Box>
                </Td>
                <Td px={2} fontSize="18px" textAlign="center">{wallet.sol_balance.toFixed(4)} SOL</Td>
                <Td px={2} textAlign="center">
                  <Select
                    value={wallet.wallet_group || '未分组'}
                    onChange={(e) => handleGroupChange(wallet.id, e.target.value)}
                    size="sm"
                    fontSize="18px"
                  >
                    {WALLET_GROUPS.map(group => (
                      <option 
                        key={group} 
                        value={group}
                        disabled={group === 'Dev' && wallets.some(w => 
                          w.wallet_group === 'Dev' && w.id !== wallet.id
                        )}
                      >
                        {group}
                      </option>
                    ))}
                  </Select>
                </Td>
                <Td px={2} textAlign="center">
                  <IconButton
                    aria-label="删除钱包"
                    icon={<DeleteIcon />}
                    size="xs"
                    colorScheme="red"
                    onClick={() => handleDelete(wallet.id)}
                    p={0}
                    minW="24px"
                    h="24px"
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Box>
  )
} 