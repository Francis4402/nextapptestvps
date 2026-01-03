module.exports = {
  apps: [{
    name: 'nextjs-app',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    watch: ['public'],
    watch_options: {
      followSymlinks: false,
      usePolling: true,
    },
    ignore_watch: ['node_modules', '.next'],
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
  }],
}