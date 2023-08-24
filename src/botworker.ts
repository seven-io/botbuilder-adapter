/**
 * @module botbuilder-adapter-seven
 */

import {BotWorker} from 'botkit';
import {ChannelAccount, ConversationAccount} from 'botbuilder';
import SevenClient from 'sms77-client';

/**
 * A specialized version of [Botkit's core BotWorker class](core.md#BotWorker) that includes additional methods for interacting with seven SMS.
 * It includes all functionality from the base class, as well as the extension methods below.
 * When using the SevenAdapter with Botkit, all `bot` objects passed to handler functions will include these extensions.
 */
export class SevenBotWorker extends BotWorker {
    /** A copy of the seven API client */
    public api: SevenClient;

    /**
     * Start a conversation with a user identified by their phone number. Useful for sending pro-active messages:
     *
     * ```javascript
     * let bot = await controller.spawn();
     * await bot.startConversationWithUser(MY_PHONE_NUMBER);
     * await bot.send('An important update!');
     * ```
     *
     * @param userId A phone number in the form +1XXXYYYZZZZ
     */
    public async startConversationWithUser(userId: string): Promise<any> {
        return this.changeContext({
            bot: {
                id: this.controller.getConfig('seven_number'),
                name: 'bot',
            },
            channelId: 'seven-sms',
            conversation: <ConversationAccount>{id: userId},
            user: <ChannelAccount>{id: userId},
        });
    }
}
