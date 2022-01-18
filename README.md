<div align="center"><img src="https://raw.githubusercontent.com/Durss/streamerRaider/master/public/img/share_small.png" height="200"></div>

# Streamer Raider

Web app to list twitch buddies in order to find out who's streaming at anytime and allow to raid them easily.\
https://protopotes.durss.ninja

# Table of content
* [Project setup](#project-setup) 
* [Create a discord bot](#create-a-discord-bot) 
* [Adding users manually](#adding-users-manually) 
* [Project dev/build](#project-devbuild) 
  * [Start all for developpement](#start-all-for-developpement)
  * [Compile all for production](#compile-all-for-production)
* [Start on boot](#start-on-boot) 
* [Profiles](#profiles) 
  * [Enable profiles](#enable-profiles) 
  * [Logos](#logos) 
  * [User list](#user-list) 
<br>
<br>
<br>
<br>
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
The `eventsub_secret` is a random string between 10 and 100 chars that'll be used to handshake with EventSub Twitch API. Write Anything you want there.\
The `eventsub_callback` is the URI twitch will call when a user goes live. It will most probably be the domain name hosting the app.\
When testing locally you'll want to use HTTPS tuneling like [NGrok](https://ngrok.com) to get an HTTPS url that redirect queries to your localhost.
<br>
<br>
<br>
<br>

# Create a discord bot
It is possible to add a bot to your discord that will control this app.\
This allows to add/remove users and add/remove their description. It also comes with a bot that can send message to a chan everytime a user goes live on Twitch.\
\
First, create an app here:\
https://discord.com/developers/applications/ \
Once the app is created, create a bot within the app.\
Get its `token` and set it as the `discordBot_token` value on the file `data/credentials.json`.\
\
To add the bot to your discord, find the `client ID` on OAuth section of the discord APP, add it at the end of the following URL and open it on your browser:
```
https://discordapp.com/oauth2/authorize?scope=bot&client_id=
```
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
<br>
<br>
<br>
<br>

# Adding users manually
Users are meant to be added via Discord or the private API but you can add them manually if you wish.\
Users are stored on the file `data/userList.json` like this:
```
[
	{
		"name": "durss",
		"id": "29961813",
		"created_at": 1627046252101
	}
]
```
`name` is the Twitch login of the user\
`id` is the Twitch ID of the user\
`created_at` is the date the user was added to the list. This is used to mark the user as "new" on the frontend.
<br>
<br>
<br>
<br>

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
pm2 logs --raw StreamerRaider
```
<br>
<br>
<br>
<br>

# Start on boot
**DOESN'T work on windows**\
First start the client as explained above.  
Then execute these commands:
```
pm2 save
pm2 startup
```
Now, the service should automatically start on boot 
<br>
<br>
<br>
<br>

# Profiles
If you want your server to handle multiple networks of streamers, this feature is here for that.\
The frontend will be able to load different data depending on the current domain name.

## Enable profiles
This feature requires you to associate a domain name to a profile name via the file `data/dnsToProfile.json`.\
Example of content:
```json
[
	{
		"domains":["localhost"],
		"title":"Awesome streamers",
		"id": "awesome_streamers"
	},
	{
		"domains":["awesome.streamers.com","awesome.streamers.net","awesome.streamers.tv"],
		"title":"Awesome streamers",
		"id": "awesome_streamers",
		"nextProfile": "better_streamers"
	},
	{
		"domains":["better.streamers.com","better.streamers.net","better.streamers.tv"],
		"title":"Better streamers",
		"id": "better_streamers",
		"prevProfile": "awesome_streamers",
		"nextProfile": "lonely_streamers"
	},
	{
		"domains":["lonely.streamers.com"],
		"title":"Lonely streamers",
		"id": "lonely_streamers",
		"prevProfile": "better_streamers"
	}
]
```
One profile can have multiple domains *(to handle multiple TLDs)*\
If defined, the `title` will be used as the page's title.\
If you specify a `nextProfile` nor a `prevProfile` property with another profile's `id` as value, a navigation button will be displayed to switch from one profile to another.\
<br>
## Logos
If you use this system you can have different logos for each profile. Just add a PNG with the profile ID as name in `public/{PROFILE_ID}.png`.\
<br>
## User list
By default the app will store users in the file userList.json.
If you use the profile system, the file will be suffixed with the profile name, example : `userList_profileId.json`.
