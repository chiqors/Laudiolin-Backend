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

process.on("uncaughtException", error =>
    logger.error("An error occurred in the application.", error));

/* Configure async apps. */
import "./engines/youtube";
import "./engines/ytmusic";
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
import cors from "cors";
app.use(cors({origin: "*"}));

/* Configure web features. */
app.use(require("./features/user").default);
app.use(require("./features/search").default);
app.use(require("./features/stream").default);
app.use(require("./features/discord").default);
app.use(require("./features/playlist").default);
/* Configure websocket features. */
app.ws("/", require("./features/gateway").default);
/* Configure static routing. */
app.use(express.static(`${__dirname}/public`));
/* Configure views. */
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");
app.set("views", `${__dirname}/public`);

/* Configure the HTTP server. */
const server = constants.CREATE_SERVER(constants.PORT, app);

// Bind to the ports.
server.listen(constants.PORT, constants.BIND);
webSocketServer.listen(constants.SOCKET_PORT, constants.BIND_SOCKET);