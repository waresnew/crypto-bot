/* istanbul ignore file */
import dotenv from "dotenv";
import Sentry from "@sentry/node";
import BigNumber from "bignumber.js";

BigNumber.config({
    EXPONENTIAL_AT: [-20, 20]
});
dotenv.config({path: `./data/${process.env["NODE_ENV"]}.env`});
if (process.env["NODE_ENV"] == "production") {
    Sentry.init({
        dsn: process.env["SENTRY_DSN"],
        tracesSampleRate: 1.0
    });
}
import("./bot");