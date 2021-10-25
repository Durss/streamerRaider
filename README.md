
# Streamer Raider

Web app to list twitch buddies in order to find out who's streaming at anytime and allow to raid them easily.\
https://protopotes.durss.ninja

# Table of content
* [Project setup](#project-setup) 
* [Create a discord bot](#create-a-discord-bot) 
* [Project dev/build](#project-devbuild) 
  * [Start all for developpement](#start-all-for-developpement)
  * [Compile all for production](#compile-all-for-production)
* [Start on boot](#start-on-boot) 

# Project setup
```
npm install
```

Install PM2 globally (will run the script as a service) :
```
npm i -g pm2
```
Create a file `data/credentials.json` on the projet's root folder and put this inside it with you twitch APP keys :
``` json
{
	"client_id":"xxx",
	"secret_id":"xxx",
	"discordBot_token":"",
	"privateApiKey":"",
	"eventsub_secret":"",
	"eventsub_callback":""
}
```
To get the `client_id` and `secret_id` keys, create a twitch app here:\
https://dev.twitch.tv/console/apps
\
\
Configure an oauth redirect URI on the app so users can authenticate via Twitch from the page.\
The URL should be your domain name ending with `/oauth`, example:
```
http://locahost:8080/oauth
```

The `privateApiKey` is just a key to secure an API exposed by the application itself. You probably won't care about it.

The `discordBot_token` is a token to be defined if you want to control the app from discord.\
See [Create a discord bot](#create-a-discord-bot) 

The `eventsub_secret` and `eventsub_callback` should be specified if you want to get discord alerts when a user goes live.\
Leave these values blank if you don't need this feature.\
The `eventsub_secret` is a random string between 10 and 100 chars that'll be used to handshake with EventSub Twitch API. Write Anything you awant there.\
The `eventsub_callback` is the URI twitch will call when a user goes live. It will most probably be the domain name hosting the app.\
When testing locally you'll want to use HTTPS tuneling like [NGrok](https://ngrok.com) to get an HTTPS url that redirect queries to your localhost.

# Create a discord bot
It is possible to add a bot to your discord that will control this app.\
This allows to add/remove users and add/remove their description. It also comes with a bot that can send message to a chan everytime a user goes live on Twitch.\
\
First, create an app here:\
https://discord.com/developers/applications/ \
Once the app is created, create a bot within the app.\
Get its `token` and set it as the `discordBot_token` value on the file `data/credentials.json`.\
\
To add the bot to your discord, find the `client ID` on OAuth section of the discord APP, update the following URL and open it on your browser:
https://discordapp.com/oauth2/authorize?scope=bot&client_id=CLIENT_ID
\
\
Once done, the administrator of the discord needs to send this command on the channel(s) that should be listened by the bot:
```
!raider-add
```
Then you should be good to go!.\
You can list all the available commands with this command:
```
!raider-help
```

# Project dev/build

## Compile front with hot-reloads for development
```
npm run front/serve
```

## Compile front for production
```
npm run front/build
```

## Compile server with hot-reloads for development
```
npm run server/watch
```

## Compile server for production
```
npm run server/build
```

## Start all for developpement
```
npm run dev
``` 
Starts front and server with hot reload.\
Node process has to be started manually. See [Starting services section](#starting-services).

## Compile all for production
```
npm run build
``` 


## Starting services
Execute this inside project folder's root
```
pm2 start bootstrap-pm2.json
```

To view process logs via PM2, execute :
```
pm2 logs --raw ProtopotesRaider
```

# Start on boot
**DOESN'T work on windows**\
First start the client as explained above.  
Then execute these commands:
```
pm2 save
pm2 startup
```
Now, the service should automatically start on boot 
