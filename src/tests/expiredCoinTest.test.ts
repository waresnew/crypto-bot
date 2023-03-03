import {Database, open} from "sqlite";
import sqlite3 from "sqlite3";
import fetchMock from "jest-fetch-mock";
import CoinInteractionProcessor from "../ui/coin/interactionProcessor";
import {FastifyReply} from "fastify";
import {APIChannel, InteractionResponseType, InteractionType, MessageFlags} from "discord-api-types/v10";
import {db, idToApiData, initDb, setDb} from "../database";
import {analytics, setAnalytics} from "../analytics/segment";
import Analytics from "analytics-node";
import {UserSettingType} from "../structs/usersettings";
import * as templates from "../ui/templates";
import * as requests from "../requests";
import * as cmcApi from "../services/cmcApi";
import {makeEmbed} from "../ui/coin/interfaceCreator";
/*
note to self:
require("leaked-handles").set({
    timeout: 50
});
put ^ that at the top of the file to find out open handles
 */
setAnalytics(new Analytics("ok"));
jest.spyOn(cmcApi, "notifyUsers").mockReturnValue(undefined);
const mockDiscordRequest = jest.spyOn(requests, "default");
jest.spyOn(templates, "getEmbedTemplate").mockReturnValue({color: 0x2374ff});
jest.spyOn(analytics, "track").mockReturnValue(undefined);
jest.spyOn(analytics, "page").mockReturnValue(undefined);
jest.spyOn(analytics, "identify").mockReturnValue(undefined);
let fakeDb: Database = null;
beforeAll(async () => {
    fakeDb = await open({
        filename: ":memory:",
        driver: sqlite3.Database
    });
    setDb(fakeDb);
    await initDb();

});

