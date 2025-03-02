build:
	sudo docker build . -t gi

debug:
	sudo docker run --rm -it gi /bin/sh

run:
	sudo docker run --rm -it gi
