FROM node:10

WORKDIR /usr/src/app/packages/PieServer

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8080

ENTRYPOINT [ "npm", "start"]