afterAll(async () => {
    clearInterval(requests.requestProcessor);
    await db.close();
});
const btcData = {
    dummy: 0,
    cmc_rank: 1,
    id: 1,
    name: "Bitcoin",
    slug: "bitcoin",
    symbol: "BTC",
    fully_diluted_market_cap: 100000000000,
    last_updated: "2022-02-28T00:00:00.000Z",
    market_cap: 200000000000,
    market_cap_dominance: 0.5,
    percent_change_1h: 0.01,
    percent_change_24h: 0.02,
    percent_change_7d: -0.03,
    price: 50000,
    volume_24h: 10000000000,
    volume_change_24h: 0.1
};
fetchMock.enableMocks();
describe("Checks if expired coins are handled properly", function () {
    beforeEach(() => {
        fetchMock.resetMocks();
    });
    it("Alerts user if they have an alert for an expired coin", async function () {
        analytics.page({
            userId: "123",
            name: "test"
        });
        // eslint-disable-next-line quotes
        fetchMock.once("{\"data\":[{\"id\":1,\"name\":\"Bitcoin\",\"symbol\":\"BTC\",\"slug\":\"bitcoin\",\"cmc_rank\":5,\"num_market_pairs\":500,\"circulating_supply\":16950100,\"total_supply\":16950100,\"max_supply\":21000000,\"last_updated\":\"2018-06-02T22:51:28.209Z\",\"date_added\":\"2013-04-28T00:00:00.000Z\",\"tags\":[\"mineable\"],\"platform\":null,\"self_reported_circulating_supply\":null,\"self_reported_market_cap\":null,\"quote\":{\"USD\":{\"price\":9283.92,\"volume_24h\":7155680000,\"volume_change_24h\":-0.152774,\"percent_change_1h\":-0.152774,\"percent_change_24h\":0.518894,\"percent_change_7d\":0.986573,\"market_cap\":852164659250.2758,\"market_cap_dominance\":51,\"fully_diluted_market_cap\":952835089431.14,\"last_updated\":\"2018-08-09T22:53:32.000Z\"},\"BTC\":{\"price\":1,\"volume_24h\":772012,\"volume_change_24h\":0,\"percent_change_1h\":0,\"percent_change_24h\":0,\"percent_change_7d\":0,\"market_cap\":17024600,\"market_cap_dominance\":12,\"fully_diluted_market_cap\":952835089431.14,\"last_updated\":\"2018-08-09T22:53:32.000Z\"}}},{\"id\":1027,\"name\":\"Ethereum\",\"symbol\":\"ETH\",\"slug\":\"ethereum\",\"num_market_pairs\":6360,\"circulating_supply\":16950100,\"total_supply\":16950100,\"max_supply\":21000000,\"last_updated\":\"2018-06-02T22:51:28.209Z\",\"date_added\":\"2013-04-28T00:00:00.000Z\",\"tags\":[\"mineable\"],\"platform\":null,\"quote\":{\"USD\":{\"price\":1283.92,\"volume_24h\":7155680000,\"volume_change_24h\":-0.152774,\"percent_change_1h\":-0.152774,\"percent_change_24h\":0.518894,\"percent_change_7d\":0.986573,\"market_cap\":158055024432,\"market_cap_dominance\":51,\"fully_diluted_market_cap\":952835089431.14,\"last_updated\":\"2018-08-09T22:53:32.000Z\"},\"ETH\":{\"price\":1,\"volume_24h\":772012,\"volume_change_24h\":-0.152774,\"percent_change_1h\":0,\"percent_change_24h\":0,\"percent_change_7d\":0,\"market_cap\":17024600,\"market_cap_dominance\":12,\"fully_diluted_market_cap\":952835089431.14,\"last_updated\":\"2018-08-09T22:53:32.000Z\"}}}],\"status\":{\"timestamp\":\"2018-06-02T22:51:28.209Z\",\"error_code\":0,\"error_message\":\"\",\"elapsed\":10,\"credit_count\":1}}");
        await cmcApi.updateCmc();
        expect((await fakeDb.get("select * from cmc_cache where id = 1"))["name"]).toBe("Bitcoin");
        expect((await fakeDb.get("select * from cmc_cache where id = 1027"))["name"]).toBe("Ethereum");

        jest.spyOn(CoinInteractionProcessor, "getChoiceFromEmbed").mockReturnValueOnce(
            Promise.resolve(btcData));
        const mockSend = {send: jest.fn().mockImplementation(() => Promise.resolve())} as unknown as FastifyReply;
        await CoinInteractionProcessor.processModal({
            locale: undefined,
            id: "123456789012345678",
            token: "abcdefg1234567890",
            type: InteractionType.ModalSubmit,
            message: {
                id: "123456789012345678",
                channel_id: "111111111111111111",
                author: null,
                content: "",
                timestamp: "2021-08-09T22:53:32.000Z",
                edited_timestamp: null,
                tts: false,
                mention_everyone: false,
                mentions: [],
                mention_roles: [],
                attachments: [],
                embeds: [],
                reactions: [],
                nonce: null,
                pinned: false,
                webhook_id: null,
                type: 0
            },
            data: {
                custom_id: "coin_alertsmodal",
                components: [
                    {
                        type: 1,
                        components: [
                            {
                                type: 3,
                                custom_id: "coin_alertsmodalstat_1234567890",
                                value: "price"
                            }
                        ]
                    },
                    {
                        type: 1,
                        components: [
                            {
                                type: 3,
                                custom_id: "coin_alertsmodalvalue_1234567890",
                                value: "<50"
                            }
                        ]
                    }
                ]

            },
            guild_id: "222222222222222222",
            channel_id: "111111111111111111",
            user: {
                id: "1234567890",
                username: "TestUser",
                discriminator: "1234",
                avatar: "avatar-hash"
            },
            version: 1,
            application_id: "555555555555555555"
        }, mockSend);
        expect(mockSend.send).toBeCalledTimes(1);
        expect(mockSend.send).toBeCalledWith({
            type: InteractionResponseType.ChannelMessageWithSource, data: {
                content: "Done! Added alert for Bitcoin. Manage your alerts with </alerts:undefined>",
                flags: MessageFlags.Ephemeral
            }
        });
        expect((await fakeDb.get("select * from user_settings where id=? and type=?", "1234567890", UserSettingType[UserSettingType.ALERT]))["alertThreshold"]).toBe(50);
        // eslint-disable-next-line quotes
        fetchMock.once("{\"data\":[{\"id\":1027,\"name\":\"Ethereum\",\"symbol\":\"ETH\",\"slug\":\"ethereum\",\"num_market_pairs\":6360,\"circulating_supply\":16950100,\"total_supply\":16950100,\"max_supply\":21000000,\"last_updated\":\"2018-06-02T22:51:28.209Z\",\"date_added\":\"2013-04-28T00:00:00.000Z\",\"tags\":[\"mineable\"],\"platform\":null,\"quote\":{\"USD\":{\"price\":1283.92,\"volume_24h\":7155680000,\"volume_change_24h\":-0.152774,\"percent_change_1h\":-0.152774,\"percent_change_24h\":0.518894,\"percent_change_7d\":0.986573,\"market_cap\":158055024432,\"market_cap_dominance\":51,\"fully_diluted_market_cap\":952835089431.14,\"last_updated\":\"2018-08-09T22:53:32.000Z\"},\"ETH\":{\"price\":1,\"volume_24h\":772012,\"volume_change_24h\":-0.152774,\"percent_change_1h\":0,\"percent_change_24h\":0,\"percent_change_7d\":0,\"market_cap\":17024600,\"market_cap_dominance\":12,\"fully_diluted_market_cap\":952835089431.14,\"last_updated\":\"2018-08-09T22:53:32.000Z\"}}}],\"status\":{\"timestamp\":\"2018-06-02T22:51:28.209Z\",\"error_code\":0,\"error_message\":\"\",\"elapsed\":10,\"credit_count\":1}}");
        fetchMock.once(JSON.stringify({
            id: "123123123"
        } as APIChannel));
        await cmcApi.updateCmc();
        expect(await fakeDb.get("select * from cmc_cache where id = 1")).toBeUndefined();
        expect(await fakeDb.get("select * from cmc_cache where id = 1027")).not.toBeUndefined();
        expect(mockDiscordRequest).toBeCalledTimes(2);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(JSON.parse((mockDiscordRequest.mock.calls[1][1] as any).body).embeds[0].description).toBe("The following alert has expired:\n\n- When price of Bitcoin is less than $50\n\nThe above coins are no longer in the top 200 cryptocurrencies by market cap. Due to technical limitations, Botchain cannot track such cryptocurrencies. As such, the above alert has been **deleted**. Please keep a closer eye on the above cryptocurrencies as you will no longer receive alerts for them.\n\nHappy trading!");
        jest.spyOn(CoinInteractionProcessor, "getChoiceFromEmbed").mockReturnValueOnce(idToApiData(1));
        const outdatedEmbed = makeEmbed(await CoinInteractionProcessor.getChoiceFromEmbed(undefined));
        expect(outdatedEmbed.title).toBe("This coin is no longer in the top 200 coins. (N/A-USD)");
        expect(outdatedEmbed.thumbnail.url).toBe("https://s2.coinmarketcap.com/static/img/coins/128x128/0.png");
    });
});
