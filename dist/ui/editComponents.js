import { ActionRowBuilder, ButtonBuilder, ButtonComponent, StringSelectMenuBuilder, StringSelectMenuComponent } from "discord.js";
/**
 * convenience method that unwraps message components for editing discord message buttons/selectmenus
 * @param message the message to reference from
 * @param modifier function that will be called on every component
 * @example //Disables all components in the message
 *  const disabledComponents = editComponents(message, async (builder) => {
 *               return builder.setDisabled(true);
 *  });
 */ export async function editComponents(message, modifier) {
    const ans = [];
    for (const row of message.components){
        const toAdd = new ActionRowBuilder();
        for (const component of row.components){
            if (component instanceof ButtonComponent) {
                toAdd.addComponents(await modifier(ButtonBuilder.from(component)));
            } else if (component instanceof StringSelectMenuComponent) {
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