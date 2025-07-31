const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class TodoServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    this.dataFile = path.join(__dirname, 'todos.json');
    this.todos = [];
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true
    }));

    this.app.use(express.json({ limit: '10mb' }));
    
    this.app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });

    this.app.use((err, req, res, next) => {
      console.error('Server error:', err.message);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'SERVER_ERROR'
      });
    });
  }

  setupRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    this.app.get('/api/todos', async (req, res) => {
      try {
        await this.loadTodos();
        res.json({
          success: true,
          data: this.todos,
          message: 'Todos retrieved successfully'
        });
      } catch (error) {
        console.error('Failed to get todos:', error.message);
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve todos',
          code: 'GET_TODOS_ERROR'
        });
      }
    });

    this.app.post('/api/todos', async (req, res) => {
      try {
        const { text } = req.body;

        if (!text || typeof text !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'Todo text is required and must be a string',
            code: 'INVALID_TEXT'
          });
        }

        if (text.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Todo text cannot be empty',
            code: 'EMPTY_TEXT'
          });
        }

        if (text.length > 500) {
          return res.status(400).json({
            success: false,
            error: 'Todo text cannot exceed 500 characters',
            code: 'TEXT_TOO_LONG'
          });
        }

        const newTodo = {
          id: uuidv4(),
          text: text.trim(),
          completed: false,
          createdAt: new Date().toISOString()
        };

        await this.loadTodos();
        this.todos.push(newTodo);
        await this.saveTodos();

        res.status(201).json({
          success: true,
          data: newTodo,
          message: 'Todo created successfully'
        });

        console.log(`✅ Created todo: ${newTodo.id}`);
      } catch (error) {
        console.error('Failed to create todo:', error.message);
        res.status(500).json({
          success: false,
          error: 'Failed to create todo',
          code: 'CREATE_TODO_ERROR'
        });
      }
    });

    this.app.put('/api/todos/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const { completed, text } = req.body;

        await this.loadTodos();
        const todoIndex = this.todos.findIndex(t => t.id === id);

        if (todoIndex === -1) {
          return res.status(404).json({
            success: false,
            error: 'Todo not found',
            code: 'TODO_NOT_FOUND'
          });
        }

        const todo = this.todos[todoIndex];
        
        if (typeof completed === 'boolean') {
          todo.completed = completed;
        }
        
        if (typeof text === 'string' && text.trim().length > 0) {
          if (text.length > 500) {
            return res.status(400).json({
              success: false,
              error: 'Todo text cannot exceed 500 characters',
              code: 'TEXT_TOO_LONG'
            });
          }
          todo.text = text.trim();
        }

        todo.updatedAt = new Date().toISOString();
        await this.saveTodos();

        res.json({
          success: true,
          data: todo,
          message: 'Todo updated successfully'
        });

        console.log(`✅ Updated todo: ${id}`);
      } catch (error) {
        console.error('Failed to update todo:', error.message);
        res.status(500).json({
          success: false,
          error: 'Failed to update todo',
          code: 'UPDATE_TODO_ERROR'
        });
      }
    });

    this.app.delete('/api/todos/:id', async (req, res) => {
      try {
        const { id } = req.params;

        await this.loadTodos();
        const todoIndex = this.todos.findIndex(t => t.id === id);

        if (todoIndex === -1) {
          return res.status(404).json({
            success: false,
            error: 'Todo not found',
            code: 'TODO_NOT_FOUND'
          });
        }

        const deletedTodo = this.todos.splice(todoIndex, 1)[0];
        await this.saveTodos();

        res.status(204).send();
        console.log(`✅ Deleted todo: ${id}`);
      } catch (error) {
        console.error('Failed to delete todo:', error.message);
        res.status(500).json({
          success: false,
          error: 'Failed to delete todo',
          code: 'DELETE_TODO_ERROR'
        });
      }
    });

    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        code: 'NOT_FOUND'
      });
    });
  }

  async loadTodos() {
    try {
      const data = await fs.readFile(this.dataFile, 'utf8');
      this.todos = JSON.parse(data);
      
      if (!Array.isArray(this.todos)) {
        throw new Error('Invalid todos data structure');
      }
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.todos = [];
        await this.saveTodos();
      } else {
        console.error('Failed to load todos:', error.message);
        throw error;
      }
    }
  }

  async saveTodos() {
    try {
      const tempFile = this.dataFile + '.tmp';
      const data = JSON.stringify(this.todos, null, 2);
      
      await fs.writeFile(tempFile, data, 'utf8');
      await fs.rename(tempFile, this.dataFile);
      
    } catch (error) {
      console.error('Failed to save todos:', error.message);
      throw error;
    }
  }

  async start() {
    try {
      await this.loadTodos();
      
      this.server = this.app.listen(this.port, () => {
        console.log(`🚀 Todo API Server running on port ${this.port}`);
        console.log(`📁 Data file: ${this.dataFile}`);
        console.log(`🌐 Health check: http://localhost:${this.port}/health`);
        console.log(`📋 API endpoint: http://localhost:${this.port}/api/todos`);
      });

      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down server...');
        this.server.close(() => {
          console.log('✅ Server shut down gracefully');
          process.exit(0);
        });
      });

    } catch (error) {
      console.error('❌ Failed to start server:', error.message);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const server = new TodoServer();
  server.start();
}

module.exports = TodoServer;