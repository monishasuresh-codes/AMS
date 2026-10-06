require("dotenv").config();
const os = require("os");
const app = require("./src/app");
const db = require("./src/config/database");
const { startScheduler } = require("./src/services/schedulerService");

const PORT = parseInt(process.env.PORT || "5000", 10);
const HOST = process.env.HOST || "0.0.0.0";

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

db.getConnection()
  .then((connection) => {
    console.log("MySQL connected successfully");
    connection.release();

    app.listen(PORT, HOST, () => {
      const lanIp = getLocalIp();
      console.log(`\n==================================================`);
      console.log(`🚀 AMS BACKEND SERVER RUNNING`);
      console.log(`==================================================`);
      console.log(`  ➜ Local:   http://localhost:${PORT}`);
      console.log(`  ➜ Network: http://${lanIp}:${PORT}`);
      console.log(`  ➜ Host:    ${HOST}`);
      console.log(`  ➜ Time:    ${new Date().toISOString()} (Asia/Kolkata)`);
      console.log(`==================================================\n`);

      // Initialize background lifecycle scheduler
      startScheduler();
    });
  })
  .catch((error) => {
    console.error("MySQL connection failed:", error.message);
    process.exit(1);
  });