#!/usr/bin/env node
const jscodeshiftExecutable = require.resolve(".bin/jscodeshift");
const path = require("path");
const execa = require("execa");
const chalk = require("chalk");

const isSafeModeEnabled = process.argv.find((arg) => arg === "--safe");
const cleanedArgs = process.argv.filter(
    (arg, index) => arg !== "--safe" && index > 1
);

try {
    const args = [
        isSafeModeEnabled && "--safe",
        "-t",
        path.resolve(__dirname, "../index.js"),
        ...cleanedArgs,
    ];
    execa(jscodeshiftExecutable, args, { stdio: "inherit" });
} catch (error) {
    console.log(chalk.red(error));
}
