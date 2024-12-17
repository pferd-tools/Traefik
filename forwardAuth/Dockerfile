FROM node:latest
WORKDIR /usr/src/app
COPY forwardAuth/package*.json ./
RUN npm i
COPY ../generator/exports.js /usr/src/exports.js
CMD ["npm","run","start:dev"]
EXPOSE  3000