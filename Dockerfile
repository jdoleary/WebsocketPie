FROM oven/bun 

WORKDIR /app

COPY ./packages/PieServer/package*.json /app/

RUN bun install

COPY ./packages/PieServer/ /app/

EXPOSE 8080

ENTRYPOINT [ "bun", "run", "./src/index.js"]