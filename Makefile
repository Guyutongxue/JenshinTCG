build:
	docker build . -t gi

run:
	docke run --rm -it gi /bin/sh
	