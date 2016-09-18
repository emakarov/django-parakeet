#!/bin/bash
set -ex
sass --watch --scss --poll \
djparakeet/scss/:djparakeet/static/css/
