/* eslint-disable @typescript-eslint/no-explicit-any */
import * as templates from "../ui/templates";
import {analytics, setAnalytics} from "../analytics/segment";
import {open} from "sqlite";
import sqlite3 from "sqlite3";
import {db, initDb, setDb} from "../database";
import Analytics from "analytics-node";
import fetchMock from "jest-fetch-mock";
import {APIModalSubmitInteraction, InteractionType} from "discord-api-types/v10";
import * as requests from "../requests";
import {FastifyReply} from "fastify";
import {
    APIChatInputApplicationCommandInteraction
} from "discord-api-types/payloads/v10/_interactions/_applicationCommands/chatInput";
import SpyInstance = jest.SpyInstance;
import Mock = jest.Mock;
/*
note to self:
require("leaked-handles").set({
    timeout: 50
});
put ^ that at the top of the setup file to find out open handles
 */
export const btcData = {
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
export const btcEthApiData = "{\"data\":[{\"id\":1,\"name\":\"Bitcoin\",\"symbol\":\"BTC\",\"slug\":\"bitcoin\",\"cmc_rank\":5,\"num_market_pairs\":500,\"circulating_supply\":16950100,\"total_supply\":16950100,\"max_supply\":21000000,\"last_updated\":\"2018-06-02T22:51:28.209Z\",\"date_added\":\"2013-04-28T00:00:00.000Z\",\"tags\":[\"mineable\"],\"platform\":null,\"self_reported_circulating_supply\":null,\"self_reported_market_cap\":null,\"quote\":{\"USD\":{\"price\":9283.92,\"volume_24h\":7155680000,\"volume_change_24h\":-0.152774,\"percent_change_1h\":-0.152774,\"percent_change_24h\":0.518894,\"percent_change_7d\":0.986573,\"market_cap\":852164659250.2758,\"market_cap_dominance\":51,\"fully_diluted_market_cap\":952835089431.14,\"last_updated\":\"2018-08-09T22:53:32.000Z\"},\"BTC\":{\"price\":1,\"volume_24h\":772012,\"volume_change_24h\":0,\"percent_change_1h\":0,\"percent_change_24h\":0,\"percent_change_7d\":0,\"market_cap\":17024600,\"market_cap_dominance\":12,\"fully_diluted_market_cap\":952835089431.14,\"last_updated\":\"2018-08-09T22:53:32.000Z\"}}},{\"id\":1027,\"name\":\"Ethereum\",\"symbol\":\"ETH\",\"slug\":\"ethereum\",\"num_market_pairs\":6360,\"circulating_supply\":16950100,\"total_supply\":16950100,\"max_supply\":21000000,\"last_updated\":\"2018-06-02T22:51:28.209Z\",\"date_added\":\"2013-04-28T00:00:00.000Z\",\"tags\":[\"mineable\"],\"platform\":null,\"quote\":{\"USD\":{\"price\":1283.92,\"volume_24h\":7155680000,\"volume_change_24h\":-0.152774,\"percent_change_1h\":-0.152774,\"percent_change_24h\":0.518894,\"percent_change_7d\":0.986573,\"market_cap\":158055024432,\"market_cap_dominance\":51,\"fully_diluted_market_cap\":952835089431.14,\"last_updated\":\"2018-08-09T22:53:32.000Z\"},\"ETH\":{\"price\":1,\"volume_24h\":772012,\"volume_change_24h\":-0.152774,\"percent_change_1h\":0,\"percent_change_24h\":0,\"percent_change_7d\":0,\"market_cap\":17024600,\"market_cap_dominance\":12,\"fully_diluted_market_cap\":952835089431.14,\"last_updated\":\"2018-08-09T22:53:32.000Z\"}}}],\"status\":{\"timestamp\":\"2018-06-02T22:51:28.209Z\",\"error_code\":0,\"error_message\":\"\",\"elapsed\":10,\"credit_count\":1}}";
export const mockDiscordRequest = jest.spyOn(requests, "default");
export const addAlertModal: APIModalSubmitInteraction = {
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
};

const globalMocks: SpyInstance[] = [];
beforeEach(() => {
    fetchMock.resetMocks();
});

afterEach(() => {
    globalMocks.forEach(mock => mock.mockClear());
    (mockReply.send as Mock<any, any, any>).mockClear();
    mockDiscordRequest.mockClear();
});

beforeAll(async () => {
    fetchMock.enableMocks();
    setAnalytics(new Analytics("ok"));
    globalMocks.push(jest.spyOn(templates, "getEmbedTemplate").mockReturnValue({color: 0x2374ff}));
    globalMocks.push(jest.spyOn(analytics, "track").mockReturnValue(undefined));
    globalMocks.push(jest.spyOn(analytics, "page").mockReturnValue(undefined));
    globalMocks.push(jest.spyOn(analytics, "identify").mockReturnValue(undefined));
    setDb(await open({
        filename: ":memory:",
        driver: sqlite3.Database
    }));
    await initDb();
});

afterAll(async () => {
    clearInterval(requests.requestProcessor);
    await db.close();
});