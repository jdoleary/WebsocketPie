FROM node:10

WORKDIR /app

COPY package*.json /app/

RUN npm install

COPY . /app

EXPOSE 8080

ENTRYPOINT [ "npm", "start"]