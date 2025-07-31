# Google Gemini - Backend Development Tasks

## Agent Configuration
- **Provider**: Google Gemini
- **Model**: gemini-pro
- **Role**: backend-specialist
- **Assigned Tasks**: Node.js/Express API server for Todo List Application

## Primary Deliverables

### 1. Express Server (`server.js`)
**Task**: Create complete Express.js server with todo API endpoints
**Requirements**:
- RESTful API design with proper HTTP methods
- JSON request/response handling
- CORS configuration for frontend access
- Error handling middleware
- Basic request logging
- Server startup with port configuration

**API Endpoints Required**:
- `GET /api/todos` - Retrieve all todos
- `POST /api/todos` - Create new todo
- `PUT /api/todos/:id` - Update todo (toggle completion)
- `DELETE /api/todos/:id` - Delete todo
- `GET /health` - Health check endpoint

**Success Criteria**:
- Server starts without errors
- All endpoints respond with correct HTTP status codes
- Proper JSON request/response handling
- CORS enabled for frontend integration
- Clean error handling and logging

**Expected Output**: Complete Express server ready for frontend integration

### 2. Package Configuration (`package.json`)
**Task**: Create Node.js package configuration with dependencies
**Requirements**:
- Express.js and necessary middleware dependencies
- Development dependencies for testing
- NPM scripts for server operations
- Proper project metadata and version info

**Required Dependencies**:
- express (web framework)
- cors (cross-origin resource sharing)
- uuid (unique ID generation)
- fs-extra or built-in fs (file operations)

**NPM Scripts Required**:
- `start` - Production server start
- `dev` - Development server with auto-restart
- `test` - Run test suite

**Success Criteria**:
- Valid package.json structure
- All dependencies properly specified
- Scripts work correctly
- Proper semantic versioning

**Expected Output**: Complete package.json for Node.js project

### 3. Data Persistence (`todos.json` + persistence logic)
**Task**: Implement JSON file-based data storage for todos
**Requirements**:
- Read/write operations for JSON file storage
- Atomic file operations to prevent data corruption
- Default empty todos array initialization
- Proper error handling for file operations
- Thread-safe file access

**Data Structure**:
```json
[
  {
    "id": "unique_uuid",
    "text": "Todo item description",
    "completed": false,
    "createdAt": "2025-07-31T10:00:00.000Z"
  }
]
```

**Success Criteria**:
- Reliable data persistence across server restarts
- Atomic read/write operations
- Proper JSON validation and error handling
- Efficient file I/O operations

**Expected Output**: Robust file-based storage system

### 4. API Tests (`api-tests.js`)
**Task**: Create comprehensive API endpoint tests
**Requirements**:
- Test all CRUD operations
- Test error scenarios and edge cases
- Test data validation and constraints
- Test concurrent access scenarios
- Use Node.js built-in test capabilities or simple assertions

**Test Coverage Required**:
- GET /api/todos (empty and populated states)
- POST /api/todos (valid and invalid data)
- PUT /api/todos/:id (existing and non-existing IDs)
- DELETE /api/todos/:id (existing and non-existing IDs)
- Error handling and HTTP status codes

**Success Criteria**:
- Comprehensive test coverage of all endpoints
- Tests run reliably and independently
- Clear test descriptions and assertions
- Performance and concurrent access validation

**Expected Output**: Complete test suite for backend API

## Technical Specifications

### API Response Formats

**Success Responses**:
```json
{
  "success": true,
  "data": [...todos...],
  "message": "Operation completed successfully"
}
```

**Error Responses**:
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE"
}
```

### HTTP Status Codes
- `200` - OK (successful GET, PUT)
- `201` - Created (successful POST)
- `204` - No Content (successful DELETE)
- `400` - Bad Request (invalid data)
- `404` - Not Found (todo not found)
- `500` - Internal Server Error (server issues)

### Data Validation Rules
- Todo text: Required, non-empty string, max 500 characters
- Completed: Boolean value (default: false)
- ID: Auto-generated UUID v4
- CreatedAt: Auto-generated ISO timestamp

### Performance Requirements
- Response time < 100ms for typical operations
- Handle concurrent requests safely
- Efficient file I/O with minimal blocking
- Memory-efficient JSON operations

## Quality Metrics & Validation

### Code Quality Standards
- Clean, well-structured Express.js code
- Proper async/await error handling
- Consistent naming conventions
- Comprehensive error messages and logging

### API Functionality Testing
- All endpoints work as specified
- Proper HTTP status codes returned
- Data validation enforced correctly
- Error scenarios handled gracefully

### Performance Standards
- Fast API response times
- Reliable data persistence
- Safe concurrent access handling
- Memory-efficient operations

## Integration Points

### With Frontend (OpenAI Agent)
- API must match frontend's expected interface
- CORS configuration for frontend domain
- Consistent data format and error handling
- Support for frontend's error handling needs

### With QA Testing (GPT-3.5 Agent)
- Provide testable, debuggable API endpoints
- Clear error messages for testing scenarios
- Support for automated testing tools
- Comprehensive test coverage documentation

## Expected Challenges & Solutions

### Challenge 1: File-based Concurrency
**Solution**: Implement proper file locking or atomic operations for JSON persistence

### Challenge 2: Cross-Provider API Compatibility
**Solution**: Follow REST API standards and provide clear API documentation

### Challenge 3: Error Handling Consistency
**Solution**: Create standardized error response format and comprehensive error scenarios

## File Structure
```
gemini-backend/
├── server.js          # Main Express server
├── package.json       # Node.js configuration
├── todos.json         # Data storage file
├── api-tests.js       # Backend test suite
└── README.md          # Backend documentation
```

## Server Configuration

### Environment Variables
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `CORS_ORIGIN` - Allowed frontend origins

### Default Configuration
```javascript
const config = {
  port: process.env.PORT || 3001,
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  },
  dataFile: './todos.json'
};
```

## Success Validation

### Functional Requirements
- [ ] All API endpoints work correctly
- [ ] Data persists across server restarts
- [ ] Proper error handling and status codes
- [ ] CORS configured for frontend access

### Technical Requirements
- [ ] Clean, maintainable Express.js code
- [ ] Atomic file operations for data safety
- [ ] Comprehensive API test coverage
- [ ] Performance meets response time requirements

### Integration Requirements
- [ ] API matches frontend expectations
- [ ] Error responses support frontend error handling
- [ ] Data format consistency maintained
- [ ] Ready for integration testing by QA agent

This backend development assignment leverages Gemini's strengths in server-side logic, API design, and robust data handling while ensuring compatibility with the multi-provider architecture.