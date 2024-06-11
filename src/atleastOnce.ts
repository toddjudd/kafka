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

// new error class
const PepperError = class PepperError extends Error {
  offset: number;
  partition: number;
  constructor(message: string, offset: number, partition: number) {
    super(message);
    this.name = "PepperError";
    this.offset = offset;
    this.partition = partition;
  }
};

let apiOutageCouter = 0;
let apiOutage = false;
// must store per partition
let minOffset = -1;

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

consumer.on("data", async (message) => {
  try {
    if (!message.value) {
      console.error("No message");
      throw new Error("No message");
    }

    const speaker = message.key?.toString() || "Unknown";
    const line = message.value.toString();

    if (message.key?.toString().match(/stark$/gim)) {
      // idempotent write to capture all messages once
      idempotentWriteToFile(
        speaker + "_idempotent_no_outage",
        line,
        message.offset,
      );
      // non idempotent write to capture retry history
      writeToFile(
        speaker,
        `${apiOutage},${apiOutageCouter},${minOffset},${message.offset},${line}`,
        "csv",
        "apiOutage,apiOutageCounter,minOffset,offset,line\n",
      );
      // simulate api outage
      apiOutageCouter++;
      if (apiOutageCouter > 100 && apiOutageCouter < 200) {
        throw new PepperError("API Outage", message.offset, message.partition);
      }
      // idempotent write after api outage to capture all messages once
      idempotentWriteToFile(speaker + "_idempotent", line, message.offset);
      if (apiOutage) {
        apiOutage = false;
      } else {
        minOffset = message.offset;
      }
      return;
    }
  } catch (error) {
    console.error(error);
    if (error instanceof PepperError) {
      console.log("Pepper error", error.offset, error.partition);
      apiOutage = true;
      consumer.seek(
        {
          topic,
          partition: message.partition,
          offset: minOffset,
        },
        0,
        (error) => {
          if (error) {
            console.error("Error seeking", error);
          }
        },
      );
    }
  }
});
