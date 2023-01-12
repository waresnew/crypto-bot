import madge from "madge";

if ((await madge("./")).circular().length > 0) {
    console.error("Circular Dependencies found, please double check the madge graph");
}
await madge("./")
    .then(res => res.image("./dependencies.svg"));
console.log("Starting... (if it freezes here then there might be a circular dependency caused by dynamic imports");

import("./bot.js");