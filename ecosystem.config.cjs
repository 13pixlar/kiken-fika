/** PM2 — production on 13pixlar.se (`/var/www/kiken-fika`). PORT lives in `.env`. */
module.exports = {
  apps: [
    {
      name: "kiken-fika",
      cwd: "/var/www/kiken-fika",
      script: "npm",
      args: "start",
      interpreter: "none",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3002",
      },
    },
  ],
};
