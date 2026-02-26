const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Library Microservice API',
      version: '1.0.0',
      description: 'API REST de gestion de bibliothèque numérique — CRUD livres, emprunts, authentification JWT',
    },
    servers: [
      { url: process.env.SWAGGER_SERVER_URL || `http://localhost:${process.env.PORT || 3000}`, description: 'Local' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Book: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'Clean Code' },
            author: { type: 'string', example: 'Robert C. Martin' },
            isbn: { type: 'string', example: '9780132350884' },
            description: { type: 'string', example: 'A Handbook of Agile Software Craftsmanship' },
            total_copies: { type: 'integer', example: 3 },
            available_copies: { type: 'integer', example: 2 },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        Loan: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            book_id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            borrowed_at: { type: 'string', format: 'date-time' },
            due_date: { type: 'string', format: 'date-time' },
            returned_at: { type: 'string', format: 'date-time', nullable: true },
            status: { type: 'string', enum: ['ACTIVE', 'RETURNED', 'OVERDUE'] },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string', example: 'johndoe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            role: { type: 'string', enum: ['user', 'admin'] },
          },
        },
        ApiResponse: {
          type: 'object',
          properties: {
            status: { type: 'integer', example: 200 },
            message: { type: 'string', example: 'Success' },
            data: { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            status: { type: 'integer', example: 400 },
            message: { type: 'string', example: 'Validation error' },
            data: { type: 'object', nullable: true },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

module.exports = swaggerJsdoc(options);
