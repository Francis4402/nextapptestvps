// ecosystem.config.js - Accepts command line arguments
const path = require('path');

// Get arguments from command line
const args = process.argv.slice(2);
const port = args.includes('--port') 
  ? args[args.indexOf('--port') + 1] 
  : 3000;

module.exports = {
  apps: [
    {
      name: 'nextjs-app',
      script: 'next',
      args: `start -p ${port}`,
      cwd: __dirname, // Directory where ecosystem.config.js is located
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: port,
        HOST: '0.0.0.0',
      },
      // Use absolute paths for logs
      error_file: path.join(__dirname, 'logs/err.log'),
      out_file: path.join(__dirname, 'logs/out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm Z',
    },
  ],
};