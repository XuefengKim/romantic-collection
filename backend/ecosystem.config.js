module.exports = {
  apps: [
    {
      name: 'romantic-backend',
      script: 'src/server.js',
      cwd: '/opt/romantic-collection/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
}
