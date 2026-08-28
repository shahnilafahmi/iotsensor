# Deploy this folder as its OWN Railway service (separate from the Node app):
#   Railway → New Service → Deploy from repo → set "Root Directory" to /mosquitto
# Railway detects this Dockerfile automatically and builds the real Mosquitto broker.
FROM eclipse-mosquitto:2

COPY mosquitto.conf /mosquitto/config/mosquitto.conf

EXPOSE 1883
