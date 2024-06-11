import fs from "fs";
import dotenv from "dotenv";
import Kafka from "node-rdkafka";

import {
  deleteOutput,
  idempotentWriteToFile,
  writeToFile,
} from "./writeToFile";

dotenv.config();

deleteOutput();

const config = {
  "bootstrap.servers": process.env.KAFKA_BOOTSTRAP_SERVERS,
  "security.protocol": "sasl_ssl" as const,
  "sasl.mechanisms": "PLAIN",
  "sasl.username": process.env.KAFKA_USERNAME,
  "sasl.password": process.env.KAFKA_PASSWORD,
  "group.id": "group" + Math.random().toString(36).substring(7),
  "session.timeout.ms": 45000,
  "enable.auto.offset.store": false,
} satisfies Kafka.ConsumerGlobalConfig;

const topic = "infinity-war";

const consumer = new Kafka.KafkaConsumer(config, {
  "auto.offset.reset": "earliest",
});

consumer.connect();

consumer.on("ready", () => {
  console.log("Consumer ready");
  consumer.subscribe([topic]);
  consumer.consume();
});

consumer.on("data", (message) => {
  try {
    if (!message.value) {
      console.error("No message");
      throw new Error("No message");
    }

    const speaker = message.key?.toString() || "Unknown";
    const line = message.value.toString();

    console.log(
      `Processing message ${message.offset}:${message.partition} from ${speaker}`,
    );

    if (message.key?.toString().match(/stark$/gim)) {
      writeToFile(speaker, line);
      return;
    }
  } catch (error) {
    console.error("Error processing message", error);
  }
});
