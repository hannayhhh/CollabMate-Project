const swaggerJSDoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CollabMate API Docs",
      version: "1.2.0",
      description: "Auto-generated API documentation from routes",
    },
    servers: [{ url: process.env.API_SERVER_URL || "http://localhost:5000" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./routes/*.js"], // Automatically scan all routing files
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
