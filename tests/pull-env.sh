#!/bin/sh
if ! [ -d "./env" ]
then
    mkdir env
fi;

if ! [ -d "./env/mxw-sdk-js-secret" ]
then
    cd env
    # Dont follow me...
    git clone git@gitlab.com:mxw/mxw-sdk-js-secret.git
    cd ..
fi;
cp -f env/mxw-sdk-js-secret/env.ts env.ts
