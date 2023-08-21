FROM node:16-alpine

WORKDIR /app 

COPY .  /app

RUN apk add --no-cache git

RUN set -eux; \
      npm install ; \
      npm i -g pm2 ;  \
      npm run server/build ;\
      npm run front/build

EXPOSE 3012

CMD ["pm2-runtime", "start", "bootstrap-pm2.json"]
