
.PHONY: 

VERSION := $(shell node -p "require('../package.json').version")

build: Dockerfile
	@echo $(VERSION) > version.txt
	@docker build -t mxw-sdk-js-doc:$(VERSION) .
	@docker tag mxw-sdk-js-doc:$(VERSION) mxw-sdk-js-doc

release: build
	@docker tag mxw-sdk-js-doc:$(VERSION) $(REGISTRY_URL)mxw-sdk-js-doc:$(VERSION)
	@docker push $(REGISTRY_URL)mxw-sdk-js-doc:$(VERSION)

all: clean build
	@docker-compose up -d

clean:
	@docker-compose down
