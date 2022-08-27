/* Configure environment variables. */
import "dotenv/config";
/* Import constants. */
import constants from "./constants";

/* Create a logger instance. */
import {Logger, TLogLevelName} from "tslog";
export const logger: Logger = new Logger({
    name: "Laudiolin", displayFunctionName: false,
    minLevel: <TLogLevelName> (constants.LOG_LEVEL || "info"),
    dateTimePattern: "hour:minute:second", dateTimeTimezone: "America/New_York",
    displayFilePath: constants.LOGGER_DEBUG ? "hideNodeModulesOnly" : "hidden"
});

/* Configure async apps. */
import "./engines/youtube";
import "./engines/spotify";

/* Create an Express app. */
import express, {Express} from "express";
const app: Express = express();

/* Configure middleware. */
import * as bodyParser from "body-parser";
app.use(bodyParser.json({limit: "250mb"}));

/* Configure web features. */
app.use(require("./features/search").default);
// app.use(require("./features/stream").default);

/* Configure the HTTP server. */
import {createServer, Server} from "node:http";
const server: Server = createServer(app);

// Bind to the specified port.
server.listen(constants.PORT, constants.BIND);

setTimeout(() => {
    require("./engines/youtube").search("hikaru nara");
}, 1000);