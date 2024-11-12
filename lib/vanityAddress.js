import { Keypair } from '@solana/web3.js';

export class VanityAddressGenerator {
  constructor(addLog) {
    this.addLog = addLog || console.log;
    this.workers = [];
    this.isRunning = false;
  }

  stopWorkers() {
    this.isRunning = false;
    this.workers.forEach(worker => {
      worker.postMessage({ type: 'stop' });
      worker.terminate();
    });
    this.workers = [];
    this.addLog('已停止地址生成', 'info');
  }

  createWorker(suffix, resolve, reject, onProgress) {
    const worker = new Worker(new URL('./vanityWorker.js', import.meta.url));
    let workerAttempts = 0;
    
    worker.onmessage = (e) => {
      if (!this.isRunning) return;

      const { type, data } = e.data;
      
      if (type === 'found') {
        this.stopWorkers();
        const keypair = Keypair.fromSecretKey(new Uint8Array(data.secretKey));
        resolve({ keypair, attempts: data.totalAttempts });
      } else if (type === 'progress') {
        workerAttempts += data.attempts;
        onProgress?.(workerAttempts);
      }
    };

    worker.onerror = (error) => {
      if (!this.isRunning) return;
      
      this.addLog(`Worker错误: ${error.message}`, 'error');
      worker.terminate();
      this.workers = this.workers.filter(w => w !== worker);
      if (this.workers.length === 0) {
        reject(error);
      }
    };

    worker.postMessage({ type: 'start', suffix });
    return worker;
  }

  async generateEndsWith(suffix, onProgress) {
    return new Promise((resolve, reject) => {
      try {
        if (this.isRunning) {
          this.stopWorkers();
          reject(new Error('已取消生成'));
          return;
        }

        this.isRunning = true;
        const workerCount = Math.min(6, navigator.hardwareConcurrency || 4);
        this.addLog(`启动 ${workerCount} 个计算线程`, 'info');

        for (let i = 0; i < workerCount; i++) {
          const worker = this.createWorker(
            suffix,
            resolve,
            reject,
            onProgress
          );
          this.workers.push(worker);
        }
      } catch (error) {
        this.stopWorkers();
        reject(error);
      }
    });
  }
} 