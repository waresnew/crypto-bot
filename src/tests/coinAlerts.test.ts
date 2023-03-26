import {db, genSqlInsertCommand} from "../database";
import {UserSetting} from "../structs/usersettings";
import {updateCmc} from "../services/cmcApi";
import {btcEthApiData, mockDiscordRequest} from "./testSetup";
import {streamToString} from "../utils";
import nock from "nock";

describe("Tests coin alerts", () => {
    it("alerts user when coin price is below threshold", async () => {
        await genSqlInsertCommand({
            id: "123",
            type: "ALERT",
            alertToken: 1,
            alertStat: "price",
            alertThreshold: 100,
            alertDirection: ">",
            alertDisabled: 0
        }, "user_settings", new UserSetting());
        expect(((await db.get("select * from user_settings where alertToken = 1")) as UserSetting).id).toBe("123");
        nock("https://pro-api.coinmarketcap.com")
            .get("/v1/cryptocurrency/listings/latest")
            .reply(200, btcEthApiData);
        mockDiscordRequest.mockReturnValueOnce(Promise.resolve(new Response(JSON.stringify({id: "ok"}))));
        await updateCmc();
        expect(JSON.parse(await streamToString(mockDiscordRequest.mock.calls[1][1].body as ReadableStream)).embeds[0].description).toMatch(new RegExp("The following alert has been triggered:\\n\\n- When price of Bitcoin is greater than \\$100"));
    });
});