#!/bin/bash
BUILD_ID="877a42ca-945f-4961-880e-93fb4a1b22f7"
echo "Waiting for build $BUILD_ID to complete..."
while true; do
  STATUS=$(eas build:list --limit 1 --json | grep -o '"status": "[^"]*"' | head -n 1 | cut -d '"' -f 4)
  if [ "$STATUS" == "FINISHED" ]; then
    echo "Build finished! Downloading..."
    eas build:download --build-id $BUILD_ID
    echo "Download complete!"
    break
  elif [ "$STATUS" == "ERRORED" ] || [ "$STATUS" == "CANCELED" ]; then
    echo "Build failed or canceled (status: $STATUS)."
    break
  fi
  sleep 30
done
