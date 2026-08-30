# Deploy this folder as its OWN Railway service (separate from the Node app):
#   Railway → New Service → Deploy from repo → Settings → Source → Root Directory → mosquitto
# Railway detects this Dockerfile automatically and builds the real Mosquitto broker.
FROM eclipse-mosquitto:2

COPY mosquitto.conf.template /mosquitto/config/mosquitto.conf.template
COPY entrypoint.sh /entrypoint.sh

# Base image's entrypoint chown's/chmod's these dirs for the "mosquitto" user;
# we still need write access here at startup to render mosquitto.conf.
RUN chmod +x /entrypoint.sh

# Default; override with a Railway variable named MQTT_PORT if you want a
# different internal port (the TCP Proxy's target port must then match it).
ENV MQTT_PORT=1883
EXPOSE 1883

ENTRYPOINT ["/entrypoint.sh"]
