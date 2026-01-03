module.exports = {
  apps: [{
    name: 'nextcrud',
    script: 'node_modules/.bin/next',
    args: 'start',
        cwd: './',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      NEXTAUTH_URL: 'http://161.248.189.254',
      BASE_URL: 'http://161.248.189.254',
      AUTH_SECRET: 'AlrOXky/cWk6Upv4shZCR/xXZQ8eghMk01Tzo/9knk4=',
      DATABASE_URL: 'postgres://francism:456123@localhost:5432/nextcrud?schema=public'
    }
  }]
}
