#!/bin/bash

REPO="andersonba/prometheus-assets"
VERSION=$(cat package.json |json version)

docker login -u $DOCKER_USER -p $DOCKER_PASS
docker build -f prometheus/Dockerfile -t $REPO .
docker tag $REPO "$REPO:$VERSION"
docker push $REPO
