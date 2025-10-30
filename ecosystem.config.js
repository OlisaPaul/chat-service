module.exports = {
  apps: [
    {
      name: 'chat-abuja-fmp-staging',
      instances: 1,
      exec_mode: 'fork',
      script: 'npm',
      autorestart: true,
      args: 'run start',
    },
  ],
};
