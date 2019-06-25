FROM alekzonder/puppeteer

ENV PORT 3000
ENV NODE_ENV production

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

RUN mkdir -p prometheus && chown -R pptruser:pptruser /app/prometheus

USER pptruser

WORKDIR /app/prometheus
COPY package.json package-lock.json ./
RUN npm install

WORKDIR /app
COPY . ./

WORKDIR /app/prometheus

EXPOSE 3000

CMD [ "npm", "start" ]
