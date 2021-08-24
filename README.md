
# Streamer Raider

Web app to list twitch buddies in order to find out who's streaming at anytime and allow to raid them easily.\
https://protopotes.durss.ninja

## Project setup
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
	"discordBot_token":"xxx",
	"privateApiKey":"xxx"
}
```
To get the `client_id` and `secret_id` keys, create a twitch app here :\
https://dev.twitch.tv/console/apps 

The `privateApiKey` is just a key to secure an API exposed by the application itself. You probably won't care about it.

The `discordBot_token` is a token to be defined if you want to control the app from discord.\
See [Create a discord bot](#create-a-discord-bot) 

## Create a discord bot
It is possible to add a bot to your discord that will control this app.\
This allows to add/remove users and add/remove their description.\
First, create an app there:\
https://discord.com/developers/applications/ \
Once the app is created, create a bot within the app.\
Get its `token` and set it as the `discordBot_token` value on the file `data/credentials.json`.\
\
To add the bot to your discord, find the `client ID` on oAuth section of the discord APP, update the following URL and open it on your browser:
https://discordapp.com/oauth2/authorize?scope=bot&client_id=CLIENT_ID
\
Once done, the administrator of the discord needs to send this command on the channel(s) that should be listened by the bot:
```
!raider-add
```
Then you should be good to go!.\
You can list all the available commands with this command `!raider-help`

## Project dev/build

### Compile front with hot-reloads for development
```
npm run front/serve
```

### Compile front for production
```
npm run front/build
```

### Compile server with hot-reloads for development
```
npm run server/watch
```

### Compile server for production
```
npm run server/build
```

### Shortcut for developpement
```
npm run dev
``` 
Starts front and server with hot reload.\
Node process has to be started manually. See [Starting services section](#starting-services).

### Compile server+front for production
```
npm run build
``` 


### Starting services
Execute this inside project folder's root
```
pm2 start bootstrap-pm2.json
```

To view process logs via PM2, execute :
```
pm2 logs --raw ProtopotesRaider
```

## Start on boot (DOESN'T work on windows)
First start the client as explained above.  
Then execute these commands:
```
pm2 save
pm2 startup
```
Now, the service should automatically start on boot 
