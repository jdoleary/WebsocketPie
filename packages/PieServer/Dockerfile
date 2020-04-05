FROM node:10

WORKDIR /app

COPY ./packages/PieServer/package*.json /app/

RUN npm install

COPY ./packages/PieServer/ /app/

EXPOSE 8080

ENTRYPOINT [ "npm", "start"]