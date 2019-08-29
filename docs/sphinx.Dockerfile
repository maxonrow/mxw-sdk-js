FROM python:3.7-alpine as builder
WORKDIR /docs/
RUN apk update && apk add make && pip install -U sphinx==1.8.5 && pip install sphinx_rtd_theme && mkdir -p /docs/
ADD ./*.rst /docs/
ADD ./*.py /docs/
ADD ./_static /docs/_static
