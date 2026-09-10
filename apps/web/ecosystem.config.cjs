module.exports = {
  apps: [
    {
      name: "shipyard-web",
      cwd: __dirname,
      script: "node_modules/.bin/next",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3081,
      },
    },
  ],
};
