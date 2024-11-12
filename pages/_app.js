import { ChakraProvider } from '@chakra-ui/react'
import Navigation from '../components/Navigation'

function MyApp({ Component, pageProps }) {
  return (
    <ChakraProvider>
      <Navigation />
      <Component {...pageProps} />
    </ChakraProvider>
  )
}

export default MyApp 