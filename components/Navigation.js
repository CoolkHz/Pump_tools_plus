import { Box, Flex, Link } from '@chakra-ui/react'
import NextLink from 'next/link'

export default function Navigation() {
  return (
    <Box bg="gray.800" py={4}>
      <Flex maxW="7xl" mx="auto" px={4} gap={6}>
        <NextLink href="/pump-fun" passHref legacyBehavior>
          <Link color="white">PumpFun</Link>
        </NextLink>
        <NextLink href="/wallet-manager" passHref legacyBehavior>
          <Link color="white">钱包管理</Link>
        </NextLink>
      </Flex>
    </Box>
  )
} 