import {analytics, setAnalytics} from "../segment";
import Analytics from "analytics-node";
import nock from "nock";
import {APIUser, InteractionType} from "discord-api-types/v10";
import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import {jest} from "@jest/globals";
import {initClient, validCryptos} from "../utils";
import {Candles, CoinAlerts, LatestCoins, mongoClient, openDb} from "../database";
import {CoinMetadata} from "../structs/coinMetadata";
import Mock = jest.Mock;

/*
note to self:
require("leaked-handles").set({
    timeout: 50
});
put ^ that at the top of the setup file to find out open handles
 */

export const mockCommandInteraction: APIChatInputApplicationCommandInteraction = {
    type: InteractionType.ApplicationCommand,
    id: "123",
    application_id: "123",
    version: 1,
    locale: "en-US",
    token: "123",
    app_permissions: null,
    data: {
        id: "123",
        type: 1,
        name: "coin",
        options: [
            {
                name: "name",
                type: 3,
                value: "btc"
            }
        ]
    },
    guild_id: "123",
    channel_id: "123",
    user: {
        id: "123",
        username: "test",
        discriminator: "1234",
        avatar: "123"
    }
};
export const mockReply = {send: jest.fn().mockImplementation(() => Promise.resolve())} as unknown as FastifyReply;
const globalMocks: any[] = [];
beforeEach(async () => {
    await CoinAlerts.deleteMany({});
    await LatestCoins.deleteMany({});
    await Candles.deleteMany({});
    const btc = new CoinMetadata(), eth = new CoinMetadata();
    btc.cmc_id = 1;
    btc.name = "Bitcoin";
    btc.symbol = "BTC";
    eth.cmc_id = 1027;
    eth.name = "Ethereum";
    eth.symbol = "ETH";
    validCryptos.length = 0;
    validCryptos.push(btc, eth);
    nock.cleanAll();
});

afterEach(() => {
    globalMocks.forEach(mock => mock.mockClear());
    (mockReply.send as Mock<any>).mockClear();
});

beforeAll(async () => {
    nock.disableNetConnect();
    setAnalytics(new Analytics("ok"));
    initClient({id: "123", avatar: "avatar"} as APIUser);
    globalMocks.push(jest.spyOn(analytics, "track").mockReturnValue(undefined));
    globalMocks.push(jest.spyOn(analytics, "page").mockReturnValue(undefined));
    globalMocks.push(jest.spyOn(analytics, "identify").mockReturnValue(undefined));
    expect(process.env["SEGMENT_KEY"]).toBeUndefined();
    expect(globalThis.__MONGO_URI__).toMatch("127.0.0.1");
    await openDb(globalThis.__MONGO_URI__, globalThis.__MONGO_DB_NAME__);
});

afterAll(async () => {
    await mongoClient.close();
});