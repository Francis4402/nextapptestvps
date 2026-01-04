module.exports = {
  apps: [
    {
      name: "nextjs-app",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "/var/www/nextapptestvps",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/var/www/nextapptestvps/logs/err.log",
      out_file: "/var/www/nextapptestvps/logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      watch: false,
      max_memory_restart: "512M",
    },
  ],
};

