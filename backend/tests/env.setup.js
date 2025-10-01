process.env.NODE_ENV = 'test';

// Set defaults only if they are not provided in advance
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-secret';
if (!process.env.CORS_ORIGIN) process.env.CORS_ORIGIN = 'http://localhost';
if (!process.env.API_SERVER_URL) process.env.API_SERVER_URL = 'http://localhost';
if (!process.env.FRONTEND_URL) process.env.FRONTEND_URL = 'http://localhost';

// Third-party parameters
process.env.GITLAB_CLIENT_ID = process.env.GITLAB_CLIENT_ID || 'test-client-id';
process.env.GITLAB_CLIENT_SECRET = process.env.GITLAB_CLIENT_SECRET || 'test-client-secret';
process.env.GITLAB_REDIRECT_URI = process.env.GITLAB_REDIRECT_URI || 'http://localhost/gitlab/callback';
process.env.GITLAB_OAUTH_URL = process.env.GITLAB_OAUTH_URL || 'https://gitlab.com/oauth/authorize';
process.env.GITLAB_API_URL = process.env.GITLAB_API_URL || 'https://gitlab.com/api/v4';

