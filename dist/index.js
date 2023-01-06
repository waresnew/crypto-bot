import madge from "madge";
if (((await (madge("./dist"))).circular()).length > 0) {
    console.error("Circular Dependencies found, please double check the madge graph");
}
console.log("Starting... (if it freezes here then there might be a circular dependency caused by dynamic imports");
await madge("./dist")
    .then((res) => res.image("./dependencies.svg"));
import("./bot.js");
//# sourceMappingURL=index.js.map