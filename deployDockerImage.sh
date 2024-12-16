PACKAGE_VERSION=$(cat ./packages/PieServer/package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[ ",]//g')

PUBLIC_IMAGE_PATH=jordanoleary/websocketpie-server

docker build . -f Dockerfile -t "$PUBLIC_IMAGE_PATH:latest" -t "$PUBLIC_IMAGE_PATH:$PACKAGE_VERSION"
docker push "$PUBLIC_IMAGE_PATH:$PACKAGE_VERSION"
docker push "$PUBLIC_IMAGE_PATH:latest"
