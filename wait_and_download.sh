#!/bin/bash
while true; do
  echo "Checking build status..."
  output=$(npx eas-cli build:list --limit 1 --json)
  status=$(echo "$output" | python3 -c "import sys, json; print(json.load(sys.stdin)[0].get('status'))" 2>/dev/null)
  
  if [ "$status" = "FINISHED" ]; then
    url=$(echo "$output" | python3 -c "import sys, json; print(json.load(sys.stdin)[0].get('artifacts', {}).get('buildUrl', ''))" 2>/dev/null)
    if [ -n "$url" ]; then
      echo "Build finished! Downloading to Desktop..."
      curl -L -o ~/Desktop/sewvee-customer-production.aab "$url"
      echo "Download complete!"
      break
    else
      echo "No buildUrl found in artifacts."
      break
    fi
  elif [ "$status" = "ERRORED" ]; then
    echo "Build errored!"
    break
  fi
  sleep 20
done
