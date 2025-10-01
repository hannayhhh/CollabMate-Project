// scripts/generateSwagger.js
const fs = require('fs');
const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');

const spec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'CollabMate API',
      version: '1.0.0',
      license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' }
    },
    servers: [{ url: process.env.API_SERVER_URL || 'http://localhost:5000' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        Task: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            status: { type: 'string', enum: ['todo','in_progress','done'] },
            userIds: { type: 'array', items: { type: 'string' } },
            teamId: { type: 'string', nullable: true }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: [
    'controllers/**/*.js',
    'routes/**/*.js',
    'models/**/*.js',
  ],
});

fs.mkdirSync(path.join(__dirname, '..', 'docs'), { recursive: true });
fs.writeFileSync(
  path.join(__dirname, '..', 'docs', 'swagger.json'),
  JSON.stringify(spec, null, 2)
);
console.log('✔ Generated docs/swagger.json');
