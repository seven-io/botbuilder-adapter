import {ok} from 'assert';
import {Botkit} from 'botkit';
import {SevenAdapter} from '../src';

const {
    SEVEN_API_KEY,
    SEVEN_INBOUND_DE,
    SEVEN_RECIPIENT,
} = process.env

ok(SEVEN_API_KEY); // an API key from seven.io
ok(SEVEN_INBOUND_DE); // an GSM inbound number from seven.io
ok(SEVEN_RECIPIENT);

const controller = new Botkit({
    adapter: new SevenAdapter({
        api_key: SEVEN_API_KEY,
        seven_number: SEVEN_INBOUND_DE,
    }),
});

// trigger flow by sending a SMS
controller.spawn().then(async bot => {
    await bot.startConversationWithUser(SEVEN_INBOUND_DE);

    await bot.say('I want to chat with you!');
}).catch(console.error);


// listen to incoming SMS and reply
controller.on('message', async (bot, message) => {
    console.log('onMessage', message.incoming_message);

    await bot.reply(message, 'I am all down for a conversation!');
});
