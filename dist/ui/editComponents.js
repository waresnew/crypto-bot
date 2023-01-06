import { ActionRowBuilder, ButtonBuilder, ButtonComponent, StringSelectMenuBuilder, StringSelectMenuComponent } from "discord.js";
export async function editComponents(message, modifier) {
    const ans = [];
    for (const row of message.components) {
        const toAdd = new ActionRowBuilder();
        for (const component of row.components) {
            if (component instanceof ButtonComponent) {
                toAdd.addComponents(await modifier(ButtonBuilder.from(component)));
            }
            else if (component instanceof StringSelectMenuComponent) {
                toAdd.addComponents(await modifier(StringSelectMenuBuilder.from(component)));
            }
        }
        if (toAdd.components.length > 0) {
            ans.push(toAdd);
        }
    }
    return ans;
}
//# sourceMappingURL=editComponents.js.map