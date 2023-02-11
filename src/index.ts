/* Configure environment variables. */
import "dotenv/config";
/* Import constants. */
import constants from "./constants";

/* Create a logger instance. */
import { Logger, TLogLevelName } from "tslog";
export const logger: Logger = new Logger({
    name: "Laudiolin",
    displayFunctionName: false,
    minLevel: <TLogLevelName>(constants.LOG_LEVEL || "info"),
    dateTimePattern: "hour:minute:second",
    dateTimeTimezone: "America/New_York",
    displayFilePath: constants.LOGGER_DEBUG ? "hideNodeModulesOnly" : "hidden"
});

process.on("uncaughtException", (error) => logger.error("An error occurred in the application.", error));

/* Configure async apps. */
import "./engines/smart";
import "./engines/youtube";
import "./engines/ytmusic";
import "./engines/spotify";
import "./features/database";

/* Create an Express app. */
import express from "express";
import expressWs from "express-ws";

const app: any = express(); // Create the Express app.
expressWs(app); // Bind the WebSocket server to the HTTP server.

/* Configure middleware. */
import * as bodyParser from "body-parser";
app.use(bodyParser.json({ limit: "250mb" }));
import cors from "cors";
app.use(cors({ origin: "*" }));

/* Configure web features. */
app.use(require("./features/user").default);
app.use(require("./features/proxy").default);
app.use(require("./features/search").default);
app.use(require("./features/stream").default);
app.use(require("./features/social").default);
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

// Bind to the ports.
app.listen(constants.PORT, constants.BIND);
