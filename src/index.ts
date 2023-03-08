/* istanbul ignore file */
import dotenv from "dotenv";
import Sentry from "@sentry/node";

dotenv.config({path: `./data/${process.env["NODE_ENV"]}.env`});
Sentry.init({
    dsn: process.env["SENTRY_DSN"],
    tracesSampleRate: 1.0
});
import("./bot");