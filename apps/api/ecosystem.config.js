module.exports = {
  apps: [
    {
      name: "shipyard-api",
      script: "dist/index.js",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};
