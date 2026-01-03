module.exports = {
<<<<<<< Updated upstream
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
=======
    apps: [{
        name: "nextcrud",
        script: "npm",
        args: "start",
        env: {
            NODE_ENV: "production",
            HOST: "0.0.0.0",  // CRITICAL: Listen on all interfaces
            PORT: 3000
        }
    }]
}
>>>>>>> Stashed changes
