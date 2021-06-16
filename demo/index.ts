import {ok} from 'assert';
import {Botkit} from 'botkit';
import {Sms77Adapter} from '../src';

ok(process.env.SMS77_API_KEY); // an API key from Sms77.io
ok(process.env.SMS77_INBOUND_DE); // an GSM inbound number from Sms77.io
ok(process.env.SMS77_RECIPIENT);

const controller = new Botkit({
    adapter: new Sms77Adapter({
        api_key: process.env.SMS77_API_KEY,
        sms77_number: process.env.SMS77_INBOUND_DE,
    }),
});

// trigger flow by sending a SMS
controller.spawn().then(async bot => {
    await bot.startConversationWithUser(process.env.SMS77_INBOUND_DE);

    await bot.say('I want to chat with you!');
}).catch(console.error);


// listen to incoming SMS and reply
controller.on('message', async (bot, message) => {
    console.log('onMessage', message.incoming_message);

    await bot.reply(message, 'I am all down for a conversation!');
});
