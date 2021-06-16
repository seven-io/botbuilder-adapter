/**
 * @module botbuilder-adapter-sms77-sms
 */

import {BotWorker} from 'botkit';
import {ChannelAccount, ConversationAccount} from 'botbuilder';
import Sms77Client from 'sms77-client';

/**
 * A specialized version of [Botkit's core BotWorker class](core.md#BotWorker) that includes additional methods for interacting with Sms77 SMS.
 * It includes all functionality from the base class, as well as the extension methods below.
 * When using the Sms77Adapter with Botkit, all `bot` objects passed to handler functions will include these extensions.
 */
export class Sms77BotWorker extends BotWorker {
    /** A copy of the Sms77 API client */
    public api: Sms77Client;

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
                id: this.controller.getConfig('sms77_number'),
                name: 'bot',
            },
            channelId: 'sms77-sms',
            conversation: <ConversationAccount>{id: userId},
            user: <ChannelAccount>{id: userId},
        });
    }
}
