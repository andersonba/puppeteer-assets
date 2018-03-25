FROM alekzonder/puppeteer

ENV PORT 3000
ENV NODE_ENV production

WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install

RUN mkdir -p prometheus && chown -R pptruser:pptruser /app/prometheus

WORKDIR /app/prometheus
COPY package.json yarn.lock ./
RUN yarn install

WORKDIR /app
COPY . ./

WORKDIR /app/prometheus

EXPOSE 3000

CMD [ "yarn", "start" ]
