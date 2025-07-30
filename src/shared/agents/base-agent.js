const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class BaseAgent {
  constructor(name, config = {}) {
    this.name = name;
    this.id = uuidv4();
    this.config = {
      serverUrl: config.serverUrl || 'ws://localhost:3100',
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      ...config
    };
    this.ws = null;
    this.isConnected = false;
    this.messageHandlers = new Map();
    this.setupDefaultHandlers();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.serverUrl);

        this.ws.on('open', () => {
          this.isConnected = true;
          console.log(`✅ Agent ${this.name} connected to server`);
          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            this.handleMessage(message);
          } catch (error) {
            console.error(`Agent ${this.name} message parse error:`, error);
          }
        });

        this.ws.on('close', () => {
          this.isConnected = false;
          console.log(`❌ Agent ${this.name} disconnected`);
          this.reconnect();
        });

        this.ws.on('error', (error) => {
          console.error(`Agent ${this.name} WebSocket error:`, error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async reconnect() {
    let retries = 0;
    while (retries < this.config.maxRetries && !this.isConnected) {
      try {
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        await this.connect();
        break;
      } catch (error) {
        retries++;
        console.log(`Agent ${this.name} reconnect attempt ${retries}/${this.config.maxRetries}`);
      }
    }
  }

  setupDefaultHandlers() {
    this.messageHandlers.set('agent_trigger', async (data) => {
      if (data.agent === this.name) {
        console.log(`🧠 Agent ${this.name} received trigger:`, data.sessionId);
        const result = await this.process(data.input);
        await this.sendResponse(data.sessionId, result);
      }
    });

    this.messageHandlers.set('memory_update', (data) => {
      console.log(`📝 Agent ${this.name} received memory update:`, data.namespace);
    });
  }

  handleMessage(message) {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message.data);
    } else {
      console.log(`Agent ${this.name} unhandled message:`, message.type);
    }
  }

  async sendMessage(type, data) {
    if (!this.isConnected || !this.ws) {
      throw new Error(`Agent ${this.name} not connected`);
    }

    const message = {
      type,
      data,
      timestamp: new Date().toISOString(),
      agentId: this.id,
      agentName: this.name
    };

    this.ws.send(JSON.stringify(message));
  }

  async sendResponse(sessionId, result) {
    await this.sendMessage('agent_response', {
      sessionId,
      result,
      agent: this.name,
      timestamp: new Date().toISOString()
    });
  }

  async readMemory(namespace, key) {
    try {
      const response = await fetch(`http://localhost:8080/memory/${namespace}/${key}`);
      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error(`Agent ${this.name} memory read error:`, error);
      return null;
    }
  }

  async writeMemory(namespace, key, data) {
    try {
      const response = await fetch(`http://localhost:8080/memory/${namespace}/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data })
      });
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error(`Agent ${this.name} memory write error:`, error);
      return false;
    }
  }

  // Abstract method to be implemented by specific agents
  async process(input) {
    throw new Error(`Agent ${this.name} must implement process() method`);
  }

  async shutdown() {
    if (this.ws) {
      this.ws.close();
    }
    console.log(`🔄 Agent ${this.name} shutdown`);
  }
}

module.exports = BaseAgent;
