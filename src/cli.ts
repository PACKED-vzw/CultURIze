/**
 * @file This file contains the cli part of the application.
 */
import { app } from "electron";
import { convertCSVtoWebConfig } from "./main/Converter/Converter";
import fs = require("fs");
const log = require("electron-log");

function parseCLIArgs(cliargs: any) {
  log.info(cliargs);
  log.info("parse");
  const args = require("yargs")
      .option("n", {
          alias: "nginx",
          type: "boolean",
          default: false})
      .option("a", {
          alias: "apache",
          type: "boolean",
          default: false})
      .option("csv", {
          type: "string",
          nargs: 1,
          demand: true})
      .parse(cliargs)
      .argv;

      // .option("t", {
      //    alias: "auto-add",
      //    type: "boolean",
      //    default: false})

  log.info("parse done?");
  log.info(args);
  if (args.nginx === true && args.apache === true ||
      args.nginx === false && args.apache === false) {
    log.error("choose one: apache or nginx");
    app.exit(1);
  }

  return args;
}

export async function mainCLI(argv: any) {
  log.info("maincli");
  const args = parseCLIArgs(argv);
  const response = await convertCSVtoWebConfig(args.csv, args.apache);
  log.info("Conversion result: " + response.file.length + " characters in the configuration, generated from "
            + response.numLinesAccepted + " rows (" + response.numLinesRejected + ")");
  let filename = "";
  if (args.apache) {
      filename = ".htaccess";
  } else {
      filename = "nginx_redirect.conf";
  }
  fs.writeFileSync(filename, response.file);

  log.info("written redirect rules for " + (args.apache ? "apache" : "nginx") + " to " + filename);
  app.exit(0);
}
