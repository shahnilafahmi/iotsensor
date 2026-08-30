#!/bin/sh
set -e

PORT="${MQTT_PORT:-1883}"

sed "s/__MQTT_PORT__/${PORT}/g" /mosquitto/config/mosquitto.conf.template > /mosquitto/config/mosquitto.conf

echo "Starting Mosquitto on port ${PORT}"
exec mosquitto -c /mosquitto/config/mosquitto.conf
