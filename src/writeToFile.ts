import fs from "fs";

export const writeToFile = (
  speaker: string,
  line: string,
  extension = "txt",
  initialText = "",
) => {
  if (!fs.existsSync(`./out/${speaker}.${extension}`)) {
    fs.writeFileSync(`./out/${speaker}.${extension}`, initialText);
  }
  fs.appendFileSync(`./out/${speaker}.${extension}`, `${line}\n`);
};
export const idempotentWriteToFile = (
  speaker: string,
  line: string,
  offset: number,
  extension = "txt",
  initialText = "",
) => {
  if (!fs.existsSync(`./out/${speaker}.${extension}`)) {
    fs.writeFileSync(`./out/${speaker}.${extension}`, "");
  }
  const text = fs.readFileSync(`./out/${speaker}.${extension}`, "utf-8");
  const _line = `${offset}: ${line}`;
  if (!text.includes(_line)) {
    console.log("Writing to file", speaker, _line);
    fs.appendFileSync(`./out/${speaker}.${extension}`, `${_line}\n`);
  }
};

export const deleteOutput = () => {
  // delete all files in the data folder execpt the script
  fs.readdirSync("./out").forEach((file) => {
    fs.unlinkSync(`./out/${file}`);
  });
};
