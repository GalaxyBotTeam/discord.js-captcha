import {
    Client,
    GuildMember,
    EmbedBuilder,
    ChannelType,
    version,
    TextChannel,
    TextBasedChannel,
    DMChannel, Message, GuildTextBasedChannel
} from "discord.js";
import EventEmitter from "events";
import {createCaptcha} from "./createCaptcha";
import {handleChannelType} from "./handleChannelType";

interface CaptchaImageData {
    image: Buffer;
    text: string;
}

/**
 * Captcha Options
 */
export interface CaptchaOptions {
    roleID?: string;
    channelID?: string;
    sendToTextChannel?: boolean;
    addRoleOnSuccess?: boolean;
    kickOnFailure?: boolean;
    caseSensitive?: boolean;
    attempts?: number;
    timeout?: number;
    showAttemptCount?: boolean;
    customPromptEmbed?: EmbedBuilder;
    customSuccessEmbed?: EmbedBuilder;
    customFailureEmbed?: EmbedBuilder;
}

export class Captcha extends EventEmitter {

    /**
    * Creates a New Instance of the Captcha Class.
    * 
    * __Captcha Options__
    * 
    * - `roleID` - The ID of the Discord Role to Give when the CAPTCHA is complete.
    * 
    * - `channelID` - The ID of the Discord Text Channel to Send the CAPTCHA to if the user's Direct Messages are locked.
    * 
    * - `sendToTextChannel` - Whether you want the CAPTCHA to be sent to a specified Text Channel instead of Direct Messages, regardless of whether the user's DMs are locked.
    * 
    * - `addRoleOnSuccess` - Whether you want the Bot to Add the role to the User if the CAPTCHA is Solved Successfully.
    * 
    * - `kickOnFailure` - Whether you want the Bot to Kick the User if the CAPTCHA is Failed.
    * 
    * - `caseSensitive` - Whether you want the the CAPTCHA to be case-sensitive.
    * 
    * - `attempts` - The Number of Attempts Given to Solve the CAPTCHA.
    * 
    * - `timeout` - The Time in Milliseconds before the CAPTCHA expires and the User fails the CAPTCHA.
    * 
    * - `showAttemptCount` - Whether you want to show the Attempt Count in the CAPTCHA Prompt. (Displayed in Embed Footer)
    * 
    * - `customPromptEmbed` - Custom Discord Embed to be Shown for the CAPTCHA Prompt.
    * 
    * - `customSuccessEmbed` - Custom Discord Embed to be Shown for the CAPTCHA Success Message.
    * 
    * - `customFailureEmbed` - Custom Discord Embed to be Shown for the CAPTCHA Failure Message.
    * 
    * @param {CaptchaOptions} options The Options for the Captcha.
    * @param {Client} client The Discord Client.
    * @param {CaptchaOptions} options
    * @example
    * const { Client, IntentsBitField, EmbedBuilder } = require("discord.js");
    * const client = new Client({
    *    intents: [
    *        IntentsBitField.Flags.Guilds,
    *        IntentsBitField.Flags.GuildMessages,
    *        IntentsBitField.Flags.MessageContent, //IMPORTANT: make sure you enable "Message Content Intent" in the dev portal!
    *        IntentsBitField.Flags.GuildMembers,
    *        IntentsBitField.Flags.DirectMessages,
    *    ]
    * });
    *
    * const { Captcha } = require("discord.js-captcha");
    *
    * const captcha = new Captcha(client, {
    *     roleID: "Role ID Here",
    *     channelID: "Text Channel ID Here",
    *     sendToTextChannel: false, //defaults to false
    *     addRoleOnSuccess: true, //defaults to true. whether you want the bot to add the role to the user if the captcha is solved
    *     kickOnFailure: true, //defaults to true. whether you want the bot to kick the user if the captcha is failed
    *     caseSensitive: true, //defaults to true. whether you want the captcha responses to be case-sensitive
    *     attempts: 3, //defaults to 1. number of attempts before captcha is considered to be failed
    *     timeout: 30000, //defaults to 60000. time the user has to solve the captcha on each attempt in milliseconds
    *     showAttemptCount: true, //defaults to true. whether to show the number of attempts left in embed footer
    *     customPromptEmbed: new EmbedBuilder(), //customise the embed that will be sent to the user when the captcha is requested
    *     customSuccessEmbed: new EmbedBuilder(), //customise the embed that will be sent to the user when the captcha is solved
    *     customFailureEmbed: new EmbedBuilder(), //customise the embed that will be sent to the user when they fail to solve the captcha
    * });
    */

