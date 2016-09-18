# -*- coding: utf-8 -*-
from django.shortcuts import render

# Create your views here.
DJPARAKEET_INDEX_TEMPLATE = 'djparakeet/index.html'

def index(request):
    return render(request, DJPARAKEET_INDEX_TEMPLATE, {})

