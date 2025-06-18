import {Client, GuildMember, DMChannel, TextChannel} from "discord.js";

/**
 * 
 * @param {Client} client
 * @param {any} options
 * @param {GuildMember} member
 * @returns {DMChannel | TextChannel}
 */

export async function handleChannelType(client: Client, options: any, member: GuildMember): Promise<DMChannel | TextChannel> {
    let channel;
    if (!options.channelID) {
        channel = await member.user.createDM();
    } else {
        if (options.sendToTextChannel == true) {
            channel = (await client.guilds.fetch(member.guild.id)).channels.resolve(options.channelID) as TextChannel | DMChannel;
        }
    }
    if( !channel) {
        throw new Error("Channel not found or not accessible.");
    }
    return channel;
}