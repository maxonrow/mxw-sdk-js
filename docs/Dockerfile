FROM python:3.7-alpine as builder
WORKDIR /docs/
RUN apk update && apk add make && pip install -U sphinx==1.8.5 && pip install sphinx_rtd_theme && mkdir -p /docs/
ADD ./version.txt /docs/
ADD ./*.rst /docs/
ADD ./*.py /docs/
ADD ./_static /docs/_static
ADD ./images /docs/images
RUN sphinx-build -M html "." "_build" -D version=$(cat version.txt)

FROM nginx:1.17.0-alpine
WORKDIR /usr/share/nginx/html/
COPY --from=builder /docs/_build/html /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
