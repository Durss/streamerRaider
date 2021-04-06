
# Protopote Raider

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
Create a file twitch_keys.json on the projet's root folder and put this inside it with you twitch APP keys :
``` json
{
	"client_id":"xxx",
	"secret_id":"xxx",
	"privateApiKey":"xxx",//This one is not used for twitch but to secure /api/add_user endpoint
}
```
To get these keys, create a twitch app here :\
https://dev.twitch.tv/console/apps


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