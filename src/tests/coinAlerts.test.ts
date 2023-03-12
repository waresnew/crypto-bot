/* eslint-disable @typescript-eslint/no-explicit-any */
import {db, genSqlInsertCommand} from "../database";
import {UserSetting} from "../structs/usersettings";
import {updateCmc} from "../services/cmcApi";
import fetchMock from "jest-fetch-mock";
import {btcEthApiData, mockDiscordRequest} from "./testSetup";

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
        fetchMock.once(btcEthApiData);
        mockDiscordRequest.mockReturnValueOnce(Promise.resolve(new Response(JSON.stringify({id: "ok"}))));
        await updateCmc();
        expect(JSON.parse(await streamToString(mockDiscordRequest.mock.calls[1][1].body as ReadableStream)).embeds[0].description).toMatch(new RegExp("The following alert has been triggered:\\n\\n- When price of Bitcoin is greater than \\$100"));
    });

    async function streamToString(stream: ReadableStream) {
        const chunks = [];
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks).toString("utf-8");
    }

});