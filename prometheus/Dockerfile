FROM alekzonder/puppeteer

ENV PORT 3000
ENV NODE_ENV production
ENV CONFIG_PATH /app/config.yml

# Installing puppeteer-assets (parent directory)
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install

# Installing prometheus exporter (current directory)
RUN mkdir -p prometheus
WORKDIR /app/prometheus
COPY prometheus/package.json prometheus/yarn.lock ./
RUN yarn install

# Copy both files
WORKDIR /app
COPY . ./

# Initialization
WORKDIR /app/prometheus
EXPOSE 3000
CMD [ "yarn", "start" ]
