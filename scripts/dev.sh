#!/usr/bin/env bash
# Dev launcher: supervises port-forwards to the dadonew cluster and starts the api.
# Tunnels auto-restart on drop ("connection reset by peer", network blips, etc).

set -u

trap 'kill 0' INT TERM EXIT

forward() {
  local svc=$1 ns=$2 ports=$3
  while true; do
    kubectl --context dadonew -n "$ns" port-forward "svc/$svc" "$ports" 2>&1 \
      | sed "s/^/[$svc] /"
    echo "[$svc] tunnel dropped, restarting in 1s" >&2
    sleep 1
  done
}

forward mongo  infra 27018:27017 &
forward deluge apps  8112:8112   &

# Brief grace so the first connect attempts from the api land on a live tunnel.
sleep 2

node -r dotenv/config src/server
