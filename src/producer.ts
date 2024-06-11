import fs from "fs";
import dotenv from "dotenv";
import Kafka from "node-rdkafka";

dotenv.config();

const config = {
  "group.id": "node-group",
  "bootstrap.servers": process.env.KAFKA_BOOTSTRAP_SERVERS,
  "security.protocol": "sasl_ssl" as const,
  "sasl.mechanisms": "PLAIN",
  "sasl.username": process.env.KAFKA_USERNAME,
  "sasl.password": process.env.KAFKA_PASSWORD,
  "session.timeout.ms": 45000, // Best practice for higher availability in librdkafka clients prior to 1.7
  dr_cb: true, // Generate a delivery report for polling to pick up
};

const script = fs.readFileSync("./src/data/infinity-war-script.txt", "utf-8");
const lines = script.split("\n");
const topic = "infinity-war";

const producer = new Kafka.Producer(config);
producer.connect();
producer.setPollInterval(100);

producer.on("event.error", (err) => {
  console.log(`[LoadGenerator] ${err}`);
  throw err;
});

producer.on("event.log", (log) => {
  console.log(`[LoadGenerator] ${log.message}`);
});

producer.on("disconnected", () => {
  console.log("Producer disconnected");
});

producer.on("connection.failure", (err) => {
  console.log("Connection Failure", err);
});

producer.on("delivery-report", (err, report) => {
  console.log(report);
});

producer.on("ready", async () => {
  console.log("Producer ready");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || "";
    if (!line) return;
    const speaker = line.split(":")[0]?.trim() || "";
    console.log(`Producing line ${i + 1}: ${line}`);
    producer.produce(topic, null, Buffer.from(line), speaker);
  }
});
