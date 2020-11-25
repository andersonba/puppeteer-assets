#!/bin/bash

if ! command -v json &> /dev/null
then
  echo 'command "json" not found'
  echo 'run to install: yarn add global json'
  exit 1
fi

REPO="andersonba/prometheus-assets"
VERSION=$(cat package.json |json version)

echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
docker build -f prometheus/Dockerfile -t $REPO .
docker tag $REPO "$REPO:$VERSION"
docker push $REPO
