import { Keypair } from '@solana/web3.js';

const BATCH_SIZE = 10000;
let totalAttempts = 0;
let isRunning = false;

function generateBatch(suffix) {
  for (let i = 0; i < BATCH_SIZE; i++) {
    if (!isRunning) return { found: false, stopped: true };
    
    const keypair = Keypair.generate();
    const address = keypair.publicKey.toString();
    totalAttempts++;
    
    if (address.endsWith(suffix)) {
      return {
        found: true,
        keypair,
        attempts: totalAttempts
      };
    }
  }
  return { found: false, stopped: false };
}

self.onmessage = function(e) {
  const { type, suffix } = e.data;
  
  if (type === 'stop') {
    isRunning = false;
    return;
  }
  
  if (type === 'start') {
    isRunning = true;
    totalAttempts = 0;
    
    while (isRunning) {
      const result = generateBatch(suffix);
      
      if (result.stopped) {
        return;
      }
      
      if (result.found) {
        self.postMessage({
          type: 'found',
          data: {
            secretKey: Array.from(result.keypair.secretKey),
            totalAttempts: result.attempts
          }
        });
        return;
      }
      
      self.postMessage({
        type: 'progress',
        data: { attempts: BATCH_SIZE }
      });
    }
  }
}; 