    private client!: Client;

    private options!: CaptchaOptions;

    constructor(client: Client, options: CaptchaOptions = {}) {
        super();

        //check discord.js version
        if (Number(version.split(".")[0]) < 14) {
            console.log(`Discord.js Captcha Error: Discord.js v14 or later is required.\nPlease check the README for finding a compatible version for Discord.js v${version.split(".")[0]}\nNeed help? Join our Discord server at 'https://discord.gg/P2g24jp'`);
            return;
        }

        if (!client) {
            console.log(`Discord.js Captcha Error: No Discord Client was Provided!\nNeed Help? Join our Discord Server at 'https://discord.gg/P2g24jp'`);
            process.exit(1)
        }
        this.client = client;
        /**
        * Captcha Options
        * @type {CaptchaOptions}
        */
        this.options = options;

        if ((options.sendToTextChannel === true) && (!options.channelID)) {
            console.log(`Discord.js Captcha Error: Option "sendToTextChannel" was set to true, but "channelID" was not Provided!\nNeed Help? Join our Discord Server at 'https://discord.gg/P2g24jp'`);
            process.exit(1)
        }
        if ((options.addRoleOnSuccess === true) && (!options.roleID)) {
            console.log(`Discord.js Captcha Error: Option "addRoleOnSuccess" was set to true, but "roleID" was not Provided!\nNeed Help? Join our Discord Server at 'https://discord.gg/P2g24jp'`);
            process.exit(1)
        }
        if (options.attempts && options.attempts < 1) {
            console.log(`Discord.js Captcha Error: Option "attempts" must be Greater than 0!\nNeed Help? Join our Discord Server at 'https://discord.gg/P2g24jp'`);
            process.exit(1)
        }
        if (options.timeout && options.timeout < 1) {
            console.log(`Discord.js Captcha Error: Option "timeout" must be Greater than 0!\nNeed Help? Join our Discord Server at 'https://discord.gg/P2g24jp'`);
            process.exit(1)
        }

        if (options.addRoleOnSuccess === undefined) options.addRoleOnSuccess = true;
        options.attempts = options.attempts || 1;
        if (options.caseSensitive === undefined) options.caseSensitive = true;
        options.timeout = options.timeout || 60000;
        if (options.showAttemptCount === undefined) options.showAttemptCount = true;

        Object.assign(this.options, options);
    }

