module.exports = {
  apps: [
    {
      name: "shipyard-api",
      script: "dist/index.js",
      env: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: 8031,
      },
    },
  ],
};
