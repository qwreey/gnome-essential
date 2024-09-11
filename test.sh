#!/bin/bash

sudo docker compose -f docker-compose.dev.yml up &
DOCKERPID="$!"
while [ ! -e ./host/vncsocket ]; do
    sleep 0.1
done
sudo docker compose -f docker-compose.dev.yml exec gnome-docker journalctl -f &
vncviewer NoJPEG=1 CompressLevel=0 PreferredEncoding=Raw SecurityTypes=None ./host/vncsocket
kill -INT "$DOCKERPID"

exit 0
