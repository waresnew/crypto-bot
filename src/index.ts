/* istanbul ignore file */
import dotenv from "dotenv";

dotenv.config({path: `./data/${process.env["NODE_ENV"]}.env`});
import("./bot");