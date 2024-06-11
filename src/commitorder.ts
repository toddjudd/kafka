import fs from "fs";
import dotenv from "dotenv";
import Kafka from "node-rdkafka";

import {
  deleteOutput,
  idempotentWriteToFile,
  writeToFile,
} from "./writeToFile";

dotenv.config();

const config = {
  "bootstrap.servers": process.env.KAFKA_BOOTSTRAP_SERVERS,
  "security.protocol": "sasl_ssl" as const,
  "sasl.mechanisms": "PLAIN",
  "sasl.username": process.env.KAFKA_USERNAME,
  "sasl.password": process.env.KAFKA_PASSWORD,
  "group.id": "comit-group2",
  "session.timeout.ms": 20 * 1000,
  "enable.auto.offset.store": false,
} satisfies Kafka.ConsumerGlobalConfig;

const topic = "infinity-war";

const consumer = new Kafka.KafkaConsumer(config, {
  "auto.offset.reset": "earliest",
});

const CustomError = class CustomError extends Error {
  offset: number;
  partition: number;
  constructor(message: string, offset: number, partition: number) {
    super(message);
    this.name = "CustomError";
    this.offset = offset;
    this.partition = partition;
  }
};

consumer.connect();

consumer.on("ready", () => {
  console.log("Consumer ready");
  consumer.subscribe([topic]);
  consumer.consume();
});

consumer.on("data", (message) => {
  try {
    if (message.offset % 50 === 0) {
      console.log("Committing offset");
      consumer.commit();
    }

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
      if (message.offset === 300) {
        throw new CustomError(
          "Offset too high",
          message.offset,
          message.partition,
        );
      }
      idempotentWriteToFile(speaker, line, message.offset);
      return;
    }

    consumer.offsetsStore([
      { topic, partition: message.partition, offset: message.offset },
    ]);
  } catch (error) {
    console.error("Error processing message", error);
    if (error instanceof CustomError) {
      console.error("Custom error", error);
      throw error;
    }
  }
});
