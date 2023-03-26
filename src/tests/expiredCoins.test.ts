import CoinInteractionProcessor from "../ui/coin/interactionProcessor";
import {APIChannel, InteractionResponseType, MessageFlags} from "discord-api-types/v10";
import {db, genSqlInsertCommand, idToCrypto} from "../database";
import {UserSetting, UserSettingType} from "../structs/usersettings";
import * as cmcApi from "../services/cmcApi";
import {makeEmbed} from "../ui/coin/interfaceCreator";
import {addAlertModal, mockDiscordRequest, mockReply} from "./testSetup";
import nock from "nock";

jest.spyOn(cmcApi, "notifyUsers").mockReturnValue(undefined);

describe("Checks if expired coins are handled properly", function () {
    it("Alerts user if they have an alert for an expired coin", async function () {

        await CoinInteractionProcessor.processModal(addAlertModal, mockReply);
        expect(mockReply.send).toBeCalledTimes(1);
        expect(mockReply.send).toBeCalledWith({
            type: InteractionResponseType.ChannelMessageWithSource, data: {
                content: "Done! Added alert for Bitcoin. Manage your alerts with </alerts:undefined>",
                flags: MessageFlags.Ephemeral
            }
        });
        expect((await db.get("select * from user_settings where id=? and type=?", "1234567890", UserSettingType[UserSettingType.ALERT]))["alertThreshold"]).toBe(50);
        // eslint-disable-next-line quotes
        nock("https://pro-api.coinmarketcap.com")
            .get("/v1/cryptocurrency/listings/latest")
            .reply(200, JSON.parse("{\"data\":[{\"id\":1027,\"name\":\"Ethereum\",\"symbol\":\"ETH\",\"slug\":\"ethereum\",\"num_market_pairs\":6360,\"circulating_supply\":16950100,\"total_supply\":16950100,\"max_supply\":21000000,\"last_updated\":\"2018-06-02T22:51:28.209Z\",\"date_added\":\"2013-04-28T00:00:00.000Z\",\"tags\":[\"mineable\"],\"platform\":null,\"quote\":{\"USD\":{\"price\":1283.92,\"volume_24h\":7155680000,\"volume_change_24h\":-0.152774,\"percent_change_1h\":-0.152774,\"percent_change_24h\":0.518894,\"percent_change_7d\":0.986573,\"market_cap\":158055024432,\"market_cap_dominance\":51,\"fully_diluted_market_cap\":952835089431.14,\"last_updated\":\"2018-08-09T22:53:32.000Z\"},\"ETH\":{\"price\":1,\"volume_24h\":772012,\"volume_change_24h\":-0.152774,\"percent_change_1h\":0,\"percent_change_24h\":0,\"percent_change_7d\":0,\"market_cap\":17024600,\"market_cap_dominance\":12,\"fully_diluted_market_cap\":952835089431.14,\"last_updated\":\"2018-08-09T22:53:32.000Z\"}}}],\"status\":{\"timestamp\":\"2018-06-02T22:51:28.209Z\",\"error_code\":0,\"error_message\":\"\",\"elapsed\":10,\"credit_count\":1}}"));
        nock("https://discord.com")
            .get("/api/v10/users/@me/channels")
            .reply(200, {
                id: "123123123"
            } as APIChannel);
        const setting = new UserSetting();
        setting.id = "1234567890";
        setting.favouriteCrypto = 1;
        setting.type = UserSettingType[UserSettingType.FAVOURITE_CRYPTO];
        await genSqlInsertCommand(setting, "user_settings", new UserSetting());
        expect(await db.get("select * from user_settings where id=? and favouriteCrypto=?", "1234567890", 1)).not.toBeUndefined();
        await cmcApi.updateCmc();
        expect(await db.get("select * from user_settings where id=? and favouriteCrypto=?", "1234567890", 1)).toBeUndefined();
        expect(await db.get("select * from cmc_cache where id = 1")).toBeUndefined();
        expect(await db.get("select * from cmc_cache where id = 1027")).not.toBeUndefined();
        expect(mockDiscordRequest).toBeCalledTimes(2);
        expect(JSON.parse((mockDiscordRequest.mock.calls[1][1] as any).body).embeds[0].description).toBe("The following alert has expired:\n\n- When price of Bitcoin is less than $50\n\nThe above coins are no longer in the top 200 cryptocurrencies by market cap. Due to technical limitations, Botchain cannot track such cryptocurrencies. As such, the above alert has been **deleted**. Please keep a closer eye on the above cryptocurrencies as you will no longer receive alerts for them.\n\nHappy trading!");
        try {
            makeEmbed(await idToCrypto("ok"));
            fail("Should have thrown an error");
        } catch (e) {
            expect(e).not.toBeUndefined();
        }
    });
});
