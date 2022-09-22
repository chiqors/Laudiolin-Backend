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

process.on("uncaughtException", logger.error);

/* Configure async apps. */
import "./engines/youtube";
import "./engines/spotify";
import "./features/database";

/* Configure the WebSocket server. */
const webSocketServer = constants.CREATE_SERVER(constants.SOCKET_PORT);

/* Create an Express app. */
import express from "express";
import expressWs from "express-ws";
const app: expressWs.Application
    = expressWs(express(), webSocketServer).app;

/* Configure middleware. */
import * as bodyParser from "body-parser";
app.use(bodyParser.json({limit: "250mb"}));

/* Configure web features. */
app.use(require("./features/search").default);
app.use(require("./features/stream").default);
app.use(require("./features/playlist").default);
/* Configure websocket features. */
app.ws("/", require("./features/gateway").default);

/* Configure the HTTP server. */
const server = constants.CREATE_SERVER(constants.PORT, app);

// Bind to the ports.
server.listen(constants.PORT, constants.BIND);
webSocketServer.listen(constants.SOCKET_PORT, constants.BIND_SOCKET);