    /**
    * Presents the CAPTCHA to a `Discord.GuildMember`.
    * 
    * @param {GuildMember} member The Discord Server Member to Present the CAPTCHA to.
    * @param {CaptchaImageData} [customCaptcha=undefined] **(OPTIONAL):** An object consisting of a Custom CAPTCHA Image and Text Answer.
    * @returns {Promise<Boolean>} Whether or not the Member Successfully Solved the CAPTCHA.
    * @async
    * @example
    * const { Captcha } = require("discord.js-captcha"); 
    * 
    * const captcha = new Captcha(client, {
    *     roleID: "Role ID Here",
    *     channelID: "Text Channel ID Here",
    *     sendToTextChannel: false,
    *     kickOnFailure: true,
    *     caseSensitive: true,
    *     attempts: 3,
    *     timeout: 30000,
    *     showAttemptCount: true,
    *     customPromptEmbed: new EmbedBuilder(),
    *     customSuccessEmbed: new EmbedBuilder(),
    *     customFailureEmbed: new EmbedBuilder(),
    * });
    * 
    * client.on("guildMemberAdd", async member => {
    *     captcha.present(member);
    * });
    */
    async present(member: GuildMember, customCaptcha: CaptchaImageData): Promise<boolean> {
        if (!member) return false;
        if (customCaptcha) {
            if (!customCaptcha.image) return false;
            if (!customCaptcha.text) return false;
            if (!Buffer.isBuffer(customCaptcha.image)) return false
        }
        const user = member.user;
        const captcha = customCaptcha ? customCaptcha : await createCaptcha(6, this.options.caseSensitive ? "" : "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
        let attemptsLeft = this.options.attempts || 1;
        let attemptsTaken = 1;
        let captchaResponses: any[] = [];

        let captchaIncorrect = new EmbedBuilder()
            .setTitle("❌ You Failed to Complete the CAPTCHA!")
            .setDescription(`${member.user}, you failed to solve the CAPTCHA!\n\nCAPTCHA Text: **${captcha.text}**`)
            .setTimestamp()
            .setColor("Red")
            .setThumbnail(member.guild.iconURL())

        if (this.options.customFailureEmbed) captchaIncorrect = this.options.customFailureEmbed

        let captchaCorrect = new EmbedBuilder()
            .setTitle("✅ CAPTCHA Solved!")
            .setDescription(`${member.user}, you completed the CAPTCHA successfully, and you have been given access to **${member.guild.name}**!`)
            .setTimestamp()
            .setColor("Green")
            .setThumbnail(member.guild.iconURL())

        if (this.options.customSuccessEmbed) captchaCorrect = this.options.customSuccessEmbed

        let captchaPrompt = new EmbedBuilder()
            .setTitle(`Welcome to ${member.guild.name}!`)
            .addFields([{ name: "I'm Not a Robot", value: `${member.user}, to gain access to **${member.guild.name}**, please solve the CAPTCHA below!\n\nThis is done to protect the server from raids consisting of spam bots.` }])
            .setColor("Random")
            .setThumbnail(member.guild.iconURL())

        if (this.options.customPromptEmbed) captchaPrompt = this.options.customPromptEmbed
        if (this.options.showAttemptCount) captchaPrompt.setFooter({ text: this.options.attempts == 1 ? "You have one attempt to solve the CAPTCHA." : `Attempts Left: ${attemptsLeft}` })
        captchaPrompt.setImage('attachment://captcha.png')

        await handleChannelType(this.client, this.options, member).then(async channelF => {
            let captchaEmbed: Message<true>;
            let channel: GuildTextBasedChannel | DMChannel;
            try {
                if ((this.options.channelID) && this.options.sendToTextChannel == true) {
                    channel = (await this.client.guilds.fetch(member.guild.id)).channels.resolve(this.options.channelID) as GuildTextBasedChannel;
                }
                else {
                    channel = await user.createDM()
                }
                captchaEmbed = await channel.send({
                    embeds: [captchaPrompt],
                    files: [
                        { name: "captcha.png", attachment: captcha.image }
                    ]
                }) as Message<true>;
            } catch {
                channel = (await this.client.guilds.fetch(member.guild.id)).channels.resolve(this.options.channelID!) as GuildTextBasedChannel | DMChannel;
                if (this.options.channelID) {
                    captchaEmbed = await channel.send({
                        embeds: [captchaPrompt],
                        files: [
                            { name: "captcha.png", attachment: captcha.image }
                        ]
                    }) as Message<true>;
                } else {
                    return console.log(`Discord.js Captcha Error: User's Direct Messages are Locked!\nYou can attempt have the CAPTCHA sent to a Text Channel if it can't send to DMs by using the "channelID" Option in the Constructor.\nNeed Help? Join our Discord Server at 'https://discord.gg/P2g24jp'`);
                }
            }

            const captchaFilter = (x: Message<boolean>) => {
                return (x.author.id == member.user.id)
            }

            async function handleAttempt(captchaData: any) { //Handles CAPTCHA Responses and Checks
                await captchaEmbed.channel.awaitMessages({
                    filter: captchaFilter, max: 1, time: captchaData.options.timeout
                })
                    .then(async responses => {

                        if (!responses.size) { //If no response was given, CAPTCHA is fully cancelled here

                            //emit timeout event
                            captchaData.emit("timeout", {
                                member: member,
                                responses: captchaResponses,
                                attempts: attemptsTaken,
                                captchaText: captcha.text,
                                captchaOptions: captchaData.options
                            })

                            await captchaEmbed.delete();
                            await channel?.send({ embeds: [captchaIncorrect] })
                                .then(async msg => {
                                    if (captchaData.options.kickOnFailure) await member.kick("Failed to Pass CAPTCHA")
                                    if (channel.type === ChannelType.GuildText) setTimeout(() => msg.delete(), 3000);
                                });
                            return false;
                        }

                        //emit answer event
                        captchaData.emit("answer", {
                            member: member,
                            response: String(responses.first()),
                            attempts: attemptsTaken,
                            captchaText: captcha.text,
                            captchaOptions: captchaData.options
                        })

                        let answer = String(responses.first()); //Converts the response message to a string
                        if (captchaData.options.caseSensitive !== true) answer = answer.toLowerCase(); //If the CAPTCHA is case sensitive, convert the response to lowercase
                        captchaResponses.push(answer); //Adds the answer to the array of answers
                        if (channel.type === ChannelType.GuildText) await responses.first()?.delete();

                        if (answer === captcha.text) { //If the answer is correct, this code will execute
                            //emit success event
                            captchaData.emit("success", {
                                member: member,
                                responses: captchaResponses,
                                attempts: attemptsTaken,
                                captchaText: captcha.text,
                                captchaOptions: captchaData.options
                            })
                            if (captchaData.options.addRoleOnSuccess === true) { // Only adds to role if option is set
                                await member.roles.add(captchaData.options.roleID)
                            }
                            if (channel.type === ChannelType.GuildText) await captchaEmbed.delete();
                            channel.send({ embeds: [captchaCorrect] })
                                .then(async msg => {
                                    if (channel.type === ChannelType.GuildText) setTimeout(() => msg.delete(), 3000);
                                });
                            return true;
                        } else { //If the answer is incorrect, this code will execute
                            if (attemptsLeft > 1) { //If there are attempts left
                                attemptsLeft--;
                                attemptsTaken++;
                                if (channel.type === ChannelType.GuildText && captchaData.options.showAttemptCount) {
                                    await captchaEmbed.edit({
                                        embeds: [captchaPrompt.setFooter({ text: `Attempts Left: ${attemptsLeft}` })],
                                        files: [
                                            { name: "captcha.png", attachment: captcha.image }
                                        ]
                                    })
                                }
                                else if (channel.type !== ChannelType.GuildText) {
                                    await captchaEmbed.channel.send({
                                        embeds: [captchaData.options.showAttemptCount ? captchaPrompt.setFooter({ text: `Attempts Left: ${attemptsLeft}` }) : captchaPrompt],
                                        files: [
                                            { name: "captcha.png", attachment: captcha.image }
                                        ]
                                    })
                                }
                                return handleAttempt(captchaData);
                            }
                            //If there are no attempts left

                            //emit failure event
                            captchaData.emit("failure", {
                                member: member,
                                responses: captchaResponses,
                                attempts: attemptsTaken,
                                captchaText: captcha.text,
                                captchaOptions: captchaData.options
                            })

                            if (channel.type === ChannelType.GuildText) await captchaEmbed.delete();
                            await channel.send({ embeds: [captchaIncorrect] })
                                .then(async msg => {
                                    if (captchaData.options.kickOnFailure) await member.kick("Failed to Pass CAPTCHA")
                                    if (channel.type === ChannelType.GuildText) setTimeout(() => msg.delete(), 3000);
                                });
                            return false;
                        }
                    })
            }
            //emit prompt event
            this.emit("prompt", {
                member: member,
                captchaText: captcha.text,
                captchaOptions: this.options
            })
            handleAttempt(this);
        })

        return true; //Returns true if the CAPTCHA was presented successfully
    }
}