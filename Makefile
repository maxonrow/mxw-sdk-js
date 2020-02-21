
ROOT_PATH := $(shell pwd)
REGISTRY_URL := registry-intl.ap-southeast-3.aliyuncs.com/d_mxw/

.PHONY:
all: install release

version-major:
	@npm --force -s --prefix $(ROOT_PATH) version major > /dev/null

version-minor:
	@npm --force -s --prefix $(ROOT_PATH) version minor > /dev/null

version-patch:
	@npm --force -s --prefix $(ROOT_PATH) version patch > /dev/null

version-prerelease:
	@npm --force -s --prefix $(ROOT_PATH) version prerelease --preid=rc > /dev/null

version:
	@echo $(shell node -p "require('$(ROOT_PATH)/package.json').name"):$(shell node -p "require('$(ROOT_PATH)/package.json').version")

install:
	@npm install

setup-env:
	@cd tests; \
		./pull-env.sh; \
	cd ..;

build:
	@npm run build
	@REGISTRY_URL=$(REGISTRY_URL) make --no-print-directory -C $(ROOT_PATH)/docs build

release: version-patch
	@npm run build
	@REGISTRY_URL=$(REGISTRY_URL) make --no-print-directory -C $(ROOT_PATH)/docs release

publish:
	@npm publish

release-docs:
	@REGISTRY_URL=$(REGISTRY_URL) make --no-print-directory -C $(ROOT_PATH)/docs release
