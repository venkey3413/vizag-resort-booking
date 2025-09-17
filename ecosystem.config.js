module.exports = {
  apps: [
    {
      name: 'main-server',
      script: 'server.js',
      cwd: '/home/ubuntu/vizag-resort-booking',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'admin-server', 
      script: 'admin-server.js',
      cwd: '/home/ubuntu/vizag-resort-booking',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'booking-server',
      script: 'booking-server.js', 
      cwd: '/home/ubuntu/vizag-resort-booking',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'websocket-server',
      script: 'websocket-server.js',
      cwd: '/home/ubuntu/vizag-resort-booking',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    }
  ]
};