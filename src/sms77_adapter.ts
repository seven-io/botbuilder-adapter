/**
 * @module botbuilder-adapter-sms77-sms
 */
import {
    Activity,
    ActivityTypes,
    BotAdapter,
    ConversationReference,
    ResourceResponse,
    TurnContext
} from 'botbuilder';
import Debug from 'debug';
import Sms77Client, {
    HookAllPayloadInboundSms,
    SmsJsonResponse,
    SmsParams
} from 'sms77-client';
import {Sms77BotWorker} from './botworker';

const Client = require('sms77-client');
const debug = Debug('botkit:sms77');

/**
 * Connect [Botkit](https://www.npmjs.com/package/botkit) or [BotBuilder](https://www.npmjs.com/package/botbuilder) to Sms77's SMS service.
 */
export class Sms77Adapter extends BotAdapter {
    /**
     * Name used by Botkit plugin loader
     * @ignore
     */
    public name = 'Sms77 SMS Adapter';

    /**
     * Object containing one or more Botkit middlewares to bind automatically.
     * @ignore
     */
    public middlewares;

    /**
     * A specialized BotWorker for Botkit that exposes Sms77 specific extension methods.
     * @ignore
     */
    public botkit_worker = Sms77BotWorker;

    private readonly api: Sms77Client;

    /**
     * Create an adapter to handle incoming messages from Sms77's SMS service and translate them into a standard format for processing by your bot.
     *
     * Use with Botkit:
     *```javascript
     * const adapter = new Sms77Adapter({
     *      api_key: process.env.SMS77_API_KEY,
     *      sms77_number: process.env.SMS77_NUMBER,
     * });
     * const controller = new Botkit({adapter: adapter});
     * ```
     *
     * Use with BotBuilder:
     *```javascript
     * const adapter = new Sms77Adapter({
     *      api_key: process.env.SMS77_API_KEY,
     *      sms77_number: process.env.SMS77_NUMBER,
     * });
     * // set up restify...
     * const server = restify.createServer();
     * server.use(restify.plugins.bodyParser());
     * server.post('/api/messages', (req, res) => {
     *      adapter.processActivity(req, res, async(context) => {
     *          // do your bot logic here!
     *      });
     * });
     * ```
     *
     * @param options An object containing API credentials, a webhook verification token and other options
     */
    public constructor(private options: Sms77AdapterOptions) {
        super();

        if (!options.sms77_number) {
            const e = 'sms77_number is a required part of the configuration.';

            if (this.options.enable_incomplete) console.error(e);
            else throw new Error(e);
        }

        if (!options.api_key) {
            const e = 'api_key is a required part of the configuration.';

            if (this.options.enable_incomplete) console.error(e);
            else throw new Error(e);
        }

        if (this.options.enable_incomplete) console.warn(`
            ****************************************************************************************
            * WARNING: Your adapter may be running with an incomplete/unsafe configuration.        *
            * - Ensure all required configuration options are present                              *
            * - Disable the "enable_incomplete" option!                                            *
            ****************************************************************************************
        `);

        try {
            this.api = new Client(this.options.api_key, 'Botkit');
        } catch (e) {
            if (this.options.enable_incomplete) console.error(e);
            else throw new Error(e);
        }

        this.middlewares = {
            spawn: [
                async (bot, next): Promise<void> => {
                    bot.api = this.api;

                    next();
                }
            ]
        };
    }

    /**
     * Formats a BotBuilder activity into an outgoing Sms77 SMS message.
     * @param activity A BotBuilder Activity object
     * @returns a Sms77 message object with {from, text, to}
     */
    private activityToSms77(activity: Partial<Activity>): SmsParams {
        console.log('activityToSms77', activity);

        return {
            from: this.options.sms77_number,
            json: true,
            text: activity.text,
            to: activity.conversation.id,
        };
    }

    /**
     * Standard BotBuilder adapter method to send a message from the bot to the messaging API.
     * [BotBuilder reference docs](https://docs.microsoft.com/en-us/javascript/api/botbuilder-core/botadapter?view=botbuilder-ts-latest#sendactivities).
     * @param context A TurnContext representing the current incoming message and environment. (Unused)
     * @param activities An array of outgoing activities to be sent back to the messaging API.
     */
    public async sendActivities(context: TurnContext, activities: Partial<Activity>[])
        : Promise<ResourceResponse[]> {
        const responses = [];

        for (let a = 0; a < activities.length; a++) {
            const activity = activities[a];

            if (activity.type === ActivityTypes.Message)
                (<SmsJsonResponse>await this.api.sms(this.activityToSms77(activity)))
                    .messages.forEach(({id}) => responses.push({id}));
            else debug(
                `Unknown message type encountered in sendActivities: ${activity.type}`);
        }

        return responses;
    }

    /**
     * Sms77 SMS adapter does not support updateActivity.
     * @ignore
     */
    public async updateActivity(ctx: TurnContext, act: Partial<Activity>): Promise<void> {
        debug('Sms77 SMS does not support updating activities.');
    }

    /**
     * Sms77 SMS adapter does not support deleteActivity.
     * @ignore
     */
    public async deleteActivity(ctx: TurnContext, ref: Partial<ConversationReference>)
        : Promise<void> {
        debug('Sms77 SMS does not support deleting activities.');
    }

    /**
     * Standard BotBuilder adapter method for continuing an existing conversation based on a conversation reference.
     * [BotBuilder reference docs](https://docs.microsoft.com/en-us/javascript/api/botbuilder-core/botadapter?view=botbuilder-ts-latest#continueconversation)
     * @param reference A conversation reference to be applied to future messages.
     * @param logic A bot logic function that will perform continuing action in the form `async(context) => { ... }`
     */
    public async continueConversation(reference: Partial<ConversationReference>,
                                      logic: (context: TurnContext) => Promise<void>)
        : Promise<void> {
        return this.runMiddleware(new TurnContext(this,
            TurnContext.applyConversationReference(
                {
                    name: 'continueConversation',
                    type: 'event',
                },
                reference,
                true
            )), logic);
    }

    /**
     * Accept an incoming webhook request and convert it into a TurnContext which can be processed by the bots logic.
     * @param req A request object from Restify or Express
     * @param res A response object from Restify or Express
     * @param logic A bot logic function in the form `async(context) => { ... }`
     */
    public async processActivity(req, res, logic: (context: TurnContext) => Promise<void>)
        : Promise<void> {

        const {data}: HookAllPayloadInboundSms = req.body;
        console.log('processActivity');

        const ctx = new TurnContext(this, <Activity>{
            channelData: data,
            channelId: 'sms77-sms',
            conversation: {
                id: data.sender
            },
            from: {
                id: data.sender
            },
            id: data.id.toString(),
            recipient: {
                id: data.system
            },
            text: data.text,
            timestamp: new Date,
            type: ActivityTypes.Message,
        }); // create a conversation reference

        ctx.turnState.set('httpStatus', 200);

        await this.runMiddleware(ctx, logic);

        res.status(ctx.turnState.get('httpStatus'));
        if (ctx.turnState.get('httpBody')) res.send(ctx.turnState.get('httpBody'));
        else res.end();
    }
}

export interface Sms77AdapterOptions {
    /** API key associated with the sms77 account */
    api_key: string;
    /**
     * Allow the adapter to startup without a complete configuration.
     * This is risky as it may result in a non-functioning or insecure adapter.
     * This should only be used when getting started.
     */
    enable_incomplete?: boolean;
    /** Phone number associated with this Sms77 app */
    sms77_number: string;
}
