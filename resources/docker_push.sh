#!/bin/bash

REPO="andersonba/prometheus-assets"
VERSION=$(cat package.json |json version)

echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
docker build -f prometheus/Dockerfile -t $REPO .
docker tag $REPO "$REPO:$VERSION"
docker push $REPO
