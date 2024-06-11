import subProcess from "child_process";
import fs from "fs";

const validatFiles = () => {
  // compare output with the data
  fs.readdirSync("./out").forEach((file) => {
    console.log("file", file);
    if (file.match(/_idempotent.txt$/gim)) {
      console.log("Checking file", file);
      const text = fs.readFileSync(`./out/${file}`, "utf-8");
      const dataFileName = file.split("_")[0] + "_idempotent_no_outage.txt";
      const data = fs.readFileSync(`./out/${dataFileName}`, "utf-8");
      if (text !== data) {
        console.error("❌ Data mismatch", file);
        console.log(
          `Run diff --color=auto --width=120 -y "./out/${file}" "./out/${dataFileName}" to see the difference`,
        );
      } else {
        console.log("✔️ Data match", file);
      }
    }
  });

  // ls all files using the shell
};

validatFiles();
