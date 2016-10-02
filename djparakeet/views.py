# -*- coding: utf-8 -*-
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

# Create your views here.
DJPARAKEET_INDEX_TEMPLATE = 'djparakeet/index.html'

@login_required
def index(request):
    return render(request, DJPARAKEET_INDEX_TEMPLATE, {})

