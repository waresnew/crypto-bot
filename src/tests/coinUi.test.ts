/* eslint-disable @typescript-eslint/no-explicit-any */
import {btcEthApiData, mockCommandInteraction, mockReply} from "./testSetup";
import coinCmd from "../commands/coin";
import {APIEmbed, InteractionResponseType} from "discord-api-types/v10";
import {updateCmc} from "../services/cmcApi";
import fetchMock from "jest-fetch-mock";
import Mock = jest.Mock;

let msg: Mock<any, any, any> = null, embed: APIEmbed = null;
beforeAll(async () => {
    fetchMock.once(btcEthApiData);
    await updateCmc();
    await coinCmd.execute(mockCommandInteraction, mockReply);
    expect(mockReply.send).toHaveBeenCalled();
    msg = mockReply.send as Mock<any, any, any>;
    embed = msg.mock.calls[0][0].data.embeds[0] as APIEmbed;
});

describe("Tests /coin interface", () => {
    it("displays the coin embed correctly after cmd", async () => {
        expect(msg.mock.calls[0][0].type).toBe(InteractionResponseType.ChannelMessageWithSource);
        expect(embed.title).toBe("Bitcoin (BTC-USD)");
        expect(embed.thumbnail.url).toBe("https://s2.coinmarketcap.com/static/img/coins/128x128/1.png");
        expect(embed.fields[0].name).toBe("Price");
        expect(embed.fields[0].value).toBe("$9283.92 🟢");
    });

    it("displays the alert modal correctly after click button", async () => {

    });
});