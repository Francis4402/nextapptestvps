module.exports = {
    apps: [{
        name: "nextcrud",
        script: "npm",
        args: "run start",
	cwd: "/root/nextapptestvps",
	autorestart: true,
        env: {
            NODE_ENV: "production",
            HOST: "0.0.0.0",  // CRITICAL: Listen on all interfaces
            PORT: 3000
        }
    }]
}
