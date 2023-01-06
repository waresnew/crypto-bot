import madge from "madge";
if (((await (madge("./dist"))).circular()).length > 0) {
    console.error("Circular Dependencies found, please double check the madge graph");
}

await madge("./dist")
    .then((res) => res.image("./dependencies.svg"));
import("./bot.js");